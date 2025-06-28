// ✅ 파일 위치: /utils/rewardLimit.cjs
const connection = require('../db.cjs');

const COUNTED_TYPES = ['daily', 'daily_matching', 'recommend', 'adjust'];

async function hasRecommendedUserWithNormalProduct(myMemberId) {
  try {
    const [rows] = await connection.promise().query(
      `SELECT p.id
       FROM members m
       JOIN purchases p ON m.id = p.member_id
       WHERE m.recommender_id = ?
         AND p.type = 'normal'
         AND p.status = 'approved'
       LIMIT 1`,
      [myMemberId]
    );
    console.log('추천 하위 기본상품 보유 여부:', rows.length > 0);
    return rows.length > 0;
  } catch (err) {
    console.error('❌ 추천 하위 기본상품 검사 오류:', err);
    return false;
  }
}

async function getAvailableRewardAmount(member_id) {
  try {
    const [[member]] = await connection.promise().query(
      `SELECT id FROM members WHERE id = ? AND is_blacklisted = 0`,
      [member_id]
    );
    if (!member) return 0;

    const [products] = await connection.promise().query(
      `SELECT pv, type FROM purchases WHERE member_id = ? AND status = 'approved'`,
      [member_id]
    );

    const hasRecommendedQualified = await hasRecommendedUserWithNormalProduct(member_id);

    console.log(`회원ID ${member_id} 하위추천기본상품 보유 여부:`, hasRecommendedQualified);

    let totalLimit = 0;
    for (const { pv, type } of products) {
      if (type === 'normal') {
        const rate = hasRecommendedQualified ? 3.6 : 2.0;
        totalLimit += pv * rate;
      } else if (type === 'bcode') {
        totalLimit += pv * 1.0;
      }
    }

    const [[row]] = await connection.promise().query(
      `SELECT IFNULL(SUM(amount), 0) AS total 
       FROM rewards_log 
       WHERE member_id = ? AND type IN (?)`,
      [member_id, COUNTED_TYPES]
    );
    const totalRewarded = row.total || 0;

    const available = Math.max(totalLimit - totalRewarded, 0);
    return available;
  } catch (err) {
    console.error('❌ 수당한도 계산 오류:', err);
    return 0;
  }
}

async function getAvailableRewardAmountByUsername(username) {
  try {
    const [[row]] = await connection.promise().query(
      `SELECT id FROM members WHERE username = ? AND is_blacklisted = 0 LIMIT 1`,
      [username]
    );
    if (!row) return 0;
    return await getAvailableRewardAmount(row.id);
  } catch (err) {
    console.error('❌ username 기반 한도계산 오류:', err);
    return 0;
  }
}

async function getAvailableRewardAmountByMemberIds(memberIds) {
  if (!Array.isArray(memberIds) || memberIds.length === 0) return {};

  const qs = memberIds.map(() => '?').join(',');
  const [members] = await connection.promise().query(
    `SELECT id FROM members WHERE id IN (${qs}) AND is_blacklisted = 0`,
    memberIds
  );
  if (members.length === 0) return {};

  const [products] = await connection.promise().query(
    `SELECT member_id, pv, type FROM purchases WHERE member_id IN (${qs}) AND status = 'approved'`,
    memberIds
  );
  const [rewardRows] = await connection.promise().query(
    `SELECT member_id, IFNULL(SUM(amount),0) AS total
     FROM rewards_log WHERE member_id IN (${qs}) AND type IN ('daily','daily_matching','recommend','adjust')
     GROUP BY member_id`,
    memberIds
  );
  const rewardMap = {};
  for (const r of rewardRows) rewardMap[r.member_id] = r.total || 0;

  const [recRows] = await connection.promise().query(
    `SELECT m.recommender_id, COUNT(*) as cnt
     FROM members m
     JOIN purchases p ON m.id = p.member_id
     WHERE m.recommender_id IN (${qs})
       AND p.type = 'normal'
       AND p.status = 'approved'
     GROUP BY m.recommender_id`,
    memberIds
  );
  const recMap = {};
  for (const r of recRows) recMap[r.recommender_id] = r.cnt > 0;

  const availableMap = {};
  for (const m of members) {
    const id = m.id;
    const prods = products.filter(p => p.member_id === id);
    const hasRecommendedQualified = recMap[id] || false;

    let totalLimit = 0;
    for (const p of prods) {
      if (p.type === 'normal') {
        const rate = hasRecommendedQualified ? 3.6 : 2.0;
        totalLimit += p.pv * rate;
      } else if (p.type === 'bcode') {
        totalLimit += p.pv * 1.0;
      }
    }
    const totalRewarded = rewardMap[id] || 0;
    availableMap[id] = Math.max(totalLimit - totalRewarded, 0);
  }
  return availableMap;
}

module.exports = {
  getAvailableRewardAmount,
  getAvailableRewardAmountByUsername,
  getAvailableRewardAmountByMemberIds,
};
