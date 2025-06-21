// ✅ 파일 위치: backend/routes/check-user.cjs
const express = require('express');
const router = express.Router();
const connection = require('../db.cjs');

router.get('/', (req, res) => {
  const { username } = req.query;

  if (!username) {
    return res.status(400).json({ success: false, message: 'No username' });
  }

  const sql = `SELECT name FROM members WHERE username = ? LIMIT 1`;
  connection.query(sql, [username], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: 'DB error' });

    if (results.length === 0) {
      return res.json({ success: false, message: 'Not found' });
    }

    res.json({ success: true, name: results[0].name });
  });
});

module.exports = router;
