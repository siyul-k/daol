// ✅ 파일 위치: backend/routes/deposit.cjs
const express = require('express');
const router = express.Router();
const pool = require('../db.cjs');

router.post('/', async (req, res) => {
  let { username, amount, account_holder, memo } = req.body;
  const amountInt = parseInt(amount, 10);

  if (!username || !amountInt || !account_holder) {
    return res.status(400).json({ message: '필수 항목 누락' });
  }

  try {
    const [rows] = await pool.query(
      `SELECT id FROM members WHERE username = ? LIMIT 1`, [username]
    );
    if (!rows.length) return res.status(400).json({ message: '존재하지 않는 회원' });
    const member_id = rows[0].id;

    // 최근 동일 금액 요청 중복 방지
    const [[dup]] = await pool.query(
      `SELECT id FROM deposit_requests 
       WHERE member_id=? AND amount=? AND status='요청' 
       AND created_at >= NOW() - INTERVAL 10 MINUTE LIMIT 1`,
      [member_id, amountInt]
    );
    if (dup) {
      return res.status(429).json({ message: '이미 동일한 입금 요청이 진행 중입니다.' });
    }

    await pool.query(
      `INSERT INTO deposit_requests 
        (username, member_id, amount, account_holder, memo, status)
       VALUES (?, ?, ?, ?, ?, '요청')`,
      [username, member_id, amountInt, account_holder, memo || '']
    );
    res.json({ success: true });
  } catch (err) {
    console.error('❌ 입금신청 실패:', err);
    res.status(500).json({ message: '입금신청 실패' });
  }
});

router.get('/member/:member_id', async (req, res) => {
  try {
    const [results] = await pool.query(
      `SELECT * FROM deposit_requests WHERE member_id = ? ORDER BY created_at DESC`,
      [req.params.member_id]
    );
    res.json(results);
  } catch (err) {
    console.error('❌ 입금내역 조회 실패:', err);
    res.status(500).json({ message: '입금내역 조회 실패' });
  }
});

router.get('/username/:username', async (req, res) => {
  try {
    const [results] = await pool.query(
      `SELECT * FROM deposit_requests WHERE username = ? ORDER BY created_at DESC`,
      [req.params.username]
    );
    res.json(results);
  } catch (err) {
    console.error('❌ 입금내역 조회 실패:', err);
    res.status(500).json({ message: '입금내역 조회 실패' });
  }
});

module.exports = router;
