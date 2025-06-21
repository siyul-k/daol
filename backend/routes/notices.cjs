// backend/routes/notices.cjs
const express = require('express');
const router = express.Router();
const connection = require('../db.cjs'); // 기존 DB 연결 모듈

// 1) 공지 리스트 조회 (GET /api/notices)
router.get('/', (req, res) => {
  const sql = 'SELECT id, title, content, created_at FROM notices ORDER BY created_at DESC';
  connection.query(sql, (err, results) => {
    if (err) {
      console.error('공지 리스트 조회 오류:', err);
      return res.status(500).json({ error: '공지 목록을 불러오는 중 오류가 발생했습니다.' });
    }
    res.json(results);
  });
});

// 2) 공지 작성 (POST /api/notices)
router.post('/', (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: '제목과 내용을 모두 입력해주세요.' });
  }
  const sql = 'INSERT INTO notices (title, content) VALUES (?, ?)';
  connection.query(sql, [title, content], (err, result) => {
    if (err) {
      console.error('공지 작성 오류:', err);
      return res.status(500).json({ error: '공지 작성 중 오류가 발생했습니다.' });
    }
    res.status(201).json({ id: result.insertId, title, content, created_at: new Date() });
  });
});

// 3) 공지 삭제 (DELETE /api/notices/:id)
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM notices WHERE id = ?';
  connection.query(sql, [id], (err, result) => {
    if (err) {
      console.error('공지 삭제 오류:', err);
      return res.status(500).json({ error: '공지 삭제 중 오류가 발생했습니다.' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: '해당 공지를 찾을 수 없습니다.' });
    }
    res.json({ success: true });
  });
});

module.exports = router;
