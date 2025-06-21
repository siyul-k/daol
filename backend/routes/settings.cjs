// ✅ 파일 경로: backend/routes/settings.cjs

const express = require('express');
const router = express.Router();
const connection = require('../db.cjs');

// 모든 설정 조회
router.get('/', async (req, res) => {
  try {
    const [rows] = await connection.promise().query(
      'SELECT key_name, value FROM settings'
    );
    res.json(rows);
  } catch (err) {
    console.error('❌ 설정 로드 실패:', err);
    res.status(500).json({ error: '설정 조회 실패' });
  }
});

module.exports = router;
