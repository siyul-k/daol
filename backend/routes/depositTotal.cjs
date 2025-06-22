// ✅ 파일 경로: backend/routes/depositTotal.cjs

const express = require('express');
const router = express.Router();
const connection = require('../db.cjs');

router.get('/:username', async (req, res) => {
  const { username } = req.params;

  const sql = `
    SELECT IFNULL(SUM(amount), 0) AS total_deposit
    FROM deposit_requests
    WHERE username = ? AND status = '완료'
  `;

  try {
    const [rows] = await connection.promise().query(sql, [username]);
    res.json({ total_deposit: rows[0].total_deposit });
  } catch (err) {
    console.error('❌ 총 입금액 조회 실패:', err);
    res.status(500).json({ error: '총 입금액 조회 오류' });
  }
});

module.exports = router;
