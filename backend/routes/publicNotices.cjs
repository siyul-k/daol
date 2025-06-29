// ✅ 파일 경로: backend/routes/publicNotices.cjs

const express = require('express');
const router = express.Router();
const pool = require('../db.cjs');

// 공지사항 전체 조회 (회원용)
router.get('/', async (req, res) => {
  const sql = `
    SELECT id, title, content, created_at
    FROM notices
    ORDER BY created_at DESC
  `;
  try {
    const [results] = await pool.query(sql);
    res.json(results);
  } catch (err) {
    console.error('❌ 공지사항 조회 실패:', err);
    res.status(500).json({ message: 'DB 오류' });
  }
});

module.exports = router;
