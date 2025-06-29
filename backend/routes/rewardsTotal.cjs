// ✅ 파일 위치: backend/routes/rewardsTotal.cjs
const express = require('express');
const router = express.Router();
const pool = require('../db.cjs');

// ✅ username 기준 → 총 수당 합산 API
router.get('/:username', async (req, res) => {
  const { username } = req.params;

  try {
    // 1. username → member_id 변환
    const [[member]] = await pool.query(
      'SELECT id FROM members WHERE username = ? LIMIT 1',
      [username]
    );
    if (!member) return res.status(404).json({ error: '회원 없음' });

    // 2. 총 수당 합산
    const [rows] = await pool.query(
      `SELECT IFNULL(SUM(amount), 0) AS total_reward
       FROM rewards_log
       WHERE member_id = ?`,
      [member.id]
    );

    const total = rows[0]?.total_reward || 0;
    res.json({ total_reward: total });
  } catch (err) {
    console.error('❌ 수당 합산 오류:', err);
    res.status(500).json({ error: 'DB 오류', details: err });
  }
});

module.exports = router;
