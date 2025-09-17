// ✅ 파일 경로: backend/services/rewardEngine.js
const { processDailyRewards }    = require('./rewardDaily.cjs');   // processDailyRewards(forcedDate) 지원
const { processReferralRewards } = require('./rewardReferral.cjs'); // 센터피/센터추천
const { runSponsorReward }       = require('./rewardSponsor.cjs');  // 후원수당
// const { runRankReward }       = require('./rewardRank.cjs');     // (미사용)

/**
 * opts: { date?: 'YYYY-MM-DD', only?: 'all'|'daily'|'referral'|'sponsor' }
 */
async function runAllRewardJobs(opts = {}) {
  const { date = null, only = 'all' } = opts;
  console.log('▶️ 수당 정산 시작', { date, only });

  if (only === 'referral' || only === 'all') {
    await processReferralRewards();
  }
  if (only === 'sponsor' || only === 'all') {
    await runSponsorReward();
  }
  if (only === 'daily' || only === 'all') {
    await processDailyRewards(date); // ← 날짜 전달
  }

  console.log('✅ 모든 수당 정산 완료');
}

module.exports = { runAllRewardJobs };
