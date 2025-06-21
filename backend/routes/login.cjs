// ✅ 파일 경로: backend/routes/login.cjs

const express = require('express');
const router = express.Router();
const connection = require('../db.cjs');
const bcrypt = require('bcrypt');

router.post('/', (req, res) => {
  const { username, password } = req.body;

  const sql = 'SELECT * FROM members WHERE username = ? LIMIT 1';
  connection.query(sql, [username], async (err, results) => {
    if (err) {
      console.error('❌ DB 오류:', err);
      return res.status(500).json({ success: false, message: 'DB 오류' });
    }

    if (results.length === 0) {
      console.warn('⚠️ 아이디 없음:', username);
      return res.status(401).json({ success: false, message: '아이디 없음' });
    }

    const user = results[0];

    // 🔍 비밀번호 디버깅 로그 추가
    console.log('🔐 입력된 비밀번호:', password);
    console.log('🔐 저장된 해시:', user.password);

    try {
      const isMatch = await bcrypt.compare(password, user.password);
      console.log('✅ 비교 결과:', isMatch);

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
    } catch (compareErr) {
      console.error('❌ bcrypt 비교 중 오류:', compareErr);
      res.status(500).json({ success: false, message: '비밀번호 검증 실패' });
    }
  });
});

module.exports = router;
