// ✅ 파일 위치: backend/routes/adminWithdraws.cjs
const express = require('express');
const router = express.Router();
const pool = require('../db.cjs');
const ExcelJS = require('exceljs');

// 설정값 가져오기 함수
const getSetting = async (key) => {
  const [rows] = await pool.query(
    'SELECT value FROM settings WHERE key_name = ? LIMIT 1',
    [key]
  );
  return rows[0]?.value || null;
};

// 출금 목록 조회 (무한스크롤 + 필터 + limit)
router.get('/', async (req, res) => {
  const {
    username, name, status, startDate, endDate, cursor,
    limit = 20 // default 20, 프론트에서 전달받은 값 사용
  } = req.query;

  const conditions = [];
  const values = [];

  if (username) {
    conditions.push('w.username LIKE ?');
    values.push(`%${username}%`);
  }
  if (name) {
    conditions.push('m.name LIKE ?');
    values.push(`%${name}%`);
  }
  if (status) {
    conditions.push('w.status = ?');
    values.push(status);
  }
  if (startDate && endDate) {
    conditions.push('DATE(w.created_at) BETWEEN ? AND ?');
    values.push(startDate, endDate);
  }
  if (cursor) {
    conditions.push('w.created_at < ?');
    values.push(cursor);
  }

  const whereClause = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

  // limit은 항상 양의 정수로 안전하게 처리
  let itemLimit = parseInt(limit, 10);
  if (isNaN(itemLimit) || itemLimit <= 0) itemLimit = 20;
  if (itemLimit > 10000) itemLimit = 10000;

  const sql = `
    SELECT w.*, m.name,
           CONVERT_TZ(w.created_at, '+00:00', '+09:00') AS created_at
    FROM withdraw_requests w
    LEFT JOIN members m ON w.username = m.username
    ${whereClause}
    ORDER BY w.created_at DESC
    LIMIT ?
  `;
  values.push(itemLimit);

  try {
    const [rows] = await pool.query(sql, values);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: '출금 목록 조회 실패' });
  }
});

// 출금 완료 처리 (쇼핑포인트 적립 + 로그)
router.post('/complete', async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ message: 'ID 배열이 필요합니다.' });

  try {
    const feePercent = parseFloat(await getSetting('withdraw_fee_percent') || '0');
    const shopPercent = parseFloat(await getSetting('withdraw_shopping_point_percent') || '0');

    for (const id of ids) {
      const [[row]] = await pool.query('SELECT * FROM withdraw_requests WHERE id = ?', [id]);
      if (!row || row.status !== '요청') continue;

      // member_id 없는 경우 자동 채우기 (username → member_id)
      let member_id = row.member_id;
      if (!member_id && row.username) {
        const [[userRow]] = await pool.query('SELECT id FROM members WHERE username = ?', [row.username]);
        member_id = userRow?.id || null;
        if (member_id) {
          await pool.query('UPDATE withdraw_requests SET member_id = ? WHERE id = ?', [member_id, id]);
        }
      }

      const afterFee = Math.floor(row.amount * (1 - feePercent / 100));
      const payout = Math.floor(afterFee * (1 - shopPercent / 100));
      const shoppingPoint = afterFee - payout;
      const feeAmount = row.amount - afterFee;

      await pool.query(
        'UPDATE withdraw_requests SET status = ?, fee = ?, payout = ?, shopping_point = ? WHERE id = ?',
        ['완료', feeAmount, payout, shoppingPoint, id]
      );

      if (member_id && shoppingPoint > 0) {
        await pool.query(
          'UPDATE members SET shopping_point = shopping_point + ? WHERE id = ?',
          [shoppingPoint, member_id]
        );
        await pool.query(
          `INSERT INTO shopping_point_log 
            (member_id, amount, type, description, source, source_id, created_at)
           VALUES (?, ?, '적립', '출금완료 쇼핑포인트 적립', 'withdraw', ?, NOW())`,
          [member_id, shoppingPoint, row.id]
        );
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error('❌ 출금 완료 처리 오류:', err);
    res.status(500).json({ message: '출금 완료 실패' });
  }
});

// 출금 취소 처리 (포인트 복구)
router.post('/cancel', async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ message: 'ID 배열이 필요합니다.' });

  try {
    for (const id of ids) {
      const [[row]] = await pool.query('SELECT * FROM withdraw_requests WHERE id = ?', [id]);
      if (!row || row.status !== '요청') continue;

      await pool.query('UPDATE withdraw_requests SET status = ? WHERE id = ?', ['취소', id]);

      let member_id = row.member_id;
      if (!member_id && row.username) {
        const [[userRow]] = await pool.query('SELECT id FROM members WHERE username = ?', [row.username]);
        member_id = userRow?.id || null;
        if (member_id) {
          await pool.query('UPDATE withdraw_requests SET member_id = ? WHERE id = ?', [member_id, id]);
        }
      }

      if (member_id) {
        await pool.query(
          'UPDATE members SET withdrawable_point = withdrawable_point + ? WHERE id = ?',
          [row.amount, member_id]
        );
      }
    }
    res.json({ success: true });
  } catch (err) {
    console.error('❌ 출금 취소 오류:', err);
    res.status(500).json({ message: '출금 취소 실패' });
  }
});

