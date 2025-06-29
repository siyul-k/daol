// ✅ 파일 위치: backend/routes/notices.cjs

const express = require('express');
const router = express.Router();
const pool = require('../db.cjs');

// 1) 공지 리스트 조회 (GET /api/notices)
router.get('/', async (req, res) => {
  const sql = 'SELECT id, title, content, created_at FROM notices ORDER BY created_at DESC';
  try {
    const [results] = await pool.query(sql);
    res.json(results);
  } catch (err) {
    console.error('공지 리스트 조회 오류:', err);
    res.status(500).json({ error: '공지 목록을 불러오는 중 오류가 발생했습니다.' });
  }
});

// 2) 공지 작성 (POST /api/notices)
router.post('/', async (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: '제목과 내용을 모두 입력해주세요.' });
  }
  const sql = 'INSERT INTO notices (title, content) VALUES (?, ?)';
  try {
    const [result] = await pool.query(sql, [title, content]);
    res.status(201).json({
      id: result.insertId,
      title,
      content,
      created_at: new Date()
    });
  } catch (err) {
    console.error('공지 작성 오류:', err);
    res.status(500).json({ error: '공지 작성 중 오류가 발생했습니다.' });
  }
});

// 3) 공지 삭제 (DELETE /api/notices/:id)
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM notices WHERE id = ?';
  try {
    const [result] = await pool.query(sql, [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: '해당 공지를 찾을 수 없습니다.' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('공지 삭제 오류:', err);
    res.status(500).json({ error: '공지 삭제 중 오류가 발생했습니다.' });
  }
});

module.exports = router;
