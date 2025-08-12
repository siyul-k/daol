// 📄 backend/scripts/backfillDailySummary.js
const pool = require('../db.cjs');

async function backfillDailySummary(startDate) {
  const TYPES = ['daily','daily_matching','recommend','center','center_recommend'];

  // reward_date 기준으로 날짜 목록
  const [dates] = await pool.query(
    `SELECT DISTINCT reward_date AS d
       FROM rewards_log
      WHERE type IN (?) AND reward_date >= ?
      ORDER BY d`,
    [TYPES, startDate]
  );

  console.log(`총 ${dates.length}일 백필 시작 (시작일: ${startDate})`);
  for (const { d } of dates) {
    await pool.query(
      `INSERT INTO reward_daily_summary
         (member_id, reward_date, type, total_amount, executed_date)
       SELECT member_id, ?, type, COALESCE(SUM(amount),0) AS total_amount, CURDATE()
         FROM rewards_log
        WHERE type IN (?) AND reward_date = ?
        GROUP BY member_id, type
       ON DUPLICATE KEY UPDATE
         total_amount  = VALUES(total_amount),
         executed_date = VALUES(executed_date)`,
      [d, TYPES, d]
    );
  }
  console.log('✅ 백필 완료');
}

if (require.main === module) {
  const START = process.argv[2] || '2025-04-08';
  backfillDailySummary(START)
    .then(()=>process.exit(0))
    .catch(e=>{ console.error('❌ 백필 오류:', e); process.exit(1); });
}

module.exports = { backfillDailySummary };
