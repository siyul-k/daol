const express = require('express');
const router = express.Router();
const pool = require('../db.cjs');  // connection → pool
const bcrypt = require('bcrypt');

// ✅ 관리자 목록 조회 (PK, username, name만 반환)
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, username, name FROM members WHERE is_admin = 1'
    );
    res.json(rows);
  } catch (err) {
    console.error('관리자 조회 오류:', err);
    res.status(500).json({ error: 'DB 오류' });
  }
});

// ✅ 관리자 추가
router.post('/', async (req, res) => {
  const { username, name, password } = req.body;
  if (!username || !name || !password) {
    return res.status(400).json({ error: '필수 항목 누락' });
  }

  try {
    // 아이디 중복 체크
    const [exist] = await pool.query(
      'SELECT id FROM members WHERE username = ?',
      [username]
    );
    if (exist.length > 0) {
      return res.status(409).json({ error: '이미 존재하는 아이디입니다' });
    }

    // 비밀번호 해시
    const hashed = await bcrypt.hash(password, 10);

    // DB에 관리자 추가
    await pool.query(
      'INSERT INTO members (username, name, password, is_admin) VALUES (?, ?, ?, 1)',
      [username, name, hashed]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('관리자 추가 오류:', err);
    res.status(500).json({ error: 'DB 오류' });
  }
});

// ✅ 관리자 삭제 (숫자 PK 기준)
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(
      'DELETE FROM members WHERE id = ? AND is_admin = 1',
      [id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('관리자 삭제 오류:', err);
    res.status(500).json({ error: 'DB 오류' });
  }
});

module.exports = router;
