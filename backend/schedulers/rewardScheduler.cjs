// ✅ 파일 경로: backend/schedulers/rewardScheduler.cjs
'use strict';

const cron = require('node-cron');
const { format } = require('date-fns');
const moment = require('moment-timezone');

const { processReferralRewards }    = require('../services/rewardReferral.cjs');
const { processDailyRewards }       = require('../services/rewardDaily.cjs');
// const { runSponsorReward }       = require('../services/rewardSponsor.cjs');   // 🚫 비활성화
const { updateAllRecommendLineage } = require('../scripts/fixRecommendLineage.cjs');

// =======================================================
// 🚨 Railway/Render 등 해외(UTC) 서버 기준으로 cron을 작성해야 함!
//    (한국 KST = UTC + 9시간)
//    - 23:30 KST → 14:30 UTC ('30 14 * * *')
//    - 00:05 KST → 15:05 UTC ('5 15 * * *')
//    - 00:30 KST → 15:30 UTC ('30 15 * * *')
// =======================================================

// ✅ 매일 23:30 (KST) = 14:30 (UTC) → 계보 갱신 + 추천/센터피 정산
cron.schedule('5 15 * * *', async () => {
  const now = new Date();
  console.log(`⏱️ [${format(now, 'yyyy-MM-dd HH:mm:ss')}] 추천계보 갱신 시작`);
  try {
    await updateAllRecommendLineage();
    console.log(`✅ [${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}] 추천계보 갱신 완료`);
    await processReferralRewards();
    console.log(`✅ [${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}] 추천/센터피 정산 완료`);
  } catch (e) {
    console.error(`❌ 추천/센터피 정산 에러:`, e);
  }
});

// 🚫 매일 00:05 (KST) = 15:05 (UTC) → 후원수당 정산 비활성화
// cron.schedule('5 15 * * *', async () => { ... });

// ✅ 매일 00:30 (KST) = 15:30 (UTC) → 데일리수당 정산
cron.schedule('30 15 * * *', async () => {
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

// =======================================================
// 📌 CLI 단발 실행 지원
//    사용법:
//      node backend/schedulers/rewardScheduler.cjs referral 2025-09-25
//      node backend/schedulers/rewardScheduler.cjs daily   2025-09-25
// =======================================================
if (require.main === module) {
  (async () => {
    const mode = process.argv[2];          // referral | daily
    const dateArg = process.argv[3] || null;

    try {
      if (mode === 'referral') {
        console.log(`▶ 수동 실행: 추천/센터피 정산 (date=${dateArg || 'today'})`);
        await processReferralRewards(dateArg);
        console.log('✅ 수동 실행 완료 (추천/센터피)');
      } else if (mode === 'daily') {
        console.log(`▶ 수동 실행: 데일리 정산 (date=${dateArg || 'today'})`);
        await processDailyRewards(dateArg);
        console.log('✅ 수동 실행 완료 (데일리)');
      } else {
        console.log('⚠️ 사용법: node backend/schedulers/rewardScheduler.cjs [referral|daily] [YYYY-MM-DD]');
      }
    } catch (err) {
      console.error('❌ 단발 실행 에러:', err);
      process.exit(1);
    } finally {
      process.exit(0);
    }
  })();
}
