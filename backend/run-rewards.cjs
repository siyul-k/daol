// ✅ 파일 경로: backend/run-rewards.cjs

const { runAllRewardJobs } = require('./services/rewardEngine');
require('dotenv').config();

(async () => {
  try {
    console.log('🚀 수당 정산을 시작합니다...');
    await runAllRewardJobs();
    console.log('🎉 수당 정산이 완료되었습니다!');
    process.exit(0);
  } catch (err) {
    console.error('❌ 수당 정산 중 오류 발생:', err);
    process.exit(1);
  }
})();
