// ✅ 수정된 최종 버전

const express = require('express');
const router = express.Router();
const connection = require('../db.cjs');

// ✅ 1. 입금 신청
router.post('/', (req, res) => {
  const { username, amount, account_holder, memo } = req.body;

  const sql = `
    INSERT INTO deposit_requests (username, amount, account_holder, memo, status)
    VALUES (?, ?, ?, ?, '요청')
  `;
  connection.query(sql, [username, amount, account_holder, memo], (err) => {
    if (err) {
      console.error('❌ 입금신청 실패:', err);
      return res.status(500).json({ message: '입금신청 실패' });
    }
    res.json({ success: true });
  });
});

// ✅ 2. 회원 입금내역 전체 조회 (상태 구분 없이)
router.get('/:username', (req, res) => {
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
