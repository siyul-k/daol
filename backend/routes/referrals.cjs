// ✅ 파일 위치: backend/routes/referrals.cjs
const express = require('express');
const router = express.Router();
const connection = require('../db.cjs');

router.get('/:username', async (req, res) => {
  const { username } = req.params;

  try {
    // 추천인 목록만 (후원인 관련 코드 완전 삭제)
    const [recommenderRows] = await connection.promise().query(
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
