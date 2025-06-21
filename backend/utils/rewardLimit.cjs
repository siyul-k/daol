// ✅ 파일 경로: backend/utils/rewardLimit.cjs

const connection = require('../db.cjs');

// ✅ 수당 한도에 포함되는 수당 종류 (요청 기준 반영)
const COUNTED_TYPES = [
  'daily',
  'daily_matching',
  'sponsor',
  'adjust'
];

// ✅ 추천인이 기본상품(normal)을 구매했는지 확인
async function isRecommenderQualified(recommender) {
  if (!recommender) return false;

  const [rows] = await connection.promise().query(
    `SELECT 1 FROM members m
     JOIN purchases p ON m.id = p.member_id
     WHERE m.username = ? AND p.type = 'normal' AND p.status = 'approved'
     LIMIT 1`,
    [recommender]
  );

  return rows.length > 0;
}

// ✅ 해당 회원의 수당 지급 가능 금액 계산
async function getAvailableRewardAmount(member_id) {
  try {
    // 1. 회원 정보 조회
    const [[member]] = await connection.promise().query(
      `SELECT username, recommender FROM members WHERE id = ? AND is_blacklisted = 0`,
      [member_id]
    );
    if (!member) return 0;

    const username = member.username;
    const recommender = member.recommender;
    const hasQualifiedRecommender = await isRecommenderQualified(recommender);

    // 2. 보유 상품 조회
    const [productRows] = await connection.promise().query(
      `SELECT pv, type, active FROM purchases 
       WHERE member_id = ? AND status = 'approved'`,
      [member_id]
    );

    let totalLimit = 0;

    for (const { pv, type, active } of productRows) {
      if (type === 'bcode') {
        // Bcode는 무조건 100% 인정 (active 여부 무관)
        totalLimit += pv * 1.0;
      } else if (type === 'normal') {
        // 추천인이 기본상품 구매했다면 200%, 없으면 150%
        const rate = hasQualifiedRecommender ? 2.0 : 1.5;
        totalLimit += pv * rate;
      }
    }

    // 3. 현재까지 발생한 수당 합계 조회
    const [[rewardRow]] = await connection.promise().query(
      `SELECT IFNULL(SUM(amount), 0) AS total 
       FROM rewards_log 
       WHERE user_id = ? AND type IN (?)`,
      [username, COUNTED_TYPES]
    );

    const totalRewarded = rewardRow.total || 0;

    // 4. 한도 초과 방지
    const available = Math.max(totalLimit - totalRewarded, 0);
    return available;
  } catch (err) {
    console.error('❌ 수당한도 계산 오류:', err);
    return 0;
  }
}

module.exports = { getAvailableRewardAmount };
