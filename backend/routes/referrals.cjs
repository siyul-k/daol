// ✅ 파일 위치: backend/routes/referrals.cjs
const express = require('express');
const router = express.Router();
const connection = require('../db.cjs');

router.get('/:username', (req, res) => {
  const { username } = req.params;
  const sql = `
    SELECT
      (SELECT GROUP_CONCAT(username) FROM members WHERE recommender = ?) AS recommenders,
      (SELECT GROUP_CONCAT(username) FROM members WHERE sponsor = ?) AS sponsors
  `;
  connection.query(sql, [username, username], (err, rows) => {
    if (err) return res.status(500).json({ error: 'DB 오류', details: err });
    const result = rows[0];
    res.json({
      recommenders: result.recommenders ? result.recommenders.split(',') : [],
      sponsors: result.sponsors ? result.sponsors.split(',') : [],
    });
  });
});

module.exports = router;
