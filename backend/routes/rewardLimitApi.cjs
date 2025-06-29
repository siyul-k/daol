// ✅ 파일 위치: backend/routes/rewardLimitApi.cjs

const express = require('express');
const router = express.Router();
const pool = require('../db.cjs'); // connection → pool로 통일

// ✅ 수당 한도 계산 함수 (member_id 기준)
async function calculateRewardLimit(member_id) {
  let totalLimit = 0;

  // 1) 회원의 모든 승인 구매내역 조회
  const [rows] = await pool.query(
    `SELECT p.type, p.pv
     FROM purchases p
     WHERE p.member_id = ? AND p.status = 'approved'`,
    [member_id]
  );

  // 2) 직하위 추천인 중 기본상품 구매자 존재여부
  const [[hasSubRecRow]] = await pool.query(
    `SELECT COUNT(*) AS cnt
     FROM members m
     JOIN purchases p ON m.id = p.member_id
     WHERE m.recommender_id = ? AND p.type = 'normal' AND p.status = 'approved'
     LIMIT 1`,
    [member_id]
  );
  const hasSubRecProduct = hasSubRecRow.cnt > 0;

  // 3) 상품별 한도 누적
  for (const row of rows) {
    const { type, pv } = row;
    if (type === 'normal') {
      totalLimit += hasSubRecProduct ? pv * 3.6 : pv * 2.0;
    }
    if (type === 'bcode') {
      totalLimit += pv * 1.0;
    }
  }
  return Math.floor(totalLimit);
}

// ✅ 누적 수당 사용량 (member_id 기준)
async function getUsedRewardPoint(member_id) {
  const [rows] = await pool.query(
    `SELECT IFNULL(SUM(amount), 0) AS total
     FROM rewards_log
     WHERE member_id = ?
       AND type IN ('daily', 'daily_matching', 'referral', 'adjust')`,
    [member_id]
  );
  return Number(rows[0].total || 0);
}

// ✅ 수당한도/누적수당 API
router.get('/', async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) return res.status(400).json({ error: 'username required' });

    const [[member]] = await pool.query(
      `SELECT id FROM members WHERE username = ? LIMIT 1`,
      [username]
    );
    if (!member) return res.status(404).json({ error: '회원 없음' });

    const member_id = member.id;
    const [limit, used] = await Promise.all([
      calculateRewardLimit(member_id),
      getUsedRewardPoint(member_id)
    ]);
    return res.json({
      limit,
      used,
      percent: limit > 0 ? Math.min((used / limit) * 100, 100) : 0
    });
  } catch (err) {
    console.error('❌ reward-limit API 오류:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
