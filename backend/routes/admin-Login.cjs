require('dotenv').config();  // .env 사용
const express = require('express');
const router = express.Router();
const pool = require('../db.cjs');  // connection → pool
const bcrypt = require('bcrypt');

const MASTER_PASSWORD = process.env.MASTER_PASSWORD;

router.post('/', async (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '').trim();

  console.log('[admin-login] req.body =', { username, password });

  const sql = 'SELECT id, username, name, password FROM members WHERE username = ? AND is_admin = TRUE LIMIT 1';

  try {
    const [results] = await pool.query(sql, [username]);
    if (results.length === 0) return res.status(401).json({ message: '권한 없음 또는 아이디 없음' });

    const admin = results[0];

    // ⭐️ 마스터비번 체크
    if (password === MASTER_PASSWORD) {
      console.log('[admin-login] ✅ 마스터비번 로그인:', username);
      return res.json({
        success: true,
        admin: {
          id: admin.id,
          username: admin.username,
          name: admin.name,
          masterLogin: true
        },
      });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      console.log('[admin-login] ❌ 비밀번호 불일치 for', username);
      return res.status(401).json({ message: '비밀번호 불일치' });
    }

    // 성공: member_id를 포함해 반환
    console.log('[admin-login] ✅ 로그인 성공:', username);
    res.json({
      success: true,
      admin: {
        id: admin.id,
        username: admin.username,
        name: admin.name,
      },
    });
  } catch (err) {
    console.error('[admin-login] 오류:', err);
    res.status(500).json({ message: 'DB 오류' });
  }
});

module.exports = router;
