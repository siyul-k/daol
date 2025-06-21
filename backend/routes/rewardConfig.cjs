// ✅ 파일 위치: backend/routes/rewardConfig.cjs
const express = require('express');
const router = express.Router();
const connection = require('../db.cjs');

router.get('/', (req, res) => {
  const sql = `SELECT config_json FROM bonus_config ORDER BY updated_at DESC LIMIT 1`;
  connection.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    if (results.length === 0) return res.status(404).json({ error: 'No config found' });

    try {
      // 문자열을 JSON 객체로 변환
      const parsed = JSON.parse(results[0].config_json);
      res.json(parsed);
    } catch (parseError) {
      res.status(500).json({ error: 'JSON parse error' });
    }
  });
});

module.exports = router;
