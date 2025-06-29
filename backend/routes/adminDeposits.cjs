// ✅ 파일 경로: backend/routes/adminDeposits.cjs
const express = require('express');
const router = express.Router();
const pool = require('../db.cjs');
const ExcelJS = require('exceljs');

// 1. 입금 통계 조회
router.get('/stats', async (req, res) => {
  const sql = `
    SELECT
      COUNT(*) AS totalCount,
      SUM(CASE WHEN DATE(CONVERT_TZ(created_at, '+00:00', '+09:00')) = CURDATE() THEN 1 ELSE 0 END) AS todayCount
    FROM deposit_requests
  `;
  try {
    const [rows] = await pool.query(sql);
    res.json({ total: rows[0].totalCount, today: rows[0].todayCount });
  } catch (err) {
    res.status(500).json({ message: '통계 조회 실패' });
  }
});

// 2. 입금 목록 조회 (시간 KST 변환 포함)
router.get('/', async (req, res) => {
  const { username, status, date } = req.query;
  const cond = [], params = [];

  if (username) { cond.push('m.username = ?'); params.push(username); }
  if (status) { cond.push('d.status = ?'); params.push(status); }
  if (date) { cond.push('DATE(CONVERT_TZ(d.created_at, "+00:00", "+09:00")) = ?'); params.push(date); }

  const where = cond.length ? 'WHERE ' + cond.join(' AND ') : '';
  const sql = `
    SELECT d.id, 
           CONVERT_TZ(d.created_at, '+00:00', '+09:00') AS created_at,
           m.username, m.name,
           d.status, d.account_holder, d.amount, d.memo,
           CONVERT_TZ(d.completed_at, '+00:00', '+09:00') AS completed_at
    FROM deposit_requests d
    LEFT JOIN members m ON d.member_id = m.id
    ${where}
    ORDER BY d.created_at DESC
  `;

  try {
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: '입금 내역 조회 실패' });
  }
});

// 3. 입금 완료 처리 + 포인트 지급
router.post('/complete', async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || !ids.length) {
    return res.status(400).json({ message: '잘못된 요청 형식' });
  }

  const placeholders = ids.map(() => '?').join(',');

  const updateSql = `
    UPDATE deposit_requests
    SET status = '완료', completed_at = UTC_TIMESTAMP()
    WHERE id IN (${placeholders}) AND status = '요청'
  `;

  try {
    const [result] = await pool.query(updateSql, ids);

    const logSql = `
      INSERT INTO point_logs (before_point, after_point, diff, reason)
      SELECT 
        m.point_balance, m.point_balance + d.amount,
        d.amount, '입금 완료로 포인트 지급'
      FROM deposit_requests d
      JOIN members m ON d.member_id = m.id
      WHERE d.id = ?
    `;

    const updateBalanceSql = `
      UPDATE members m
      JOIN deposit_requests d ON m.id = d.member_id
      SET m.point_balance = m.point_balance + d.amount
      WHERE d.id = ? AND d.status = '완료'
    `;

    for (const id of ids) {
      await pool.query(logSql, [id]);
      await pool.query(updateBalanceSql, [id]);
    }

    res.json({ success: true, updatedRows: result.affectedRows });
  } catch (e) {
    console.error('❌ 포인트 반영 실패:', e);
    res.status(500).json({ message: '포인트 반영 오류' });
  }
});

// 4. 입금 요청 삭제 + 포인트 복구 (포인트 부족 시 차단)
router.delete('/:id', async (req, res) => {
  const depositId = req.params.id;
  try {
    const [[row]] = await pool.query(
      `SELECT member_id, amount, status FROM deposit_requests WHERE id = ?`, [depositId]
    );

    if (!row) return res.status(404).json({ message: '존재하지 않는 요청' });

    const { member_id, amount, status } = row;

    const [[user]] = await pool.query(
      `SELECT username, point_balance FROM members WHERE id = ?`, [member_id]
    );
    if (!user) return res.status(404).json({ message: '회원 정보 없음' });

    if (status === '완료') {
      if (user.point_balance < amount) {
        return res.status(400).json({ message: '포인트 부족으로 삭제 불가' });
      }
      await pool.query(
        `DELETE FROM point_logs WHERE username = ? AND diff = ? AND reason LIKE '입금%'`,
        [user.username, amount]
      );
      await pool.query(
        `UPDATE members SET point_balance = point_balance - ? WHERE id = ?`,
        [amount, member_id]
      );
    }

    await pool.query(
      `DELETE FROM deposit_requests WHERE id = ?`, [depositId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('❌ 입금 삭제 오류:', err);
    res.status(500).json({ message: '삭제 실패' });
  }
});

// 5. 엑셀 다운로드 (시간도 KST로 변환)
router.get('/export', async (req, res) => {
  const sql = `
    SELECT d.id, m.username, m.name, d.status,
           d.account_holder, d.amount,
           CONVERT_TZ(d.created_at, '+00:00', '+09:00') AS created_at,
           CONVERT_TZ(d.completed_at, '+00:00', '+09:00') AS completed_at,
           d.memo
    FROM deposit_requests d
    LEFT JOIN members m ON d.member_id = m.id
    ORDER BY d.created_at DESC
  `;

  try {
    const [rows] = await pool.query(sql);
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('입금내역');
    ws.columns = [
      { header: '번호', key: 'id', width: 8 },
      { header: '아이디', key: 'username', width: 15 },
      { header: '이름', key: 'name', width: 15 },
      { header: '상태', key: 'status', width: 10 },
      { header: '입금자명', key: 'account_holder', width: 15 },
      { header: '금액', key: 'amount', width: 12 },
      { header: '등록일', key: 'created_at', width: 20 },
      { header: '완료일', key: 'completed_at', width: 20 },
      { header: '비고', key: 'memo', width: 20 },
    ];
    rows.forEach(row => ws.addRow(row));
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=deposits_${Date.now()}.xlsx`
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('❌ 엑셀 생성 오류:', err);
    res.status(500).json({ message: '엑셀 생성 실패' });
  }
});

module.exports = router;
