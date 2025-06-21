// ✅ 파일 경로: backend/routes/updateRecommender.cjs
const express = require('express');
const router = express.Router();
const connection = require('../db.cjs');

// ✅ 추천 계보 다시 계산 함수
const getRecommenderLineage = async (recommenderId) => {
  const lineage = [];
  let current = recommenderId;
  while (current && lineage.length < 15) {
    const [rows] = await connection.promise().query(
      'SELECT recommender FROM members WHERE username = ?',
      [current]
    );
    if (rows.length === 0) break;
    lineage.push(current);
    current = rows[0].recommender;
  }
  while (lineage.length < 15) lineage.push(null);
  return lineage;
};

// ✅ 추천인 변경 API
router.post('/', async (req, res) => {
  try {
    const { username, newRecommender } = req.body;

    if (!username || !newRecommender) {
      return res.status(400).json({ success: false, message: '필수값 누락' });
    }

    // ✅ 새로운 추천인이 실제로 존재하는지 확인
    const [check] = await connection.promise().query(
      'SELECT username FROM members WHERE username = ?',
      [newRecommender]
    );
    if (check.length === 0) {
      return res.status(404).json({ success: false, message: '신규 추천인이 존재하지 않습니다' });
    }

    // ✅ 추천 계보 15대 재계산
    const recLineage = await getRecommenderLineage(newRecommender);
    const [
      rec_1, rec_2, rec_3, rec_4, rec_5,
      rec_6, rec_7, rec_8, rec_9, rec_10,
      rec_11, rec_12, rec_13, rec_14, rec_15
    ] = recLineage;

    // ✅ 추천인 + 계보 업데이트
    const sql = `
      UPDATE members
      SET recommender = ?,
          rec_1 = ?, rec_2 = ?, rec_3 = ?, rec_4 = ?, rec_5 = ?,
          rec_6 = ?, rec_7 = ?, rec_8 = ?, rec_9 = ?, rec_10 = ?,
          rec_11 = ?, rec_12 = ?, rec_13 = ?, rec_14 = ?, rec_15 = ?
      WHERE username = ?
    `;
    const values = [
      newRecommender,
      rec_1, rec_2, rec_3, rec_4, rec_5,
      rec_6, rec_7, rec_8, rec_9, rec_10,
      rec_11, rec_12, rec_13, rec_14, rec_15,
      username
    ];

    await connection.promise().query(sql, values);
    res.json({ success: true, message: '추천인 변경 및 계보 재설정 완료' });

  } catch (err) {
    console.error('❌ 추천인 변경 오류:', err);
    res.status(500).json({ success: false, message: '서버 오류', error: err });
  }
});

module.exports = router;
