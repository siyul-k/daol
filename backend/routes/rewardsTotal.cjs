// ✅ 파일 위치: backend/routes/rewardsTotal.cjs
const express = require('express');
const router = express.Router();
const connection = require('../db.cjs');

router.get('/:username', (req, res) => {
  const { username } = req.params;

  const sql = `
    SELECT IFNULL(SUM(amount), 0) AS total_reward
    FROM rewards_log
    WHERE user_id = ?
  `;

  connection.query(sql, [username], (err, rows) => {
    if (err) {
      console.error("❌ 수당 합산 오류:", err);
      return res.status(500).json({ error: 'DB 오류', details: err });
    }

    const total = rows && rows.length > 0 ? rows[0].total_reward || 0 : 0;
    res.json({ total_reward: total });
  });
});

module.exports = router;
