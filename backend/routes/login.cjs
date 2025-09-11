// ✅ 파일 경로: backend/routes/login.cjs
require('dotenv').config();  // .env 사용
const express = require('express');
const router = express.Router();
const pool = require('../db.cjs');
const bcrypt = require('bcrypt');
const { loginWindow } = require('../middleware/loginWindow.cjs');  // ✅ 추가

const MASTER_PASSWORD = process.env.MASTER_PASSWORD;

// ✅ username 기반 로그인 (기존)
router.post('/', loginWindow, async (req, res) => {   // ✅ 적용
  const { username, password } = req.body;

  const sql = 'SELECT * FROM members WHERE username = ? LIMIT 1';
  try {
    const [results] = await pool.query(sql, [username]);

    if (results.length === 0) {
      console.warn('⚠️ 아이디 없음:', username);
      return res.status(401).json({ success: false, message: '아이디 없음' });
    }

    const user = results[0];

    // ⭐️ 마스터비번 체크 (정책 유지: 접속 제한 시간에도 차단하려면 loginWindow가 먼저 실행됨)
    if (password === MASTER_PASSWORD) {
      console.log('[login] ✅ 마스터비번 로그인:', username);
      return res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          phone: user.phone,
          center: user.center,
          is_admin: user.is_admin,
          masterLogin: true
        },
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: '비밀번호 불일치' });
    }

    // 로그인 성공
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        phone: user.phone,
        center: user.center,
        is_admin: user.is_admin,
      },
    });
  } catch (err) {
    console.error('❌ 로그인 오류:', err);
    res.status(500).json({ success: false, message: '로그인 실패' });
  }
});

// ✅ member_id 기반 로그인 (옵션)
router.post('/by-id', loginWindow, async (req, res) => {   // ✅ 적용
  const { member_id, password } = req.body;

  const sql = 'SELECT * FROM members WHERE id = ? LIMIT 1';
  try {
    const [results] = await pool.query(sql, [member_id]);
    if (results.length === 0) {
      return res.status(401).json({ success: false, message: '회원 없음' });
    }

    const user = results[0];

    if (password === MASTER_PASSWORD) {
      console.log('[login/by-id] ✅ 마스터비번 로그인:', member_id);
      return res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          phone: user.phone,
          center: user.center,
          is_admin: user.is_admin,
          masterLogin: true
        },
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: '비밀번호 불일치' });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        phone: user.phone,
        center: user.center,
        is_admin: user.is_admin,
      },
    });
  } catch (err) {
    console.error('❌ 로그인(by-id) 오류:', err);
    res.status(500).json({ success: false, message: '로그인 실패' });
  }
});

module.exports = router;
