// ✅ 파일 경로: backend/routes/admin-login.cjs

const express = require('express');
const router = express.Router();
const connection = require('../db.cjs');
const bcrypt = require('bcrypt');

router.post('/', (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '').trim();

  console.log('[admin-login] req.body =', { username, password });

  const sql = 'SELECT * FROM members WHERE username = ? AND is_admin = TRUE LIMIT 1';
  connection.query(sql, [username], async (err, results) => {
    if (err) return res.status(500).json({ message: 'DB 오류' });
    if (results.length === 0) return res.status(401).json({ message: '권한 없음 또는 아이디 없음' });

    const admin = results[0];

    console.log('[admin-login] stored hash =', admin.password);

    try {
      const isMatch = await bcrypt.compare(password, admin.password);

      if (!isMatch) {
        console.log('[admin-login] ❌ 비밀번호 불일치 for', username);
        return res.status(401).json({ message: '비밀번호 불일치' });
      }

      console.log('[admin-login] ✅ 로그인 성공:', username);
      res.json({
        success: true,
        admin: {
          id: admin.id,
          username: admin.username,
          name: admin.name,
        },
      });
    } catch (compareError) {
      console.error('[admin-login] bcrypt 오류:', compareError);
      res.status(500).json({ message: '비밀번호 비교 오류' });
    }
  });
});

module.exports = router;
