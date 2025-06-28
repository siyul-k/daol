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
        (SELECT COUNT(*) FROM centers WHERE center_owner_id IS NOT NULL) AS center_leader
    `);
    res.json({
      total: rows[0].total,
      today: rows[0].today,
      blacklist: rows[0].blacklist,
      center: rows[0].center_leader,
    });
  } catch (err) {
    console.error('❌ 관리자 통계 조회 실패:', err);
    res.status(500).json({ error: 'DB 조회 실패' });
  }
});

module.exports = router;
