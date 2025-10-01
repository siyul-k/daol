// ✅ 파일 경로: backend/routes/signup.cjs
const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcrypt');
const pool    = require('../db.cjs');

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

/** 부모 sponsor_path가 비었을 때도 안전하게 경로를 만들어주는 함수 */
async function buildSponsorPathIncludingSelf(sponsorId, newId) {
  // 1) 부모의 sponsor_path 조회
  const [[parent]] = await pool.query(
    'SELECT sponsor_path, sponsor_id FROM members WHERE id = ? LIMIT 1',
    [sponsorId]
  );

  let basePath = parent?.sponsor_path || null;
  const isValid =
    basePath &&
    basePath.startsWith('|') &&
    basePath.endsWith('|') &&
    basePath.length > 1 &&
    basePath !== '|';

  // 2) 유효한 sponsor_path가 없으면, 스폰서 체인을 위로 타고 올라가서 직접 구성
  if (!isValid) {
    const chain = [];
    let cur = sponsorId;
    const seen = new Set();
    while (cur && !seen.has(cur)) {
      seen.add(cur);
      chain.unshift(cur); // 루트부터 앞으로 쌓기
      const [[row]] = await pool.query(
        'SELECT sponsor_id FROM members WHERE id = ? LIMIT 1',
        [cur]
      );
      cur = row?.sponsor_id || null;
    }
    basePath = '|' + chain.join('|') + '|'; // 예: |루트|...|스폰서|
  }

  // 3) 내 id를 붙여 최종 경로 완성
  return (basePath.endsWith('|') ? basePath : basePath + '|') + newId + '|';
}

router.post('/', async (req, res) => {
  try {
    const {
      username, password, name, phone, email,
      center_id, recommender_id
    } = req.body;

    // 필수값 확인 (sponsor_id 입력은 필요 없음)
    if (!username || !password || !name || !phone ||
        !center_id || !recommender_id) {
      return res.status(400).json({ success: false, message: '필수값 누락' });
    }

    // 아이디 중복
    const [dup] = await pool.query('SELECT id FROM members WHERE username = ? LIMIT 1', [username]);
    if (dup.length) {
      return res.status(400).json({ success: false, message: '이미 사용 중인 아이디입니다.' });
    }

    // 존재 확인
    const [[rec]]    = await pool.query('SELECT id FROM members WHERE id = ? LIMIT 1',   [recommender_id]);
    const [[center]] = await pool.query('SELECT id FROM centers WHERE id = ? LIMIT 1',   [center_id]);
    if (!rec)    return res.status(400).json({ success: false, message: '존재하지 않는 추천인입니다.' });
    if (!center) return res.status(400).json({ success: false, message: '존재하지 않는 센터입니다.' });

    // ✅ sponsor_id = recommender_id 자동 대입
    const sponsor_id = recommender_id;

    const hashed = await bcrypt.hash(password, 10);

    // 추천인 계보
    const [
      rec_1_id, rec_2_id, rec_3_id, rec_4_id, rec_5_id,
      rec_6_id, rec_7_id, rec_8_id, rec_9_id, rec_10_id,
      rec_11_id, rec_12_id, rec_13_id, rec_14_id, rec_15_id
    ] = await getRecommenderLineageIds(recommender_id);

    // 🔐 INSERT (sponsor_direction은 항상 NULL)
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
      sponsor_id, null, // ✅ sponsor_id는 추천인과 동일, 방향은 null
      rec_1_id, rec_2_id, rec_3_id, rec_4_id, rec_5_id,
      rec_6_id, rec_7_id, rec_8_id, rec_9_id, rec_10_id,
      rec_11_id, rec_12_id, rec_13_id, rec_14_id, rec_15_id,
      0 // NOT NULL 컬럼: 기본 0
    ];

    const [result] = await pool.query(sql, values);
    const newId = result.insertId;

    // ✅ sponsor_path 즉시 생성
    const myPath = await buildSponsorPathIncludingSelf(sponsor_id, newId);
    await pool.query('UPDATE members SET sponsor_path = ? WHERE id = ?', [myPath, newId]);

    return res.json({ success: true, message: '가입 완료', member_id: newId, sponsor_path: myPath });
  } catch (err) {
    console.error('❌ 회원가입 오류:', err.sqlMessage || err.message);
    return res.status(500).json({ success: false, message: '서버 오류' });
  }
});

module.exports = router;
