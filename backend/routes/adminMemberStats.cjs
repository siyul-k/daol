// ✅ 파일 위치: backend/routes/adminMemberStats.cjs
const express = require('express');
const router = express.Router();
const connection = require('../db.cjs');

router.get('/', async (req, res) => {
  try {
    const [rows] = await connection.promise().query(`
      SELECT
        (SELECT COUNT(*) FROM members WHERE is_admin = 0) AS total,
        (SELECT COUNT(*) FROM members WHERE is_admin = 0 AND DATE(created_at) = CURDATE()) AS today,
        (SELECT COUNT(*) FROM members WHERE is_admin = 0 AND is_blacklisted = 1) AS blacklist,
        (SELECT COUNT(*) FROM members WHERE is_admin = 0 AND center_owner IS NOT NULL AND center_owner != '') AS center
    `);
    res.json(rows[0]);
  } catch (err) {
    console.error('❌ 관리자 통계 조회 실패:', err);
    res.status(500).json({ error: 'DB 조회 실패' });
  }
});

module.exports = router;
