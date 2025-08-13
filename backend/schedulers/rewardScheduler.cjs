// ✅ 파일 경로: backend/schedulers/rewardScheduler.cjs

const cron = require('node-cron');
const { format } = require('date-fns');
const moment = require('moment-timezone');  // 추가

const { processReferralRewards } = require('../services/rewardReferral.cjs');
const { processDailyRewards } = require('../services/rewardDaily.cjs');
const { updateAllRecommendLineage } = require('../scripts/fixRecommendLineage.cjs'); // ← 추가

// =======================================================
// 🚨 Railway/Render 등 해외(UTC) 서버 기준으로 cron을 작성해야 함!
//    (한국 KST = UTC + 9시간)
//    - 23:30 KST → 14:30 UTC ('30 14 * * *')
//    - 00:30 KST → 15:30 UTC ('30 15 * * *')
// =======================================================

// 테스트용: 2분마다 KST 현재 시간 찍기 (운영 시 주석 처리 가능)
// cron.schedule('*/2 * * * *', () => {
//   console.log('🕑 테스트 크론! KST 현재시간:', moment().tz('Asia/Seoul').format());
// });

// ✅ 매일 23:30 (KST) = 14:30 (UTC) → 추천수당 정산 전 계보 갱신
cron.schedule('30 23 * * *', async () => {
  const now = new Date();
  console.log(`⏱️ [${format(now, 'yyyy-MM-dd HH:mm:ss')}] 추천계보 갱신 시작`);
  try {
    await updateAllRecommendLineage();
    console.log(`✅ [${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}] 추천계보 갱신 완료`);
    await processReferralRewards();
    console.log(`✅ [${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}] 추천수당 정산 완료`);
  } catch (e) {
    console.error(`❌ 추천수당/계보 정산 에러:`, e);
  }
});

// ✅ 매일 00:30 (KST) = 15:30 (UTC) → 데일리수당 정산
cron.schedule('30 0 * * *', async () => {
  const now = new Date();
  console.log(`⏱️ [${format(now, 'yyyy-MM-dd HH:mm:ss')}] 데일리수당 정산 시작`);
  try {
    await processDailyRewards();
    console.log(`✅ [${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}] 데일리수당 정산 완료`);
  } catch (e) {
    console.error(`❌ 데일리수당 정산 에러:`, e);
  }
});

console.log('🚀 수당 스케줄러 실행 중...(UTC 기준 스케줄)');
