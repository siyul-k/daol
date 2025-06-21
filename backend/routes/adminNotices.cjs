// ✅ 파일 위치: backend/routes/adminNotices.cjs
const express    = require('express');
const router     = express.Router();
const connection = require('../db.cjs');

// 1) 공지사항 목록 조회
router.get('/', (req, res) => {
  const sql = `
    SELECT
      id,
      title,
      content,
      created_at
    FROM notices
    ORDER BY created_at DESC
  `;
  connection.query(sql, (err, rows) => {
    if (err) {
      console.error('❌ 공지 목록 조회 실패:', err);
      return res.status(500).json({ error: 'DB 조회 실패' });
    }
    res.json(rows);
  });
});

// 2) 공지사항 등록
router.post('/', (req, res) => {
  const { title, content } = req.body;
  if (!title?.trim() || !content?.trim()) {
    return res.status(400).json({ error: '제목과 내용을 입력해주세요.' });
  }

  const sql = `
    INSERT INTO notices
      (title, content, created_at)
    VALUES
      (?, ?, NOW())
  `;
  connection.query(sql, [title.trim(), content.trim()], (err, result) => {
    if (err) {
      console.error('❌ 공지 등록 실패:', err);
      return res.status(500).json({ error: '공지 등록 실패' });
    }
    res.json({ success: true, id: result.insertId });
  });
});

// 3) 공지사항 수정
router.put('/:id', (req, res) => {
  const { title, content } = req.body;
  const sql = `
    UPDATE notices
    SET title   = ?,
        content = ?
    WHERE id = ?
  `;
  connection.query(sql, [title, content, req.params.id], (err, result) => {
    if (err) {
      console.error('❌ 공지 수정 실패:', err);
      return res.status(500).json({ error: '수정 실패' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: '공지 없음' });
    }
    res.json({ success: true });
  });
});

// 4) 공지사항 삭제
router.delete('/:id', (req, res) => {
  const sql = 'DELETE FROM notices WHERE id = ?';
  connection.query(sql, [req.params.id], (err, result) => {
    if (err) {
      console.error('❌ 공지 삭제 실패:', err);
      return res.status(500).json({ error: '삭제 실패' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: '공지 없음' });
    }
    res.json({ success: true });
  });
});

module.exports = router;
