// ✅ 파일 위치: backend/routes/deposit.cjs

const express = require('express');
const router = express.Router();
const connection = require('../db.cjs');

// ✅ 1. 입금 신청 (member_id 저장)
router.post('/', (req, res) => {
  const { username, amount, account_holder, memo } = req.body;

  // username으로 member_id 조회
  const userSql = `SELECT id FROM members WHERE username = ? LIMIT 1`;
  connection.query(userSql, [username], (err, rows) => {
    if (err) {
      console.error('❌ 회원조회 실패:', err);
      return res.status(500).json({ message: '회원 조회 실패' });
    }
    if (!rows.length) {
      return res.status(400).json({ message: '존재하지 않는 회원' });
    }

    const member_id = rows[0].id;
    const sql = `
      INSERT INTO deposit_requests (username, member_id, amount, account_holder, memo, status)
      VALUES (?, ?, ?, ?, ?, '요청')
    `;
    connection.query(sql, [username, member_id, amount, account_holder, memo], (err2) => {
      if (err2) {
        console.error('❌ 입금신청 실패:', err2);
        return res.status(500).json({ message: '입금신청 실패' });
      }
      res.json({ success: true });
    });
  });
});

// ✅ 2. 회원 입금내역 전체 조회 (member_id로 조회)
router.get('/member/:member_id', (req, res) => {
  const { member_id } = req.params;

  const sql = `
    SELECT *
    FROM deposit_requests
    WHERE member_id = ?
    ORDER BY created_at DESC
  `;
  connection.query(sql, [member_id], (err, results) => {
    if (err) {
      console.error('❌ 입금내역 조회 실패:', err);
      return res.status(500).json({ message: '입금내역 조회 실패' });
    }
    res.json(results);
  });
});

// ✅ 3. (호환) username으로 입금내역 전체 조회
router.get('/username/:username', (req, res) => {
  const { username } = req.params;
  const sql = `
    SELECT *
    FROM deposit_requests
    WHERE username = ?
    ORDER BY created_at DESC
  `;
  connection.query(sql, [username], (err, results) => {
    if (err) {
      console.error('❌ 입금내역 조회 실패:', err);
      return res.status(500).json({ message: '입금내역 조회 실패' });
    }
    res.json(results);
  });
});

module.exports = router;
