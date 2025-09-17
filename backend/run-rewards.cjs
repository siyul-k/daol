// ✅ 파일 경로: backend/run-rewards.cjs
require('dotenv').config();
const { runAllRewardJobs } = require('./services/rewardEngine.js');

// CLI 인자 파싱: 예) --date=2025-09-17 --only=daily
function parseArgs(argv) {
  const args = { date: null, only: 'all' };
  for (const a of argv.slice(2)) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(a)) args.date = a;
    else if (a.startsWith('--date=')) args.date = a.split('=')[1];
    else if (a.startsWith('--only=')) args.only = a.split('=')[1];
  }
  return args;
}

(async () => {
  try {
    const args = parseArgs(process.argv);
    console.log('🚀 수당 정산을 시작합니다...', args);
    await runAllRewardJobs(args); // { date, only }
    console.log('🎉 수당 정산이 완료되었습니다!');
    process.exit(0);
  } catch (err) {
    console.error('❌ 수당 정산 중 오류 발생:', err);
    process.exit(1);
  }
})();