// 출금 삭제 처리 (포인트 복구 + 쇼핑포인트 회수 + 로그)
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [[row]] = await pool.query('SELECT * FROM withdraw_requests WHERE id = ?', [id]);
    if (!row) return res.json({ success: true });

    let member_id = row.member_id;
    if (!member_id && row.username) {
      const [[userRow]] = await pool.query('SELECT id FROM members WHERE username = ?', [row.username]);
      member_id = userRow?.id || null;
      if (member_id) {
        await pool.query('UPDATE withdraw_requests SET member_id = ? WHERE id = ?', [member_id, id]);
      }
    }

    if (member_id) {
      if (row.status === '요청') {
        await pool.query(
          'UPDATE members SET withdrawable_point = withdrawable_point + ? WHERE id = ?',
          [row.amount, member_id]
        );
      }

      if (row.status === '완료' && row.shopping_point > 0) {
        await pool.query(
          'UPDATE members SET shopping_point = shopping_point - ? WHERE id = ?',
          [row.shopping_point, member_id]
        );
        await pool.query(
          `INSERT INTO shopping_point_log 
            (member_id, amount, type, description, source, source_id, created_at)
           VALUES (?, ?, '회수', '출금삭제 쇼핑포인트 회수', 'withdraw', ?, NOW())`,
          [member_id, row.shopping_point, row.id]
        );
      }
    }

    await pool.query('DELETE FROM withdraw_requests WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('❌ 출금 삭제 실패:', err);
    res.status(500).json({ message: '출금 삭제 실패' });
  }
});

// 출금 비고 수정
router.post('/update-memo', async (req, res) => {
  const { id, memo } = req.body;
  if (!id) return res.status(400).json({ message: 'ID가 필요합니다.' });

  try {
    await pool.query('UPDATE withdraw_requests SET memo = ? WHERE id = ?', [memo, id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: '메모 저장 실패' });
  }
});

// 출금 통계 (신청금액 기준)
router.get('/stats', async (req, res) => {
  const { username, name, status, startDate, endDate } = req.query;
  const conditions = [];
  const values = [];

  if (username) {
    conditions.push('w.username LIKE ?');
    values.push(`%${username}%`);
  }
  if (name) {
    conditions.push('m.name LIKE ?');
    values.push(`%${name}%`);
  }
  if (status) {
    conditions.push('w.status = ?');
    values.push(status);
  }
  if (startDate && endDate) {
    conditions.push('DATE(w.created_at) BETWEEN ? AND ?');
    values.push(startDate, endDate);
  }

  const whereClause = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

  const sql = `
    SELECT
      IFNULL(SUM(CASE WHEN w.status = '완료' THEN w.amount ELSE 0 END), 0) AS total,
      IFNULL(SUM(CASE WHEN w.status = '완료' AND DATE(w.created_at) = CURDATE() THEN w.amount ELSE 0 END), 0) AS today,
      IFNULL(SUM(CASE WHEN w.status = '완료' AND MONTH(w.created_at) = MONTH(CURDATE()) THEN w.amount ELSE 0 END), 0) AS thisMonth,
      IFNULL(SUM(CASE WHEN w.status = '완료' AND MONTH(w.created_at) = MONTH(CURDATE() - INTERVAL 1 MONTH) THEN w.amount ELSE 0 END), 0) AS lastMonth
    FROM withdraw_requests w
    LEFT JOIN members m ON w.username = m.username
    ${whereClause}
  `;

  try {
    const [rows] = await pool.query(sql, values);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: '출금 통계 조회 실패' });
  }
});

// 엑셀 다운로드
router.get('/export', async (req, res) => {
  const sql = `
    SELECT w.*, m.name,
           CONVERT_TZ(w.created_at, '+00:00', '+09:00') AS created_at
    FROM withdraw_requests w
    LEFT JOIN members m ON w.username = m.username
    ORDER BY w.created_at DESC
  `;

  try {
    const [rows] = await pool.query(sql);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('출금내역');
    sheet.columns = [
      { header: '아이디', key: 'username' },
      { header: '이름', key: 'name' },
      { header: '종류', key: 'type' },
      { header: '상태', key: 'status' },
      { header: '신청금액', key: 'amount' },
      { header: '수수료', key: 'fee' },
      { header: '출금액', key: 'payout' },
      { header: '쇼핑포인트', key: 'shopping_point' },
      { header: '은행', key: 'bank_name' },
      { header: '예금주', key: 'account_holder' },
      { header: '계좌번호', key: 'account_number' },
      { header: '비고', key: 'memo' },
      { header: '등록일', key: 'created_at' }
    ];

    rows.forEach((row) => sheet.addRow(row));

    res.setHeader('Content-Disposition', `attachment; filename=withdraws_${Date.now()}.xlsx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ message: '엑셀 생성 실패' });
  }
});

module.exports = router;
