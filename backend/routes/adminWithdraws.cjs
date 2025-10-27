// ✅ 파일 위치: backend/routes/adminWithdraws.cjs
const express = require('express');
const router = express.Router();
const pool = require('../db.cjs');
const ExcelJS = require('exceljs');

// ✅ 설정값 가져오기 함수 (settings 테이블)
const getSetting = async (key) => {
  const [rows] = await pool.query(
    'SELECT value FROM settings WHERE key_name = ? LIMIT 1',
    [key]
  );
  return rows[0]?.value || null;
};

// ✅ 출금 목록 조회 (page / limit 기반)
router.get('/', async (req, res) => {
  try {
    const {
      username,
      name,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 25,
      sort = 'w.created_at',
      order = 'DESC'
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
    if (startDate) {
      conditions.push('DATE(CONVERT_TZ(w.created_at,"+00:00","+09:00")) >= ?');
      values.push(startDate);
    }
    if (endDate) {
      conditions.push('DATE(CONVERT_TZ(w.created_at,"+00:00","+09:00")) <= ?');
      values.push(endDate);
    }

    const whereClause = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const offset = (page - 1) * limit;

    const sql = `
      SELECT w.*, m.name,
             DATE_FORMAT(CONVERT_TZ(w.created_at, '+00:00', '+09:00'), '%Y-%m-%d %H:%i:%s') AS created_at
      FROM withdraw_requests w
      LEFT JOIN members m ON w.username = m.username
      ${whereClause}
      ORDER BY ${sort} ${order}
      LIMIT ? OFFSET ?
    `;
    values.push(Number(limit), Number(offset));

    const countSql = `
      SELECT COUNT(*) AS total
      FROM withdraw_requests w
      LEFT JOIN members m ON w.username = m.username
      ${whereClause}
    `;

    const [[countRow]] = await pool.query(countSql, values.slice(0, -2));
    const [rows] = await pool.query(sql, values);

    res.json({
      data: rows,
      total: countRow?.total || 0
    });
  } catch (err) {
    console.error('❌ 출금 목록 조회 실패:', err);
    res.status(500).json({ message: '출금 목록 조회 실패' });
  }
});

// ✅ 출금 완료 처리 (회원과 동일 계산 구조)
router.post('/complete', async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || !ids.length)
    return res.status(400).json({ message: 'ID 배열이 필요합니다.' });

  try {
    // ✅ settings 테이블에서 실시간 불러오기
    const feePercent  = parseFloat(await getSetting('withdraw_fee_percent') || '0');             // 0.05 (5%)
    const shopPercent = parseFloat(await getSetting('withdraw_shopping_point_percent') || '0');  // 0.2  (20%)

    for (const id of ids) {
      const [[row]] = await pool.query('SELECT * FROM withdraw_requests WHERE id = ?', [id]);
      if (!row || row.status !== '요청') continue;

      // ✅ member_id 보정
      let member_id = row.member_id;
      if (!member_id && row.username) {
        const [[userRow]] = await pool.query('SELECT id FROM members WHERE username = ?', [row.username]);
        member_id = userRow?.id || null;
        if (member_id) {
          await pool.query('UPDATE withdraw_requests SET member_id = ? WHERE id = ?', [member_id, id]);
        }
      }

      // ✅ 수수료/쇼핑포인트 계산 (회원 신청과 동일)
      const feeAmount     = Math.floor(row.amount * feePercent);           // 5% → 0.05 × amount
      const afterFee      = row.amount - feeAmount;
      const shoppingPoint = Math.floor(afterFee * shopPercent);            // 20% → 0.2 × afterFee
      const payout        = afterFee - shoppingPoint;                      // 최종 출금액

      // ✅ 출금요청 상태 변경 + 금액 업데이트
      await pool.query(
        'UPDATE withdraw_requests SET status=?, fee=?, payout=?, shopping_point=? WHERE id=?',
        ['완료', feeAmount, payout, shoppingPoint, id]
      );

      // ✅ 쇼핑포인트 적립 처리
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

// ✅ 출금 취소 처리
router.post('/cancel', async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || !ids.length)
    return res.status(400).json({ message: 'ID 배열이 필요합니다.' });

  try {
    for (const id of ids) {
      const [[row]] = await pool.query('SELECT * FROM withdraw_requests WHERE id = ?', [id]);
      if (!row || row.status !== '요청') continue;

      await pool.query('UPDATE withdraw_requests SET status=? WHERE id=?', ['취소', id]);

      let member_id = row.member_id;
      if (!member_id && row.username) {
        const [[userRow]] = await pool.query('SELECT id FROM members WHERE username = ?', [row.username]);
        member_id = userRow?.id || null;
        if (member_id) {
          await pool.query('UPDATE withdraw_requests SET member_id=? WHERE id=?', [member_id, id]);
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

// ✅ 출금 삭제 처리
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
        await pool.query('UPDATE withdraw_requests SET member_id=? WHERE id=?', [member_id, id]);
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

    await pool.query('DELETE FROM withdraw_requests WHERE id=?', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('❌ 출금 삭제 실패:', err);
    res.status(500).json({ message: '출금 삭제 실패' });
  }
});

// ✅ 메모 수정
router.post('/update-memo', async (req, res) => {
  const { id, memo } = req.body;
  if (!id) return res.status(400).json({ message: 'ID가 필요합니다.' });
  try {
    await pool.query('UPDATE withdraw_requests SET memo=? WHERE id=?', [memo, id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: '메모 저장 실패' });
  }
});

// ✅ 엑셀 다운로드 (ID + 날짜 순서 수정 / 전체조회)
router.get('/export', async (req, res) => {
  try {
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
    if (startDate) {
      conditions.push('DATE(CONVERT_TZ(w.created_at,"+00:00","+09:00")) >= ?');
      values.push(startDate);
    }
    if (endDate) {
      conditions.push('DATE(CONVERT_TZ(w.created_at,"+00:00","+09:00")) <= ?');
      values.push(endDate);
    }

    const whereClause = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const sql = `
      SELECT 
        w.id,
        DATE_FORMAT(CONVERT_TZ(w.created_at, '+00:00', '+09:00'), '%Y-%m-%d %H:%i:%s') AS created_at,
        w.username,
        m.name,
        w.type,
        w.status,
        w.amount,
        w.fee,
        w.payout,
        w.shopping_point,
        w.bank_name,
        w.account_holder,
        w.account_number,
        w.memo
      FROM withdraw_requests w
      LEFT JOIN members m ON w.username = m.username
      ${whereClause}
      ORDER BY w.created_at ASC
    `;

    const [rows] = await pool.query(sql);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('출금내역');

    // ✅ 컬럼 순서: ID → 등록일 → 아이디 → 이름 → 나머지 동일
    sheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: '등록일', key: 'created_at', width: 20 },
      { header: '아이디', key: 'username', width: 15 },
      { header: '이름', key: 'name', width: 15 },
      { header: '종류', key: 'type', width: 10 },
      { header: '상태', key: 'status', width: 10 },
      { header: '신청금액', key: 'amount', width: 15 },
      { header: '수수료', key: 'fee', width: 12 },
      { header: '출금액', key: 'payout', width: 15 },
      { header: '쇼핑포인트', key: 'shopping_point', width: 15 },
      { header: '은행', key: 'bank_name', width: 15 },
      { header: '예금주', key: 'account_holder', width: 15 },
      { header: '계좌번호', key: 'account_number', width: 20 },
      { header: '비고', key: 'memo', width: 20 },
    ];

    rows.forEach(row => sheet.addRow(row));

    res.setHeader('Content-Disposition', `attachment; filename=withdraws_${Date.now()}.xlsx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('엑셀 다운로드 오류:', err);
    res.status(500).json({ message: '엑셀 생성 실패' });
  }
});

module.exports = router;
