// ✅ 파일 위치: backend/routes/adminNotices.cjs
const express    = require('express');
const router     = express.Router();
const pool       = require('../db.cjs');

// 1) 공지사항 목록 조회
router.get('/', async (req, res) => {
  const sql = `
    SELECT
      id,
      title,
      content,
      created_at
    FROM notices
    ORDER BY created_at DESC
  `;
  try {
    const [rows] = await pool.query(sql);
    res.json(rows);
  } catch (err) {
    console.error('❌ 공지 목록 조회 실패:', err);
    res.status(500).json({ error: 'DB 조회 실패' });
  }
});

// 2) 공지사항 등록
router.post('/', async (req, res) => {
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
  try {
    const [result] = await pool.query(sql, [title.trim(), content.trim()]);
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    console.error('❌ 공지 등록 실패:', err);
    res.status(500).json({ error: '공지 등록 실패' });
  }
});

// 3) 공지사항 수정
router.put('/:id', async (req, res) => {
  const { title, content } = req.body;
  const sql = `
    UPDATE notices
    SET title   = ?,
        content = ?
    WHERE id = ?
  `;
  try {
    const [result] = await pool.query(sql, [title, content, req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: '공지 없음' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('❌ 공지 수정 실패:', err);
    res.status(500).json({ error: '수정 실패' });
  }
});

// 4) 공지사항 삭제
router.delete('/:id', async (req, res) => {
  const sql = 'DELETE FROM notices WHERE id = ?';
  try {
    const [result] = await pool.query(sql, [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: '공지 없음' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('❌ 공지 삭제 실패:', err);
    res.status(500).json({ error: '삭제 실패' });
  }
});

module.exports = router;
