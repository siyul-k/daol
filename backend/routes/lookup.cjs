// ✅ 파일 위치: backend/routes/lookup.cjs
const express = require('express');
const router = express.Router();
const connection = require('../db.cjs');

// ✅ 센터장 이름 조회
router.get('/center', (req, res) => {
  const { center } = req.query;
  const sql = 'SELECT name FROM members WHERE center = ? LIMIT 1';

  connection.query(sql, [center], (err, results) => {
    if (err) return res.status(500).json({ message: 'DB 오류' });
    if (results.length === 0) return res.status(404).json({ message: '센터장 없음' });

    res.json({ name: results[0].name });
  });
});

// ✅ 추천인 이름 조회
router.get('/recommender', (req, res) => {
  const { username } = req.query;
  const sql = 'SELECT name FROM members WHERE username = ? LIMIT 1';

  connection.query(sql, [username], (err, results) => {
    if (err) return res.status(500).json({ message: 'DB 오류' });
    if (results.length === 0) return res.status(404).json({ message: '추천인 없음' });

    res.json({ name: results[0].name });
  });
});

// ✅ 후원인 이름 + 좌/우 확인
router.get('/sponsor', (req, res) => {
  const { username, direction } = req.query;
  if (!username || !direction || !['L', 'R'].includes(direction)) {
    return res.status(400).json({ message: '잘못된 요청' });
  }

  const nameSql = 'SELECT name FROM members WHERE username = ?';
  connection.query(nameSql, [username], (err, result) => {
    if (err) return res.status(500).json({ message: 'DB 오류' });
    if (result.length === 0) return res.status(404).json({ message: '후원인 없음' });

    const name = result[0].name;
    const checkSql = 'SELECT COUNT(*) AS cnt FROM members WHERE sponsor = ? AND sponsor_direction = ?';
    connection.query(checkSql, [username, direction], (err2, result2) => {
      if (err2) return res.status(500).json({ message: 'DB 오류' });

      const isAvailable = result2[0].cnt === 0;
      res.json({ name, available: isAvailable });
    });
  });
});

module.exports = router;
