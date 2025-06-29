const express = require('express');
const router = express.Router();
const pool = require('../db.cjs');

// POST /api/recommender-pv
router.post('/', async (req, res) => {
  // body: { recommenders: [ 'tt4', 'qq1', ... ] }
  const { recommenders = [] } = req.body;
  if (!Array.isArray(recommenders) || recommenders.length === 0)
    return res.json([]);

  try {
    const results = await Promise.all(
      recommenders.map(async (username) => {
        // 1. 추천인 id/이름 구하기
        const [[info]] = await pool.query(
          'SELECT id, username, name FROM members WHERE username = ?', [username]
        );
        if (!info) return { username, name: '', pv: 0 };

        // 2. 하위 트리 + 자기 포함 조회 (재귀 CTE)
        const [pvRows] = await pool.query(
          `
          WITH RECURSIVE tree AS (
            SELECT id FROM members WHERE id = ?
            UNION ALL
            SELECT m.id FROM members m JOIN tree t ON m.recommender_id = t.id
          )
          SELECT SUM(p.pv) AS total_pv
          FROM tree t
          JOIN purchases p ON t.id = p.member_id
          WHERE p.type = 'normal' AND p.status = 'approved'
          `, [info.id]
        );
        const pv = pvRows[0]?.total_pv || 0;
        return {
          username: info.username,
          name: info.name,
          pv
        };
      })
    );
    res.json(results);
  } catch (err) {
    console.error('❌ 추천인 PV 조회 오류:', err);
    res.status(500).json({ error: '추천인 PV 조회 실패' });
  }
});

module.exports = router;
