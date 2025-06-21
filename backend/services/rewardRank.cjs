// ✅ 파일 경로: backend/services/rewardRank.cjs

const connection = require('../db.cjs');
const { format, subMonths, endOfMonth } = require('date-fns');
const { getAvailableRewardAmountByUsername } = require('../utils/rewardLimit.cjs');

async function runRankReward() {
  try {
    // ✅ 정산 활성 여부 확인
    const [[setting]] = await connection.promise().query(`
      SELECT value FROM settings WHERE key_name = 'rank_reward_enabled' LIMIT 1
    `);
    if (!setting || setting.value !== '1') {
      console.log('⚠️ 직급수당 정산 비활성화됨. 실행 스킵');
      return;
    }

    // ✅ 전월 기간 계산
    const now = new Date();
    const period_start = format(subMonths(now, 1), 'yyyy-MM-01');
    const period_end = format(endOfMonth(subMonths(now, 1)), 'yyyy-MM-dd');

    // ✅ 전월 매출 총합 (normal 상품만)
    const [sumRow] = await connection.promise().query(`
      SELECT SUM(pv) AS total_pv FROM purchases 
      WHERE status = 'approved' AND type = 'normal'
        AND DATE(created_at) BETWEEN ? AND ?
    `, [period_start, period_end]);

    const total_pv = sumRow[0].total_pv || 0;
    const total_bonus = Math.floor(total_pv * 0.05);

    if (total_bonus === 0) {
      console.log('⚠️ 전월 매출 없음, 직급 수당 정산 스킵');
      return;
    }

    // ✅ 직급 순서 높은 것부터 계산 (5Star → 1Star)
    const [ranks] = await connection.promise().query(`
      SELECT * FROM ranks ORDER BY level DESC
    `);

    for (const rank of ranks) {
      const { id, rank_name, payout_ratio, level } = rank;

      // ✅ 해당 직급 이상을 달성한 회원 목록
      const [users] = await connection.promise().query(`
        SELECT username FROM rank_achievements 
        WHERE rank >= ? AND achieved_at <= ?
      `, [id, period_end]);

      if (users.length === 0) continue;

      const portion = Math.floor((total_bonus * payout_ratio) / 100);
      const per_user = Math.floor(portion / users.length);

      for (const user of users) {
        // ✅ 중복 지급 방지
        const [exists] = await connection.promise().query(`
          SELECT 1 FROM rank_rewards 
          WHERE username = ? AND rank = ? AND period_start = ?
        `, [user.username, id, period_start]);

        if (exists.length > 0) continue;

        // ✅ 수당 한도 검사
        const available = await getAvailableRewardAmountByUsername(user.username);
        if (available <= 0) continue;

        // ✅ 지급 기록 삽입
        await connection.promise().query(` 
          INSERT INTO rank_rewards (username, rank, amount, period_start, period_end, created_at)
          VALUES (?, ?, ?, ?, ?, NOW())
        `, [user.username, id, per_user, period_start, period_end]);

        // ✅ 수당 로그 추가
        await connection.promise().query(`
          INSERT INTO rewards_log (user_id, type, source, amount, memo, created_at)
          VALUES (?, 'rank', ?, ?, ?, NOW())
        `, [user.username, `RANK-${id}`, per_user, `${rank_name} 수당 (${period_start})`]);
      }
    }

    console.log('✅ 직급수당 정산 완료');
  } catch (err) {
    console.error('❌ 직급수당 정산 오류:', err);
  }
}

module.exports = { runRankReward };
