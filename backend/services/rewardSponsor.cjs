// ✅ 파일 경로: backend/services/rewardSponsor.cjs

const connection = require('../db.cjs');
const { getAvailableRewardAmount } = require('../utils/rewardLimit.cjs');

// 하위 트리 PV 합산 (member_id 기준)
async function getSubtreePV(sponsor_id, direction, afterDate) {
  // 하위 회원들 조회 (sponsor_id, sponsor_direction)
  const [members] = await connection.promise().query(
    `SELECT m.id, p.pv, p.created_at 
     FROM members m
     JOIN purchases p ON m.id = p.member_id
     WHERE m.sponsor_id = ? AND m.sponsor_direction = ?
       AND p.status = 'approved' AND p.type = 'normal'`,
    [sponsor_id, direction]
  );
  let total = 0;
  for (const row of members) {
    if (new Date(row.created_at) >= new Date(afterDate)) {
      total += row.pv;
    }
    total += await getSubtreePV(row.id, direction, afterDate);
  }
  return total;
}

async function runSponsorReward() {
  try {
    // 전체 회원 목록 (id, username)
    const [members] = await connection.promise().query(
      `SELECT id, username FROM members WHERE is_blacklisted = 0`
    );

    for (const member of members) {
      const { id: memberId, username } = member;

      // 본인 최초 구매일
      const [[{ purchase_date } = {}]] = await connection.promise().query(
        `SELECT MIN(created_at) AS purchase_date FROM purchases
         WHERE member_id = ? AND status = 'approved'`,
        [memberId]
      );
      if (!purchase_date) continue;

      // 좌/우 하위 실적 (member_id 기반)
      const leftPV = await getSubtreePV(memberId, 'L', purchase_date);
      const rightPV = await getSubtreePV(memberId, 'R', purchase_date);
      const matchedPV = Math.min(leftPV, rightPV);

      // 이전 지급 확인 (commissions 테이블: member_id 기반)
      const [[prevRow = {}]] = await connection.promise().query(
        `SELECT paid FROM commissions WHERE member_id = ?`, [memberId]
      );
      const prevPaid = prevRow.paid || 0;

      const matchedDelta = matchedPV - prevPaid;
      if (matchedDelta <= 0) continue;

      // 수당 비율
      const [[{ rate = 0.05 } = {}]] = await connection.promise().query(
        `SELECT rate FROM bonus_config
         WHERE reward_type = 'sponsor' AND level = 0
         ORDER BY updated_at DESC LIMIT 1`
      );
      const amount = Math.floor(matchedDelta * rate);
      if (amount <= 0) continue;

      // 한도 검사
      const available = await getAvailableRewardAmount(memberId);
      if (available < amount) continue;

      // 중복 지급 방지 (rewards_log: member_id 기준)
      const [already] = await connection.promise().query(
        `SELECT 1 FROM rewards_log
         WHERE member_id = ? AND type = 'sponsor' AND DATE(created_at) = CURDATE()`,
        [memberId]
      );
      if (already.length > 0) continue;

      // 수당 지급 (member_id 기반)
      await connection.promise().query(
        `INSERT INTO rewards_log (member_id, type, source, amount, memo, created_at)
         VALUES (?, 'sponsor', ?, ?, '후원수당', NOW())`,
        [memberId, memberId, amount]
      );

      // commissions 갱신 (member_id 기반)
      await connection.promise().query(
        `INSERT INTO commissions (member_id, left_pv, right_pv, matched_pv, paid, created_at)
         VALUES (?, ?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE
           left_pv = VALUES(left_pv),
           right_pv = VALUES(right_pv),
           matched_pv = VALUES(matched_pv),
           paid = VALUES(paid)`,
        [memberId, leftPV, rightPV, matchedPV, matchedPV]
      );
    }

    console.log('✅ 후원수당 정산 완료');
  } catch (err) {
    console.error('❌ 후원수당 정산 실패:', err);
  }
}

module.exports = { runSponsorReward };
