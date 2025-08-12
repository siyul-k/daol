// ✅ 파일 경로: backend/services/rewardDaily.cjs

const connection = require('../db.cjs');
const { getAllPurchasesRemaining } = require('../utils/rewardLimit.cjs');

/* ────────────────────────────────────────────────────────────────
 * 공통 유틸
 * ──────────────────────────────────────────────────────────────── */
function buildSlotMap(perPurchase) {
  const map = new Map();
  for (const r of perPurchase) {
    if (!map.has(r.memberId)) map.set(r.memberId, []);
    map.get(r.memberId).push({ purchaseId: r.purchaseId, remaining: Number(r.remaining || 0) });
  }
  for (const arr of map.values()) arr.sort((a, b) => a.purchaseId - b.purchaseId);
  return map;
}

function allocateFromSlots(slotMap, memberId, amount) {
  const alloc = [];
  let rem = Math.max(0, Number(amount || 0));
  const slots = slotMap.get(memberId) || [];
  for (const s of slots) {
    if (rem <= 0) break;
    const cap = Math.max(0, Number(s.remaining || 0));
    if (cap <= 0) continue;
    const take = Math.min(rem, cap);
    if (take > 0) {
      alloc.push({ ref_id: s.purchaseId, amount: take });
      s.remaining = cap - take;
      rem -= take;
    }
  }
  return { alloc, paid: Number(amount) - rem, lack: rem };
}

function nowStr() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/* ────────────────────────────────────────────────────────────────
 * KST 날짜 유틸 (요약/대시보드 갱신용)
 * ──────────────────────────────────────────────────────────────── */
function kstDateStr(date = new Date()) {
  const t = new Date(date.getTime() + 9 * 3600 * 1000);
  return t.toISOString().slice(0, 10); // YYYY-MM-DD
}
function todayKST() { return kstDateStr(new Date()); }
function yesterdayKST() { return kstDateStr(new Date(Date.now() - 24 * 3600 * 1000)); }
function chunk(arr, n = 1000) { const out = []; for (let i=0;i<arr.length;i+=n) out.push(arr.slice(i,i+n)); return out; }

/* ────────────────────────────────────────────────────────────────
 * 메인 정산
 * ──────────────────────────────────────────────────────────────── */
