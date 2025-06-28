// ✅ 파일: backend/routes/updateRecommender.cjs
const express = require('express');
const router = express.Router();
const connection = require('../db.cjs');

// 추천인 15대 계보 (id 기준)
async function getRecommenderLineage(recommenderId) {
  const lineage = [];
  let current = recommenderId;
  while (current && lineage.length < 15) {
    lineage.push(current);
    const [[row]] = await connection.promise().query(
      'SELECT recommender_id FROM members WHERE id = ?', [current]
    );
    current = row?.recommender_id || null;
  }
  while (lineage.length < 15) lineage.push(null);
  return lineage;
}

router.post('/', async (req, res) => {
  try {
    const { username, newRecommender } = req.body; // username: 변경할 대상, newRecommender: 새 추천인 username
    if (!username || !newRecommender) {
      return res.status(400).json({ success: false, message: '필수값 누락' });
    }
    // username → id
    const [[userRow]] = await connection.promise().query(
      'SELECT id FROM members WHERE username = ? LIMIT 1', [username]
    );
    if (!userRow) return res.status(404).json({ success: false, message: '대상 회원 없음' });
    const memberId = userRow.id;

    // newRecommender → id
    const [[recRow]] = await connection.promise().query(
      'SELECT id FROM members WHERE username = ? LIMIT 1', [newRecommender]
    );
    if (!recRow) return res.status(404).json({ success: false, message: '신규 추천인 없음' });
    const newRecommenderId = recRow.id;

    // 15대 계보
    const recLineage = await getRecommenderLineage(newRecommenderId);

    // UPDATE (추천인 + 15대 계보)
    const sql = `
      UPDATE members
      SET recommender_id = ?,
          rec_1_id = ?, rec_2_id = ?, rec_3_id = ?, rec_4_id = ?, rec_5_id = ?,
          rec_6_id = ?, rec_7_id = ?, rec_8_id = ?, rec_9_id = ?, rec_10_id = ?,
          rec_11_id = ?, rec_12_id = ?, rec_13_id = ?, rec_14_id = ?, rec_15_id = ?
      WHERE id = ?
    `;
    const values = [
      newRecommenderId,
      ...recLineage,
      memberId
    ];

    // 디버그: 바인딩 값 길이 반드시 16개(추천인 + 15대 + member_id)
    console.log('바인딩 값:', values, '길이:', values.length);

    await connection.promise().query(sql, values);

    res.json({ success: true, message: '추천인 및 계보 업데이트 완료' });
  } catch (err) {
    console.error('❌ 추천인 변경 오류:', err);
    res.status(500).json({ success: false, message: '서버 오류', error: err });
  }
});

module.exports = router;
