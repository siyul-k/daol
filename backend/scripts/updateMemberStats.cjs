// 📄 backend/services/updateMemberStats.cjs
const pool = require('../db.cjs');

function chunk(arr, n = 1000) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}
function ph(n) { return Array.from({ length: n }, () => '?').join(','); }

/**
 * 주어진 회원들에 대해 member_stats 업서트
 * - packages_amount   : purchases(approved, normal/bcode) 합
 * - total_deposit     : deposit_requests(완료) 합  ← 완료만
 * - total_reward      : rewards_log(확정: is_released=1, is_deleted=0) 합
 * - total_withdraw    : withdraw_requests(요청+완료) 합
 * - withdrawable_point: members.withdrawable_point (보유 컬럼 사용)
 * - shopping_point    : members.shopping_point
 */
async function upsertMemberStatsFor(memberIds, { truncate = false } = {}) {
  if (!memberIds?.length) return { ok: true, updated: 0 };
  const ids = [...new Set(memberIds)].filter(Boolean);

  if (truncate) await pool.query(`TRUNCATE TABLE member_stats`);

  let updated = 0;

  for (const batch of chunk(ids, 1000)) {
    const inPh = ph(batch.length);

    // purchases 합계(승인)
    const [pRows] = await pool.query(
      `SELECT member_id, COALESCE(SUM(amount),0) AS packages_amount
         FROM purchases
        WHERE status='approved' AND member_id IN (${inPh})
        GROUP BY member_id`,
      batch
    );
    const pMap = new Map(pRows.map(r => [r.member_id, Number(r.packages_amount || 0)]));

    // rewards_log 합계(확정 지급분만)
    const [rRows] = await pool.query(
      `SELECT member_id, COALESCE(SUM(amount),0) AS total_reward
         FROM rewards_log
        WHERE COALESCE(is_deleted,0)=0 AND is_released=1 AND member_id IN (${inPh})
        GROUP BY member_id`,
      batch
    );
    const rMap = new Map(rRows.map(r => [r.member_id, Number(r.total_reward || 0)]));

    // deposit 합계(완료만)
    const [dRows] = await pool.query(
      `SELECT member_id, COALESCE(SUM(amount),0) AS total_deposit
         FROM deposit_requests
        WHERE status IN ('완료') AND member_id IN (${inPh})
        GROUP BY member_id`,
      batch
    );
    const dMap = new Map(dRows.map(r => [r.member_id, Number(r.total_deposit || 0)]));

    // withdraw 합계(요청+완료, 한/영 혼용 모두 허용)
    const [wRows] = await pool.query(
      `SELECT member_id, COALESCE(SUM(amount),0) AS total_withdraw
         FROM withdraw_requests
        WHERE status IN ('요청','완료','requested','completed')
          AND member_id IN (${inPh})
        GROUP BY member_id`,
      batch
    );
    const wMap = new Map(wRows.map(r => [r.member_id, Number(r.total_withdraw || 0)]));

    // members 현재 포인트(출금가능/쇼핑포인트)
    const [mRows] = await pool.query(
      `SELECT id AS member_id, withdrawable_point, shopping_point
         FROM members
        WHERE id IN (${inPh})`,
      batch
    );
    const mMap = new Map(
      mRows.map(r => [
        r.member_id,
        {
          withdrawable_point: Number(r.withdrawable_point || 0),
          shopping_point: Number(r.shopping_point || 0),
        },
      ])
    );

    // 각 행: 7개 값 (updated_at은 SQL에서 CURRENT_TIMESTAMP로 처리)
    const values = batch.map(id => [
      id,
      pMap.get(id) || 0,
      dMap.get(id) || 0,
      rMap.get(id) || 0,
      wMap.get(id) || 0,
      mMap.get(id)?.withdrawable_point ?? 0,
      mMap.get(id)?.shopping_point ?? 0,
    ]);

    if (values.length) {
      // ✅ VALUES ? 를 쓰면 CURRENT_TIMESTAMP를 못 끼워 넣으니,
      //    다건 플레이스홀더를 직접 구성하고 마지막 자리는 CURRENT_TIMESTAMP를 상수로 박는다.
      const tuple = '(?,?,?,?,?,?,?,CURRENT_TIMESTAMP)'; // 7개 ? + CURRENT_TIMESTAMP
      const placeholders = values.map(() => tuple).join(',');
      const flat = values.flat();

      const sql = `
        INSERT INTO member_stats
          (member_id, packages_amount, total_deposit, total_reward, total_withdraw, withdrawable_point, shopping_point, updated_at)
        VALUES ${placeholders}
        ON DUPLICATE KEY UPDATE
          packages_amount    = VALUES(packages_amount),
          total_deposit      = VALUES(total_deposit),
          total_reward       = VALUES(total_reward),
          total_withdraw     = VALUES(total_withdraw),
          withdrawable_point = VALUES(withdrawable_point),
          shopping_point     = VALUES(shopping_point),
          updated_at         = CURRENT_TIMESTAMP
      `;
      await pool.query(sql, flat);
      updated += values.length;
    }
  }

  return { ok: true, updated };
}

async function rebuildMemberStats() {
  const [rows] = await pool.query(`SELECT id AS member_id FROM members`);
  const ids = rows.map(r => r.member_id);
  if (!ids.length) return { ok: true, updated: 0 };
  return upsertMemberStatsFor(ids, { truncate: true });
}

async function updateSingleMemberStats(member_id) {
  return upsertMemberStatsFor([Number(member_id)], { truncate: false });
}

if (require.main === module) {
  const arg = process.argv[2];
  (async () => {
    try {
      if (arg) {
        if (/^\d+$/.test(arg)) await updateSingleMemberStats(Number(arg));
        else if (arg === '--rebuild-all') await rebuildMemberStats();
        else console.log('Usage: node backend/services/updateMemberStats.cjs --rebuild-all | <member_id>');
      } else {
        await rebuildMemberStats();
      }
      process.exit(0);
    } catch (e) {
      console.error(e);
      process.exit(1);
    }
  })();
}

module.exports = { rebuildMemberStats, updateSingleMemberStats, upsertMemberStatsFor };
