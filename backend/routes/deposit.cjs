// ✅ 파일 위치: backend/routes/deposit.cjs

const express = require('express');
const router = express.Router();
const pool = require('../db.cjs');

// ✅ 1. 입금 신청 (member_id 저장)
router.post('/', async (req, res) => {
  const { username, amount, account_holder, memo } = req.body;

  try {
    // username으로 member_id 조회
    const [rows] = await pool.query(
      `SELECT id FROM members WHERE username = ? LIMIT 1`, [username]
    );
    if (!rows.length) {
      return res.status(400).json({ message: '존재하지 않는 회원' });
    }
    const member_id = rows[0].id;
    await pool.query(
      `
      INSERT INTO deposit_requests (username, member_id, amount, account_holder, memo, status)
      VALUES (?, ?, ?, ?, ?, '요청')
      `,
      [username, member_id, amount, account_holder, memo]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('❌ 입금신청 실패:', err);
    res.status(500).json({ message: '입금신청 실패' });
  }
});

// ✅ 2. 회원 입금내역 전체 조회 (member_id로 조회)
router.get('/member/:member_id', async (req, res) => {
  const { member_id } = req.params;

  try {
    const [results] = await pool.query(
      `
      SELECT *
      FROM deposit_requests
      WHERE member_id = ?
      ORDER BY created_at DESC
      `,
      [member_id]
    );
    res.json(results);
  } catch (err) {
    console.error('❌ 입금내역 조회 실패:', err);
    res.status(500).json({ message: '입금내역 조회 실패' });
  }
});

// ✅ 3. (호환) username으로 입금내역 전체 조회
router.get('/username/:username', async (req, res) => {
  const { username } = req.params;

  try {
    const [results] = await pool.query(
      `
      SELECT *
      FROM deposit_requests
      WHERE username = ?
      ORDER BY created_at DESC
      `,
      [username]
    );
    res.json(results);
  } catch (err) {
    console.error('❌ 입금내역 조회 실패:', err);
    res.status(500).json({ message: '입금내역 조회 실패' });
  }
});

module.exports = router;
