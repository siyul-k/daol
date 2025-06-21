// ✅ 파일 경로: backend/services/rewardSponsor.cjs

const connection = require('../db.cjs');
const { getAvailableRewardAmount } = require('../utils/rewardLimit.cjs');

async function runSponsorReward() {
  try {
    const [members] = await connection.promise().query(`
      SELECT id, username FROM members 
      WHERE is_blacklisted = 0
    `);

    for (const member of members) {
      const { id: memberId, username } = member;

      // ✅ 최초 상품 구매일 조회 (normal 또는 bcode)
      const [purchaseRow] = await connection.promise().query(`
        SELECT MIN(created_at) AS purchase_date
        FROM purchases
        WHERE member_id = ? AND status = 'approved'
      `, [memberId]);

      const purchaseDate = purchaseRow[0]?.purchase_date;
      if (!purchaseDate) continue; // 상품이 없다면 실적 인정 ❌

      // ✅ 좌측 하위 실적 (normal 상품만)
      const [leftMembers] = await connection.promise().query(`
        SELECT m.id, p.pv FROM members m
        JOIN purchases p ON m.id = p.member_id
        WHERE m.sponsor = ? AND m.sponsor_direction = 'left'
          AND p.status = 'approved' AND p.type = 'normal'
          AND p.created_at >= ?
      `, [username, purchaseDate]);

      // ✅ 우측 하위 실적 (normal 상품만)
      const [rightMembers] = await connection.promise().query(`
        SELECT m.id, p.pv FROM members m
        JOIN purchases p ON m.id = p.member_id
        WHERE m.sponsor = ? AND m.sponsor_direction = 'right'
          AND p.status = 'approved' AND p.type = 'normal'
          AND p.created_at >= ?
      `, [username, purchaseDate]);

      const leftPV = leftMembers.reduce((sum, row) => sum + row.pv, 0);
      const rightPV = rightMembers.reduce((sum, row) => sum + row.pv, 0);
      const matchedPV = Math.min(leftPV, rightPV);

      // ✅ 이전 지급 내역 확인
      const [prev] = await connection.promise().query(`
        SELECT * FROM commissions WHERE username = ?
      `, [username]);

      let prevPaid = 0;
      if (prev.length > 0) prevPaid = prev[0].paid;

      const matchedDelta = matchedPV - prevPaid;
      if (matchedDelta <= 0) continue;

      // ✅ 후원수당 비율 불러오기 (bonus_config)
      const [[rateRow]] = await connection.promise().query(`
        SELECT rate FROM bonus_config WHERE reward_type = 'sponsor' AND level = 0 LIMIT 1
      `);
      const sponsorRate = rateRow?.rate || 0.05;

      const amount = Math.floor(matchedDelta * sponsorRate);
      if (amount <= 0) continue;

      // ✅ 수당 한도 초과 검사
      const available = await getAvailableRewardAmount(memberId);
      if (available < amount) continue;

      // ✅ 중복 지급 방지
      const [already] = await connection.promise().query(`
        SELECT 1 FROM rewards_log
        WHERE user_id = ? AND type = 'sponsor' AND source = ? AND DATE(created_at) = CURDATE()
      `, [username, memberId]);
      if (already.length > 0) continue;

      // ✅ 후원 수당 지급
      await connection.promise().query(`
        INSERT INTO rewards_log (user_id, type, source, amount, memo, created_at)
        VALUES (?, 'sponsor', ?, ?, '후원수당', NOW())
      `, [username, memberId, amount]);

      // ✅ commissions 테이블 업데이트
      if (prev.length > 0) {
        await connection.promise().query(`
          UPDATE commissions
          SET left_pv = ?, right_pv = ?, matched_pv = ?, paid = ?
          WHERE username = ?
        `, [leftPV, rightPV, matchedPV, matchedPV, username]);
      } else {
        await connection.promise().query(`
          INSERT INTO commissions (username, left_pv, right_pv, matched_pv, paid, created_at)
          VALUES (?, ?, ?, ?, ?, NOW())
        `, [username, leftPV, rightPV, matchedPV, matchedPV]);
      }
    }

    console.log('✅ 후원수당 정산 완료');
  } catch (err) {
    console.error('❌ 후원수당 정산 실패:', err);
  }
}

module.exports = { runSponsorReward };
