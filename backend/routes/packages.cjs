const express = require('express');
const router = express.Router();
const connection = require('../db.cjs');

// ✅ 패키지 목록 조회
router.get('/', (req, res) => {
  const sql = `SELECT id, name, price, pv, type FROM packages ORDER BY price ASC`;
  connection.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: '패키지 조회 실패' });
    res.json(results);
  });
});

module.exports = router;
