// ✅ 파일 위치: backend/routes/members.cjs

const express = require('express');
const router = express.Router();
const pool = require('../db.cjs');
const bcrypt = require('bcrypt');

// 1. username 기반 회원정보 조회 (GET /api/members/username/:username)
router.get('/username/:username', async (req, res) => {
  const { username } = req.params;
  try {
    const [rows] = await pool.query(`
      SELECT m.id, m.username, m.name, m.phone, m.email,
             m.center_id,
             (SELECT center_name FROM centers WHERE id = m.center_id LIMIT 1) AS center,
             m.recommender_id,
             (SELECT username FROM members WHERE id = m.recommender_id LIMIT 1) AS recommender,
             m.bank_name, m.account_number, m.account_holder
      FROM members m
      WHERE m.username = ?
      LIMIT 1
    `, [username]);
    if (!rows.length) return res.status(404).json({ message: "회원 없음" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: "DB 오류" });
  }
});

// 2. by-username (은행계좌/이름 등 요약)
router.get('/by-username/:username', async (req, res) => {
  const { username } = req.params;
  try {
    const [rows] = await pool.query(`
      SELECT m.username, m.name, m.bank_name, m.account_holder, m.account_number
      FROM members m
      WHERE m.username = ?
      LIMIT 1
    `, [username]);
    if (!rows.length) return res.status(404).json({ message: "해당 회원 없음" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: "DB 오류" });
  }
});

// 3. rank 조회 (GET /api/members/rank/:id)
router.get('/rank/:id', async (req, res) => {
  const { id } = req.params;
  const isId = /^\d+$/.test(id);
  try {
    const [rows] = await pool.query(
      isId ? 'SELECT `rank` FROM members WHERE id = ?' : 'SELECT `rank` FROM members WHERE username = ?',
      [id]
    );
    if (!rows.length) return res.status(404).json({ message: "회원 없음" });
    res.json({ rank: rows[0].rank });
  } catch (err) {
    res.status(500).json({ message: "DB 오류" });
  }
});

// 4. 회원 정보 조회 (GET /api/members/:id) - 숫자만 허용
router.get('/:id', async (req, res, next) => {
  const { id } = req.params;
  if (!/^\d+$/.test(id)) return next();
  try {
    const [rows] = await pool.query(`
      SELECT m.id, m.username, m.name, m.phone, m.email,
             m.center_id,
             c.center_name AS center,
             m.recommender_id,
             (SELECT username FROM members WHERE id = m.recommender_id LIMIT 1) AS recommender,
             m.bank_name, m.account_number, m.account_holder
      FROM members m
      LEFT JOIN centers c ON m.center_id = c.id
      WHERE m.id = ?
      LIMIT 1
    `, [id]);
    if (!rows.length) return res.status(404).json({ message: "회원을 찾을 수 없음" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: "DB 오류" });
  }
});

// 5. 회원 정보 수정 (PUT /api/members/:id) - 숫자만 허용
router.put('/:id', async (req, res, next) => {
  const { id } = req.params;
  if (!/^\d+$/.test(id)) return next();
  const {
    phone, email, bank_name, account_number, account_holder
  } = req.body;
  try {
    await pool.query(
      `UPDATE members SET phone = ?, email = ?, bank_name = ?, account_number = ?, account_holder = ? WHERE id = ?`,
      [phone, email, bank_name, account_number, account_holder, id]
    );
    res.json({ message: "회원 정보 업데이트 성공" });
  } catch (err) {
    res.status(500).json({ message: "DB 오류" });
  }
});

// 6. 비밀번호 변경 (PATCH /api/members/:id/password) - 숫자만 허용
router.patch('/:id/password', async (req, res, next) => {
  const { id } = req.params;
  if (!/^\d+$/.test(id)) return next();
  const { currentPassword, newPassword } = req.body;

  try {
    const [rows] = await pool.query('SELECT password FROM members WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ success: false, message: '회원 없음' });

    const valid = await bcrypt.compare(currentPassword, rows[0].password);
    if (!valid) return res.status(401).json({ success: false, message: '현재 비밀번호가 틀립니다.' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE members SET password = ? WHERE id = ?', [hashed, id]);
    res.json({ success: true, message: '비밀번호가 변경되었습니다.' });
  } catch (err) {
    res.status(500).json({ success: false, message: '비밀번호 변경 실패' });
  }
});

module.exports = router;