async function processDailyRewards() {
  try {
    /* 1) 승인 구매 + 추천 1~5대 + 기준일 */
    const [products] = await connection.query(`
      SELECT 
        p.id AS purchase_id, p.member_id, p.pv, p.type, p.active, p.created_at,
        m.rec_1_id, m.rec_2_id, m.rec_3_id, m.rec_4_id, m.rec_5_id,
        m.first_purchase_at,
        m.is_reward_blocked
      FROM purchases p
      JOIN members m ON p.member_id = m.id
      WHERE p.status = 'approved'
      ORDER BY p.created_at ASC
    `);

    /* 2) 데일리 수당률 */
    const [[rateRow]] = await connection.query(`
      SELECT rate FROM bonus_config
      WHERE reward_type = 'daily' AND level = 0
      ORDER BY updated_at DESC
      LIMIT 1
    `);
    let dailyRate = Number(rateRow?.rate ?? 0.02);
    if (dailyRate > 1) dailyRate /= 100;

    /* 3) 매칭 수당률 (1~5대만) */
    const [matchingRows] = await connection.query(`
      SELECT level, rate FROM bonus_config
      WHERE reward_type = 'daily_matching' AND level BETWEEN 1 AND 5
      ORDER BY level ASC
    `);
    const matchRateMap = {};
    for (const row of matchingRows) {
      let r = Number(row.rate);
      if (r > 1) r /= 100;
      matchRateMap[row.level] = r;
    }

    /* 4) 오늘 이미 지급된 조합(중복방지) */
    const [todayLogs] = await connection.query(`
      SELECT member_id, type, source
      FROM rewards_log
      WHERE created_at >= CURDATE()
        AND created_at <  DATE_ADD(CURDATE(), INTERVAL 1 DAY)
    `);
    const existsSet = new Set(todayLogs.map(r => `${r.member_id}_${r.type}_${r.source}`));

    /* 5) 이번 런에서 관여하는 모든 회원(본인 + 상위1~5대) */
    const memberIds = [
      ...new Set(
        products.flatMap(p => [
          p.member_id, p.rec_1_id, p.rec_2_id, p.rec_3_id, p.rec_4_id, p.rec_5_id
        ]).filter(Boolean)
      )
    ];

    /* 6) 슬롯(구매별 잔여한도) */
    const perPurchase = await getAllPurchasesRemaining(memberIds);
    const slotMap = buildSlotMap(perPurchase);

    /* 7) 수당금지 캐시 */
    const blockMap = {};
    if (memberIds.length > 0) {
      const [blockRows] = await connection.query(
        `SELECT id, is_reward_blocked FROM members WHERE id IN (${memberIds.map(()=>'?').join(',')})`,
        memberIds
      );
      for (const r of blockRows) blockMap[r.id] = !!r.is_reward_blocked;
    }

    /* 8) 기준일 캐시 */
    const memberFirstAt = {};
    for (const p of products) memberFirstAt[p.member_id] = p.first_purchase_at;

    /* 9) INSERT 버퍼 & 출금가능포인트 누적 */
    const inserts = []; // [member_id, type, source(=purchase_id), ref_id, amount, memo, created_at]
    const addWithdrawMap = {}; // member_id -> sum(>0)

    for (const p of products) {
      const {
        purchase_id, member_id, pv, type, active, created_at,
        rec_1_id, rec_2_id, rec_3_id, rec_4_id, rec_5_id
      } = p;

      /* ─── ① 데일리: normal은 항상 / bcode는 active=1일 때만 ─── */
      const isDailyTarget = (type === 'normal') || (type === 'bcode' && active === 1);
      if (isDailyTarget && !blockMap[member_id]) {
        const need = Math.floor(pv * dailyRate);
        const key  = `${member_id}_daily_${purchase_id}`;
        if (!existsSet.has(key)) {
          const { alloc, paid } = allocateFromSlots(slotMap, member_id, need);
          if (paid > 0) {
            for (const a of alloc) {
              inserts.push([member_id, 'daily', purchase_id, a.ref_id, a.amount, '데일리수당', nowStr()]);
            }
            addWithdrawMap[member_id] = (addWithdrawMap[member_id] || 0) + paid;
          } else {
            inserts.push([member_id, 'daily', purchase_id, null, 0, '한도초과(데일리)', nowStr()]);
          }
        }
      }

      /* ─── ② 데일리 매칭: normal만, 상위 1~5대, 조상 기준일 이후 매출만 ─── */
      if (type === 'normal') {
        const recs = [rec_1_id, rec_2_id, rec_3_id, rec_4_id, rec_5_id];
        const baseDaily = Math.floor(pv * dailyRate);

        for (let i = 0; i < recs.length; i++) {
          const recId = recs[i];
          const level = i + 1;
          if (!recId || !matchRateMap[level]) continue;
          if (blockMap[recId]) continue;

          const ancestorFirst = memberFirstAt[recId];
          if (!ancestorFirst) continue;
          if (new Date(created_at) < new Date(ancestorFirst)) continue;

          const need = Math.floor(baseDaily * matchRateMap[level]);
          const key  = `${recId}_daily_matching_${purchase_id}`;
          if (existsSet.has(key)) continue;

          const { alloc, paid } = allocateFromSlots(slotMap, recId, need);
          if (paid > 0) {
            for (const a of alloc) {
              inserts.push([recId, 'daily_matching', purchase_id, a.ref_id, a.amount, `데일리매칭-${level}대`, nowStr()]);
            }
            addWithdrawMap[recId] = (addWithdrawMap[recId] || 0) + paid;
          } else {
            inserts.push([recId, 'daily_matching', purchase_id, null, 0, `한도초과(매칭-${level}대)`, nowStr()]);
          }
        }
      }
    }

    /* 10) 일괄 INSERT + 출금가능포인트(>0만) 업데이트 */
    if (inserts.length > 0) {
      await connection.query(
        `INSERT IGNORE INTO rewards_log (member_id, type, source, ref_id, amount, memo, created_at)
         VALUES ?`,
        [inserts]
      );

      for (const id of Object.keys(addWithdrawMap)) {
        const sum = addWithdrawMap[id];
        if (sum > 0) {
          await connection.query(
            'UPDATE members SET withdrawable_point = withdrawable_point + ? WHERE id = ?',
            [sum, id]
          );
        }
      }
    }

    /* ────────────────────────────────────────────────────────────
     * ✅ 여기서 "단 한 번만" 요약/대시보드 갱신
     *  - reward_daily_summary: 어제/오늘(KST) 총합을 정확값으로 덮어쓰기(멱등)
     *  - member_stats: 어제/오늘에 로그가 있었던 회원만 스냅샷으로 재계산(멱등)
     * ──────────────────────────────────────────────────────────── */
    const y = yesterdayKST();
    const t = todayKST();

    // 10-1) reward_daily_summary (어제/오늘)
    const [sumRows] = await connection.query(
      `
      SELECT member_id, reward_date, type, SUM(amount) AS total_amount
        FROM rewards_log
       WHERE is_deleted = 0
         AND reward_date IN (?, ?)
       GROUP BY member_id, reward_date, type
      `,
      [y, t]
    );
    if (sumRows.length) {
      const execDate = t;
      const values = sumRows.map(r => [
        r.member_id, r.reward_date, r.type, Number(r.total_amount || 0), execDate
      ]);
      await connection.query(
        `
        INSERT INTO reward_daily_summary
          (member_id, reward_date, type, total_amount, executed_date)
        VALUES ?
        ON DUPLICATE KEY UPDATE
          total_amount  = VALUES(total_amount),
          executed_date = VALUES(executed_date)
        `,
        [values]
      );
    }

    // 10-2) member_stats (어제/오늘에 로그가 있었던 회원만)
    const [affRows] = await connection.query(
      `
      SELECT DISTINCT member_id
        FROM rewards_log
       WHERE is_deleted = 0
         AND reward_date IN (?, ?)
      `,
      [y, t]
    );
    const ids = affRows.map(r => r.member_id);
    for (const batch of chunk(ids, 1000)) {
      // 승인 패키지 '합산 금액'
      const [pkgRows] = await connection.query(
        `
        SELECT member_id, IFNULL(SUM(amount),0) AS amt
          FROM purchases
         WHERE status='approved'
           AND member_id IN (${batch.map(()=>'?').join(',')})
         GROUP BY member_id
        `,
        batch
      );
      const pkgMap = Object.fromEntries(pkgRows.map(r => [r.member_id, Number(r.amt)]));

      // 입금/출금(완료)
      const [depRows] = await connection.query(
        `
        SELECT member_id, IFNULL(SUM(amount),0) AS total
          FROM deposit_requests
         WHERE status='완료'
           AND member_id IN (${batch.map(()=>'?').join(',')})
         GROUP BY member_id
        `,
        batch
      );
      const depMap = Object.fromEntries(depRows.map(r => [r.member_id, Number(r.total)]));

      const [wdRows] = await connection.query(
   `
   SELECT member_id, IFNULL(SUM(amount),0) AS total
     FROM withdraw_requests
    WHERE status IN ('요청','완료','requested','completed')
      AND member_id IN (${batch.map(()=>'?').join(',')})
    GROUP BY member_id
   `,
   batch
 );
      const wdMap = Object.fromEntries(wdRows.map(r => [r.member_id, Number(r.total)]));

      // 받은 수당 전체 합계
      const [rwRows] = await connection.query(
        `
        SELECT member_id, IFNULL(SUM(amount),0) AS total
          FROM rewards_log
         WHERE is_deleted = 0
           AND member_id IN (${batch.map(()=>'?').join(',')})
         GROUP BY member_id
        `,
        batch
      );
      const rwMap = Object.fromEntries(rwRows.map(r => [r.member_id, Number(r.total)]));

      // 현재 포인트
      const [ptRows] = await connection.query(
        `
        SELECT id AS member_id, withdrawable_point, shopping_point
          FROM members
         WHERE id IN (${batch.map(()=>'?').join(',')})
        `,
        batch
      );
      const ptMap = Object.fromEntries(
        ptRows.map(r => [r.member_id, { w: Number(r.withdrawable_point), s: Number(r.shopping_point) }])
      );

      const values = batch.map(id => [
        id,
        pkgMap[id] || 0,
        depMap[id] || 0,
        rwMap[id] || 0,
        wdMap[id] || 0,
        ptMap[id]?.w || 0,
        ptMap[id]?.s || 0
      ]);

      if (values.length) {
        await connection.query(
          `
          INSERT INTO member_stats
            (member_id, packages_amount, total_deposit, total_reward, total_withdraw, withdrawable_point, shopping_point)
          VALUES ?
          ON DUPLICATE KEY UPDATE
            packages_amount    = VALUES(packages_amount),
            total_deposit      = VALUES(total_deposit),
            total_reward       = VALUES(total_reward),
            total_withdraw     = VALUES(total_withdraw),
            withdrawable_point = VALUES(withdrawable_point),
            shopping_point     = VALUES(shopping_point)
          `,
          [values]
        );
      }
    }

    console.log(`✅ 데일리 + 매칭(1~5대) 정산 완료 & 요약/대시보드 갱신 완료`);
  } catch (err) {
    console.error('❌ 데일리 정산 실패:', err);
  }
}

module.exports = { processDailyRewards };
