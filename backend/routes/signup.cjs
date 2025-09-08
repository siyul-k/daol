// ✅ 파일 경로: backend/routes/signup.cjs

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const pool = require('../db.cjs');

/* 추천인 15대 계보 (rec_1_id ~ rec_15_id) */
async function getRecommenderLineageIds(startId) {
  const lineage = [];
  let cur = startId;
  while (cur && lineage.length < 15) {
    const [[row]] = await pool.query(
      'SELECT recommender_id FROM members WHERE id = ? LIMIT 1',
      [cur]
    );
    lineage.push(cur);
    cur = row?.recommender_id || null;
  }
  while (lineage.length < 15) lineage.push(null);
  return lineage;
}

const isValidDir = (d) => d === 'L' || d === 'R';

router.post('/', async (req, res) => {
  try {
    const {
      username, password, name, phone, email,
      center_id, recommender_id,
      sponsor_id, sponsor_direction
    } = req.body;

    // 필수값 확인
    if (!username || !password || !name || !phone ||
        !center_id || !recommender_id || !sponsor_id || !sponsor_direction) {
      return res.status(400).json({ success: false, message: '필수값 누락' });
    }
    const dir = String(sponsor_direction).toUpperCase();
    if (!isValidDir(dir)) {
      return res.status(400).json({ success: false, message: '후원 방향은 L/R 만 허용됩니다.' });
    }

    // 아이디 중복
    const [dup] = await pool.query('SELECT id FROM members WHERE username = ? LIMIT 1', [username]);
    if (dup.length) {
      return res.status(400).json({ success: false, message: '이미 사용 중인 아이디입니다.' });
    }

    // 존재 확인
    const [[rec]]    = await pool.query('SELECT id FROM members WHERE id = ? LIMIT 1',   [recommender_id]);
    const [[center]] = await pool.query('SELECT id FROM centers WHERE id = ? LIMIT 1',   [center_id]);
    const [[spon]]   = await pool.query('SELECT id FROM members WHERE id = ? LIMIT 1',   [sponsor_id]);
    if (!rec)    return res.status(400).json({ success: false, message: '존재하지 않는 추천인입니다.' });
    if (!center) return res.status(400).json({ success: false, message: '존재하지 않는 센터입니다.' });
    if (!spon)   return res.status(400).json({ success: false, message: '존재하지 않는 후원인입니다.' });

    // 후원 좌/우 자리 점검 (바이너리)
    const [[occupied]] = await pool.query(
      'SELECT id FROM members WHERE sponsor_id = ? AND sponsor_direction = ? LIMIT 1',
      [sponsor_id, dir]
    );
    if (occupied) {
      return res.status(400).json({ success: false, message: `선택한 후원 방향(${dir})은 이미 사용 중입니다.` });
    }

    const hashed = await bcrypt.hash(password, 10);

    // 추천인 계보
    const [
      rec_1_id, rec_2_id, rec_3_id, rec_4_id, rec_5_id,
      rec_6_id, rec_7_id, rec_8_id, rec_9_id, rec_10_id,
      rec_11_id, rec_12_id, rec_13_id, rec_14_id, rec_15_id
    ] = await getRecommenderLineageIds(recommender_id);

    // 🔐 INSERT (members 테이블 구조에 맞춰 필수 + sponsor + withdrawable_point 포함)
    const sql = `
      INSERT INTO members (
        username, password, name, email, phone,
        center_id, recommender_id,
        sponsor_id, sponsor_direction,
        rec_1_id, rec_2_id, rec_3_id, rec_4_id, rec_5_id,
        rec_6_id, rec_7_id, rec_8_id, rec_9_id, rec_10_id,
        rec_11_id, rec_12_id, rec_13_id, rec_14_id, rec_15_id,
        withdrawable_point
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [
      username, hashed, name, email || null, phone,
      center_id, recommender_id,
      sponsor_id, dir,
      rec_1_id, rec_2_id, rec_3_id, rec_4_id, rec_5_id,
      rec_6_id, rec_7_id, rec_8_id, rec_9_id, rec_10_id,
      rec_11_id, rec_12_id, rec_13_id, rec_14_id, rec_15_id,
      0 // NOT NULL 컬럼: 기본 0
    ];

    await pool.query(sql, values);
    return res.json({ success: true, message: '가입 완료' });
  } catch (err) {
    console.error('❌ 회원가입 오류:', err.sqlMessage || err.message);
    return res.status(500).json({ success: false, message: '서버 오류' });
  }
});

module.exports = router;
