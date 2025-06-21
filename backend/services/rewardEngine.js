// ✅ 파일 경로: backend/services/rewardEngine.js

const { processDailyRewards } = require('./rewardDaily.cjs');
const { processReferralRewards } = require('./rewardReferral.cjs');
const { runSponsorReward } = require('./rewardSponsor.cjs');
const { runRankReward } = require('./rewardRank.cjs');

async function runAllRewardJobs() {
  console.log('▶️ 수당 정산 시작');

  await processDailyRewards();         // 데일리 + 매칭
  await processReferralRewards();      // 추천수당 + 센터피 + 센터추천
  await runSponsorReward();            // 후원수당
  await runRankReward();               // 직급수당

  console.log('✅ 모든 수당 정산 완료');
}

module.exports = { runAllRewardJobs };
