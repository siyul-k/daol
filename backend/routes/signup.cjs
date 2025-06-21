// ✅ 파일 경로: backend/routes/signup.cjs
console.log('▶ signup.cjs 로드됨');

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const connection = require('../db.cjs');

// ✅ 추천 계보 15대 추적 함수
async function getRecommenderLineage(recommenderId) {
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
}

router.post('/', async (req, res) => {
  try {
    const {
      username,
      password,
      name,
      email,
      phone,
      center,
      recommender,
      sponsor,
      sponsor_direction
    } = req.body;

    // ✅ 필수값 검증
    if (!username || !password || !name || !center || !recommender || !sponsor || !sponsor_direction) {
      return res.status(400).json({ success: false, message: '필수값 누락' });
    }

    // ✅ 중복 아이디 확인
    const [existing] = await connection.promise().query(
      'SELECT id FROM members WHERE username = ?',
      [username]
    );
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: '이미 사용 중인 아이디입니다.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const recLineage = await getRecommenderLineage(recommender);
    const [
      rec_1, rec_2, rec_3, rec_4, rec_5,
      rec_6, rec_7, rec_8, rec_9, rec_10,
      rec_11, rec_12, rec_13, rec_14, rec_15
    ] = recLineage;

    // ✅ SQL 준비 (컬럼 24개, placeholder 24개)
    const sql = `
      INSERT INTO members (
        username, password, name, email, phone, center,
        recommender, sponsor, sponsor_direction,
        rec_1, rec_2, rec_3, rec_4, rec_5,
        rec_6, rec_7, rec_8, rec_9, rec_10,
        rec_11, rec_12, rec_13, rec_14, rec_15
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      username,
      hashedPassword,
      name,
      email ?? null,
      phone ?? null,
      center,
      recommender,
      sponsor,
      sponsor_direction,
      rec_1, rec_2, rec_3, rec_4, rec_5,
      rec_6, rec_7, rec_8, rec_9, rec_10,
      rec_11, rec_12, rec_13, rec_14, rec_15
    ];

    console.log('✅ values.length:', values.length);
    console.log('✅ values:', values);
    console.log('✅ SQL:', sql);

    await connection.promise().query(sql, values);
    res.json({ success: true, message: '가입 완료' });

  } catch (err) {
    console.error('❌ 회원가입 오류:', err.sqlMessage || err.message);
    res.status(500).json({ success: false, message: '서버 오류', error: err });
  }
});

module.exports = router;
