// ✅ 파일 경로: backend/routes/withdrawStats.cjs

const express = require('express');
const router = express.Router();
const connection = require('../db.cjs');

router.get('/:username', async (req, res) => {
  const { username } = req.params;

  try {
    const [rows] = await connection.promise().query(
      `SELECT IFNULL(SUM(amount), 0) AS total_withdraw
       FROM withdraw_requests
       WHERE username = ? AND status IN ('요청', '완료')`,
      [username]
    );

    const total = rows[0]?.total_withdraw || 0;
    res.json({ total_withdraw: total });
  } catch (err) {
    console.error('❌ 총 출금액 조회 오류:', err);
    res.status(500).json({ error: '총 출금액 계산 실패' });
  }
});

module.exports = router;
