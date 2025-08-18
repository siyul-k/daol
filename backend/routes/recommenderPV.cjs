// ✅ 파일 경로: backend/routes/recommenderPV.cjs
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
          'SELECT id, username, name FROM members WHERE username = ?', 
          [username]
        );
        if (!info) return { username, name: '', pv: 0 };

        // 2. 본인 PV만 합산
        const [pvRows] = await pool.query(
          `
          SELECT IFNULL(SUM(p.pv),0) AS total_pv
          FROM purchases p
          WHERE p.member_id = ?
            AND p.type = 'normal'
            AND p.status = 'approved'
          `,
          [info.id]
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
