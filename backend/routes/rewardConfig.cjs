const express = require('express');
const router = express.Router();
const pool = require('../db.cjs');

// ✅ 최신 보너스 수당 config 조회 (config_json 필드 기준)
router.get('/', async (req, res) => {
  try {
    const [results] = await pool.query(
      `SELECT config_json FROM bonus_config ORDER BY updated_at DESC LIMIT 1`
    );
    if (results.length === 0)
      return res.status(404).json({ error: 'No config found' });

    // 문자열을 JSON 객체로 변환
    try {
      const parsed = JSON.parse(results[0].config_json);
      res.json(parsed);
    } catch (parseError) {
      res.status(500).json({ error: 'JSON parse error' });
    }
  } catch (err) {
    res.status(500).json({ error: 'DB error' });
  }
});

module.exports = router;
