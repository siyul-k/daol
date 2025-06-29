// ✅ 파일 경로: backend/routes/depositTotal.cjs

const express = require('express');
const router = express.Router();
const pool = require('../db.cjs');

// 1. member_id 기준
router.get('/member/:member_id', async (req, res) => {
  const { member_id } = req.params;

  const sql = `
    SELECT IFNULL(SUM(amount), 0) AS total_deposit
    FROM deposit_requests
    WHERE member_id = ? AND status = '완료'
  `;

  try {
    const [rows] = await pool.query(sql, [member_id]);
    res.json({ total_deposit: rows[0].total_deposit });
  } catch (err) {
    console.error('❌ 총 입금액 조회 실패:', err);
    res.status(500).json({ error: '총 입금액 조회 오류' });
  }
});

// 2. username 기준 (명시적 엔드포인트, 기존코드)
router.get('/username/:username', async (req, res) => {
  const { username } = req.params;

  const sql = `
    SELECT IFNULL(SUM(amount), 0) AS total_deposit
    FROM deposit_requests
    WHERE username = ? AND status = '완료'
  `;

  try {
    const [rows] = await pool.query(sql, [username]);
    res.json({ total_deposit: rows[0].total_deposit });
  } catch (err) {
    console.error('❌ 총 입금액 조회 실패:', err);
    res.status(500).json({ error: '총 입금액 조회 오류' });
  }
});

// 3. 프론트엔드 호환: /api/deposit-total/:username (catch-all username 엔드포인트)
router.get('/:username', async (req, res) => {
  const { username } = req.params;

  const sql = `
    SELECT IFNULL(SUM(amount), 0) AS total_deposit
    FROM deposit_requests
    WHERE username = ? AND status = '완료'
  `;

  try {
    const [rows] = await pool.query(sql, [username]);
    res.json({ total_deposit: rows[0].total_deposit });
  } catch (err) {
    console.error('❌ 총 입금액 조회 실패:', err);
    res.status(500).json({ error: '총 입금액 조회 오류' });
  }
});

module.exports = router;
