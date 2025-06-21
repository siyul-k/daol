// ✅ 파일 경로: backend/routes/publicNotices.cjs
const express = require('express');
const router = express.Router();
const connection = require('../db.cjs');

// 공지사항 전체 조회 (회원용)
router.get('/', (req, res) => {
  const sql = `
    SELECT id, title, content, created_at
    FROM notices
    ORDER BY created_at DESC
  `;

  connection.query(sql, (err, results) => {
    if (err) {
      console.error('❌ 공지사항 조회 실패:', err);
      return res.status(500).json({ message: 'DB 오류' });
    }
    res.json(results);
  });
});

module.exports = router;
