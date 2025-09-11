// ✅ 파일 경로: backend/services/rewardEngine.js

const { processDailyRewards }    = require('./rewardDaily.cjs');
const { processReferralRewards } = require('./rewardReferral.cjs'); // 센터피/센터추천
const { runSponsorReward }       = require('./rewardSponsor.cjs');  // 후원수당
// const { runRankReward }       = require('./rewardRank.cjs');     // (미사용)

async function runAllRewardJobs() {
  console.log('▶️ 수당 정산 시작');

  // 1) 센터피/센터추천
  await processReferralRewards();

  // 2) 후원수당
  await runSponsorReward();

  // 3) 데일리 + 데일리 매칭
  await processDailyRewards();

  console.log('✅ 모든 수당 정산 완료');
}

module.exports = { runAllRewardJobs };
