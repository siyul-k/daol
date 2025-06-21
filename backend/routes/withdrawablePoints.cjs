// ✅ 파일 경로: backend/routes/withdrawablePoints.cjs

const express = require('express');
const router = express.Router();
const connection = require('../db.cjs');
const getMemberId = require('../utils/getMemberId.cjs');

router.get('/:username', async (req, res) => {
  const { username } = req.params;

  try {
    const member_id = await getMemberId(username);

    const rewardSql = 'SELECT IFNULL(SUM(amount), 0) AS total_reward FROM rewards_log WHERE user_id = ?';
    const withdrawSql = 'SELECT IFNULL(SUM(amount), 0) AS total_withdraw FROM withdraw_requests WHERE username = ?';

    connection.query(rewardSql, [member_id], (err1, rewardRows) => {
      if (err1) return res.status(500).json({ error: '수당 조회 실패', details: err1 });

      connection.query(withdrawSql, [username], (err2, withdrawRows) => {
        if (err2) return res.status(500).json({ error: '출금 조회 실패', details: err2 });

        const totalReward = rewardRows[0].total_reward || 0;
        const totalWithdraw = withdrawRows[0].total_withdraw || 0;
        const withdrawable = totalReward - totalWithdraw;

        res.json({ withdrawable });
      });
    });
  } catch (err) {
    return res.status(500).json({ error: '회원 확인 실패', details: err.message });
  }
});

module.exports = router;
