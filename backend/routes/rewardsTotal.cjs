// ✅ 파일 위치: backend/routes/rewardsTotal.cjs
const express = require('express');
const router = express.Router();
const connection = require('../db.cjs');

router.get('/:username', (req, res) => {
  const { username } = req.params;

  // username → member_id 변환
  connection.query(
    'SELECT id FROM members WHERE username = ? LIMIT 1',
    [username],
    (err, rows) => {
      if (err || !rows.length) {
        return res.status(404).json({ error: '회원 없음' });
      }
      const member_id = rows[0].id;

      const sql = `
        SELECT IFNULL(SUM(amount), 0) AS total_reward
        FROM rewards_log
        WHERE member_id = ?
      `;

      connection.query(sql, [member_id], (err2, rows2) => {
        if (err2) {
          console.error("❌ 수당 합산 오류:", err2);
          return res.status(500).json({ error: 'DB 오류', details: err2 });
        }

        const total = rows2 && rows2.length > 0 ? rows2[0].total_reward || 0 : 0;
        res.json({ total_reward: total });
      });
    }
  );
});

module.exports = router;
