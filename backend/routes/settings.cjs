// ✅ 파일 경로: backend/routes/settings.cjs

const express = require('express');
const router = express.Router();
const pool = require('../db.cjs');

// 모든 설정 조회 (GET /api/settings)
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT key_name, value FROM settings'
    );
    res.json(rows);
  } catch (err) {
    console.error('❌ 설정 로드 실패:', err);
    res.status(500).json({ error: '설정 조회 실패' });
  }
});

module.exports = router;
