// ✅ 파일 경로: backend/services/rewardEngine.js

const { processDailyRewards } = require('./rewardDaily.cjs');
const { processReferralRewards } = require('./rewardReferral.cjs');
// const { runSponsorReward } = require('./rewardSponsor.cjs');  // ❌ 사용 안 함
// const { runRankReward } = require('./rewardRank.cjs');        // ❌ 사용 안 함

async function runAllRewardJobs() {
  console.log('▶️ 수당 정산 시작');

  // 후원, 직급 정산 함수 완전히 제거 (아예 호출 X)
  // await runSponsorReward();           
  await processReferralRewards();      // 센터피 + 센터추천만 실행
  // await runRankReward();               
  await processDailyRewards();         // 데일리 + 매칭

  console.log('✅ 모든 수당 정산 완료');
}

module.exports = { runAllRewardJobs };
