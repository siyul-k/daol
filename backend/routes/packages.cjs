// ✅ 파일 위치: backend/routes/packages.cjs

const express = require('express');
const router = express.Router();
const pool = require('../db.cjs');

// ✅ 패키지 목록 조회
router.get('/', async (req, res) => {
  const sql = `SELECT id, name, price, pv, type FROM packages ORDER BY price ASC`;
  try {
    const [results] = await pool.query(sql);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: '패키지 조회 실패' });
  }
});

module.exports = router;
