const express = require('express');
const router = express.Router();
const pool = require('../db.cjs');  // pool 기반으로 통일

router.get('/:username', async (req, res) => {
  const { username } = req.params;

  try {
    // 추천인 목록만 (후원인 관련 코드 없음)
    const [recommenderRows] = await pool.query(
      `SELECT username FROM members WHERE recommender = ?`,
      [username]
    );
    const recommenders = recommenderRows.map(r => r.username);
    res.json({ recommenders });
  } catch (err) {
    console.error("❌ 추천인 목록 조회 오류:", err);
    res.status(500).json({ error: "DB 오류", details: err });
  }
});

module.exports = router;
