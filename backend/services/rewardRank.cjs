// ✅ 파일 경로: backend/services/rewardRank.cjs

const connection = require('../db.cjs');
const { format, subMonths, endOfMonth } = require('date-fns');
const { getAvailableRewardAmountByMemberId } = require('../utils/rewardLimit.cjs');

// username → member_id 변환 함수
async function getMemberId(username) {
  const [[row]] = await connection.promise().query(
    'SELECT id FROM members WHERE username = ? LIMIT 1',
    [username]
  );
  return row ? row.id : null;
}

async function runRankReward() {
  try {
    // ✅ 직급 수당 설정값 확인
    const [[setting]] = await connection.promise().query(`
      SELECT value FROM settings WHERE key_name = 'rank_reward_enabled' LIMIT 1
    `);
    if (!setting || setting.value !== '1') {
      console.log('⚠️ 직급수당 정산 비활성화됨. 실행 스킵');
      return;
    }

    // ✅ 정산 대상: 전월 1일 ~ 말일
    const now = new Date();
    const period_start = format(subMonths(now, 1), 'yyyy-MM-01');
    const period_end = format(endOfMonth(subMonths(now, 1)), 'yyyy-MM-dd');

    // ✅ 전월 normal 상품 매출 합산
    const [[{ total_pv }]] = await connection.promise().query(`
      SELECT SUM(pv) AS total_pv FROM purchases 
      WHERE status = 'approved' AND type = 'normal'
        AND DATE(created_at) BETWEEN ? AND ?
    `, [period_start, period_end]);

    if (!total_pv || total_pv === 0) {
      console.log('⚠️ 전월 매출 없음 → 직급수당 스킵');
      return;
    }

    const total_bonus = Math.floor(total_pv * 0.05);

    // ✅ 직급 정보 조회 (상위 → 하위)
    const [ranks] = await connection.promise().query(`
      SELECT * FROM ranks ORDER BY level DESC
    `);

    // ✅ 한도 캐시
    const availableMap = {};

    for (const rank of ranks) {
      const { id: rank_id, rank_name, payout_ratio } = rank;

      // ✅ 해당 직급 이상 회원 조회
      const [users] = await connection.promise().query(`
        SELECT member_id FROM rank_achievements 
        WHERE rank >= ? AND achieved_at <= ?
      `, [rank_id, period_end]);

      if (!users.length) continue;

      const portion = Math.floor(total_bonus * (payout_ratio / 100));
      const per_user = Math.floor(portion / users.length);

      for (const { member_id } of users) {
        // ✅ 중복 지급 여부 확인
        const [[exists]] = await connection.promise().query(`
          SELECT 1 FROM rank_rewards 
          WHERE member_id = ? AND rank = ? AND period_start = ?
        `, [member_id, rank_id, period_start]);
        if (exists) continue;

        // ✅ 한도 확인 (캐시 사용)
        if (!availableMap[member_id]) {
          availableMap[member_id] = await getAvailableRewardAmountByMemberId(member_id);
        }

        const available = availableMap[member_id];
        if (available < per_user) continue;

        // ✅ 지급 기록 (rank_rewards)
        await connection.promise().query(`
          INSERT INTO rank_rewards (member_id, rank, amount, period_start, period_end, created_at)
          VALUES (?, ?, ?, ?, ?, NOW())
        `, [member_id, rank_id, per_user, period_start, period_end]);

        // ✅ 지급 로그 (rewards_log)
        await connection.promise().query(`
          INSERT INTO rewards_log (member_id, type, source, amount, memo, created_at)
          VALUES (?, 'rank', ?, ?, ?, NOW())
        `, [
          member_id,
          `RANK-${rank_id}`,
          per_user,
          `${rank_name} 수당 (${period_start})`
        ]);

        // ✅ 한도 차감
        availableMap[member_id] -= per_user;
      }
    }

    console.log('✅ 직급수당 정산 완료');
  } catch (err) {
    console.error('❌ 직급수당 정산 오류:', err);
  }
}

module.exports = { runRankReward };
