// ✅ 파일 경로: backend/routes/members.cjs

const express = require('express');
const router = express.Router();
const connection = require('../db.cjs');
const bcrypt = require('bcrypt');

// ✅ 1. 회원 정보 조회 (GET /api/members/:id)
router.get('/:id', (req, res) => {
  const { id } = req.params;

  const sql = `
    SELECT id, username, name, phone, email, center, recommender, sponsor,
           bank_name, account_number, account_holder
    FROM members WHERE id = ?
  `;

  connection.query(sql, [id], (err, results) => {
    if (err) {
      console.error("❌ 회원 정보 조회 실패:", err);
      return res.status(500).json({ message: "DB 오류" });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: "회원을 찾을 수 없음" });
    }

    res.json(results[0]);
  });
});


// ✅ 2. 회원 정보 수정 (PUT /api/members/:id)
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const {
    phone, email, bank_name, account_number, account_holder
  } = req.body;

  const sql = `
    UPDATE members
    SET phone = ?, email = ?, bank_name = ?, account_number = ?, account_holder = ?
    WHERE id = ?
  `;

  const values = [phone, email, bank_name, account_number, account_holder, id];

  connection.query(sql, values, (err, result) => {
    if (err) {
      console.error("❌ 회원 정보 업데이트 실패:", err);
      return res.status(500).json({ message: "DB 오류" });
    }

    res.json({ message: "회원 정보 업데이트 성공" });
  });
});


// ✅ 3. 비밀번호 변경 (PATCH /api/members/:id/password)
router.patch('/:id/password', async (req, res) => {
  const { id } = req.params;
  const { currentPassword, newPassword } = req.body;

  const sql = 'SELECT password FROM members WHERE id = ?';
  connection.query(sql, [id], async (err, results) => {
    if (err) return res.status(500).json({ success: false, message: 'DB 오류' });
    if (results.length === 0) return res.status(404).json({ success: false, message: '회원 없음' });

    const valid = await bcrypt.compare(currentPassword, results[0].password);
    if (!valid) return res.status(401).json({ success: false, message: '현재 비밀번호가 틀립니다.' });

    const hashed = await bcrypt.hash(newPassword, 10);
    connection.query('UPDATE members SET password = ? WHERE id = ?', [hashed, id], (err2) => {
      if (err2) return res.status(500).json({ success: false, message: '비밀번호 변경 실패' });
      res.json({ success: true, message: '비밀번호가 변경되었습니다.' });
    });
  });
});

// ✅ 4. username 기반 회원정보 조회 (GET /api/members/username/:username)
router.get('/username/:username', (req, res) => {
  const { username } = req.params;

  const sql = `
    SELECT id, username, name, phone, email, center, recommender, sponsor,
           bank_name, account_number, account_holder
    FROM members WHERE username = ?
  `;

  connection.query(sql, [username], (err, results) => {
    if (err) {
      console.error("❌ username으로 회원 조회 실패:", err);
      return res.status(500).json({ message: "DB 오류" });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: "회원 없음" });
    }

    res.json(results[0]);
  });
});

// ✅ /api/members/by-username/:username
router.get('/by-username/:username', (req, res) => {
  const { username } = req.params;
  const sql = `
    SELECT username, name, bank_name, account_holder, account_number
    FROM members
    WHERE username = ?
  `;
  connection.query(sql, [username], (err, results) => {
    if (err) {
      console.error("❌ 사용자 조회 실패:", err);
      return res.status(500).json({ message: "DB 오류" });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: "해당 회원 없음" });
    }
    res.json(results[0]);
  });
});

// ✅ 직급(rank) 조회 (GET /api/members/rank/:username)
router.get('/rank/:username', (req, res) => {
  const { username } = req.params;

  const sql = `SELECT \`rank\` FROM members WHERE username = ?`;

  connection.query(sql, [username], (err, results) => {
    if (err) {
      console.error("❌ rank 조회 실패:", err);
      return res.status(500).json({ message: "DB 오류" });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: "회원 없음" });
    }

    res.json({ rank: results[0].rank });
  });
});


module.exports = router;
