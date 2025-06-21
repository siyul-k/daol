// ✅ 파일 경로: backend/schedulers/rewardScheduler.cjs

const cron = require('node-cron');
const { format } = require('date-fns');

const { processReferralRewards } = require('../services/rewardReferral.cjs');
const { processSponsorRewards } = require('../services/rewardSponsor.cjs');
const { processDailyRewards } = require('../services/rewardDaily.cjs');
const { processRankRewards } = require('../services/rewardRank.cjs');

// ✅ 매일 00:30 → 추천, 후원, 데일리 등 실행
cron.schedule('30 0 * * *', async () => {
  console.log(`⏱️ [${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}] 수당 정산 시작`);

  await processReferralRewards();
  await processSponsorRewards();
  await processDailyRewards();

  console.log(`✅ [${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}] 일일 수당 정산 완료`);
});

// ✅ 매월 15일 00:30 → 직급수당 정산
cron.schedule('30 0 15 * *', async () => {
  console.log(`⏱️ [${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}] 직급 수당 정산 시작`);

  await processRankRewards();

  console.log(`✅ [${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}] 직급 수당 정산 완료`);
});

console.log('🚀 수당 스케줄러 실행 중...');
