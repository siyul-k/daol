const connection = require('../db.cjs');

// ✅ 수당 한도에 포함되는 수당 종류
const COUNTED_TYPES = ['daily', 'daily_matching', 'sponsor', 'adjust'];

// ✅ 추천인이 기본상품(normal)을 구매했는지 확인
async function isRecommenderQualified(username) {
  if (!username) return false;

  try {
    // 1. 추천인 ID 조회
    const [[member]] = await connection.promise().query(
      `SELECT id FROM members WHERE username = ? LIMIT 1`,
      [username]
    );
    if (!member) return false;

    // 2. 추천인이 'normal' 상품을 승인받아 구매했는지 확인
    const [rows] = await connection.promise().query(
      `SELECT 1 FROM purchases 
       WHERE member_id = ? AND type = 'normal' AND status = 'approved' 
       LIMIT 1`,
      [member.id]
    );
    return rows.length > 0;
  } catch (err) {
    console.error('❌ 추천인 자격 확인 실패:', err);
    return false;
  }
}

// ✅ 해당 회원의 수당 지급 가능 금액 계산
async function getAvailableRewardAmount(member_id) {
  try {
    // 1. 회원 정보 조회
    const [[member]] = await connection.promise().query(
      `SELECT username, recommender 
       FROM members 
       WHERE id = ? AND is_blacklisted = 0`,
      [member_id]
    );
    if (!member) return 0;

    const { username, recommender } = member;

    // 2. 추천인 자격 조건 확인
    let rate = 1.5; // 기본 150%
    if (recommender) {
      const qualified = await isRecommenderQualified(recommender);
      if (qualified) rate = 2.0;
    }

    // 3. 회원 보유 상품 조회
    const [products] = await connection.promise().query(
      `SELECT pv, type FROM purchases 
       WHERE member_id = ? AND status = 'approved'`,
      [member_id]
    );

    let totalLimit = 0;
    for (const { pv, type } of products) {
      if (type === 'normal') {
        totalLimit += pv * rate;
      } else if (type === 'bcode') {
        totalLimit += pv;
      }
    }

    // 4. 현재까지 발생한 수당 합계 조회
    const [[row]] = await connection.promise().query(
      `SELECT IFNULL(SUM(amount), 0) AS total 
       FROM rewards_log 
       WHERE user_id = ? AND type IN (?)`,
      [username, COUNTED_TYPES]
    );
    const totalRewarded = row.total || 0;

    // 5. 수당 한도 계산
    const available = Math.max(totalLimit - totalRewarded, 0);

    // 디버그 로그
    console.log(`[한도계산] ${username}: 한도=${totalLimit}, 누적=${totalRewarded}, 가능=${available}, 추천인=${recommender}, 추천인자격=${rate === 2.0}`);

    return available;
  } catch (err) {
    console.error('❌ 수당한도 계산 오류:', err);
    return 0;
  }
}

module.exports = { getAvailableRewardAmount };
