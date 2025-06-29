// ✅ 파일 경로: backend/routes/signup.cjs

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const pool = require('../db.cjs'); // connection → pool로 명칭만 변경

// 계보 추적 (id기반)
async function getRecommenderLineageIds(startId) {
  const lineage = [];
  let currentId = startId;
  while (currentId && lineage.length < 15) {
    const [[row]] = await pool.query(
      'SELECT recommender_id FROM members WHERE id = ?', [currentId]
    );
    lineage.push(currentId);
    currentId = row?.recommender_id || null;
    if (!currentId) break;
  }
  while (lineage.length < 15) lineage.push(null);
  return lineage;
}

router.post('/', async (req, res) => {
  try {
    // ⭐️ 수정: center_id, recommender_id를 바로 받음!
    const {
      username, password, name, phone, center_id, recommender_id
    } = req.body;

    // 필수값만 체크
    if (!username || !password || !name || !center_id || !recommender_id) {
      return res.status(400).json({ success: false, message: '필수값 누락' });
    }

    // 아이디 중복 체크
    const [existing] = await pool.query(
      'SELECT id FROM members WHERE username = ?', [username]
    );
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: '이미 사용 중인 아이디입니다.' });
    }

    // ⭐️ members 테이블에서 추천인 실제 존재 여부만 확인
    const [[recommenderRow]] = await pool.query(
      'SELECT id FROM members WHERE id = ? LIMIT 1', [recommender_id]
    );
    if (!recommenderRow) {
      return res.status(400).json({ success: false, message: '존재하지 않는 추천인입니다.' });
    }

    // ⭐️ 센터 실제 존재 여부도 체크 (추가: 안정성)
    const [[centerRow]] = await pool.query(
      'SELECT id FROM centers WHERE id = ? LIMIT 1', [center_id]
    );
    if (!centerRow) {
      return res.status(400).json({ success: false, message: '존재하지 않는 센터입니다.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const lineage = await getRecommenderLineageIds(recommender_id);
    const [
      rec_1_id, rec_2_id, rec_3_id, rec_4_id, rec_5_id,
      rec_6_id, rec_7_id, rec_8_id, rec_9_id, rec_10_id,
      rec_11_id, rec_12_id, rec_13_id, rec_14_id, rec_15_id
    ] = lineage;

    const sql = `
      INSERT INTO members (
        username, password, name, phone, center_id, recommender_id,
        rec_1_id, rec_2_id, rec_3_id, rec_4_id, rec_5_id,
        rec_6_id, rec_7_id, rec_8_id, rec_9_id, rec_10_id,
        rec_11_id, rec_12_id, rec_13_id, rec_14_id, rec_15_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [
      username, hashedPassword, name, phone, center_id, recommender_id,
      rec_1_id, rec_2_id, rec_3_id, rec_4_id, rec_5_id,
      rec_6_id, rec_7_id, rec_8_id, rec_9_id, rec_10_id,
      rec_11_id, rec_12_id, rec_13_id, rec_14_id, rec_15_id
    ];

    await pool.query(sql, values);
    res.json({ success: true, message: '가입 완료' });
  } catch (err) {
    console.error('❌ 회원가입 오류:', err.sqlMessage || err.message);
    res.status(500).json({ success: false, message: '서버 오류', error: err });
  }
});

module.exports = router;
