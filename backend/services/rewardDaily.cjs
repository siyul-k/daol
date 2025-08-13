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
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function kstDateStr(date = new Date()) {
  const t = new Date(date.getTime() + 9 * 3600 * 1000);
  return t.toISOString().slice(0, 10);
}
function todayKST() { return kstDateStr(new Date()); }
function yesterdayKST() { return kstDateStr(new Date(Date.now() - 24 * 3600 * 1000)); }
function chunk(arr, n = 1000) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

/* ────────────────────────────────────────────────────────────────
 * 메인 정산
 * ──────────────────────────────────────────────────────────────── */
async function processDailyRewards() {
  try {
    // 1) 승인 구매 + 상위 1~5대
    const [products] = await connection.query(`
      SELECT 
        p.id AS purchase_id, p.member_id, p.pv, p.type, p.active, p.created_at,
        m.rec_1_id, m.rec_2_id, m.rec_3_id, m.rec_4_id, m.rec_5_id,
        m.is_reward_blocked
      FROM purchases p
      JOIN members m ON p.member_id = m.id
      WHERE p.status = 'approved'
      ORDER BY p.created_at ASC
    `);
    if (!products.length) {
      console.log('✅ 데일리/매칭: 정산대상 없음');
      return;
    }

    // 2) 데일리 수당률 (PV 기준)
    const [[rateRow]] = await connection.query(`
      SELECT rate FROM bonus_config
      WHERE reward_type = 'daily' AND level = 0
      ORDER BY updated_at DESC
      LIMIT 1
    `);
    let dailyRate = Number(rateRow?.rate ?? 0.01);
    if (dailyRate > 1) dailyRate /= 100;

    // 3) 매칭 수당률 (1~5대만)
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

    // 4) 오늘 이미 지급된 조합(중복방지)
    const [todayLogs] = await connection.query(`
      SELECT member_id, type, source, ref_id
      FROM rewards_log
      WHERE created_at >= CURDATE()
        AND created_at < DATE_ADD(CURDATE(), INTERVAL 1 DAY)
    `);
    const existsSet = new Set(todayLogs.map(r => `${r.member_id}_${r.type}_${r.source}_${r.ref_id}`));

    // 5) 관여 회원(본인 + 상위1~5대)
    const memberIds = [
      ...new Set(
        products
          .flatMap(p => [p.member_id, p.rec_1_id, p.rec_2_id, p.rec_3_id, p.rec_4_id, p.rec_5_id])
          .filter(Boolean)
      )
    ];

    // 6) 슬롯(구매별 잔여한도)
    const perPurchase = await getAllPurchasesRemaining(memberIds);
    const slotMap = buildSlotMap(perPurchase);

    // 7) 수당금지 캐시
    const blockMap = {};
    if (memberIds.length > 0) {
      const [mrows] = await connection.query(
        `SELECT id, is_reward_blocked
         FROM members
         WHERE id IN (${memberIds.map(() => '?').join(',')})`,
        memberIds
      );
      for (const r of mrows) {
        blockMap[r.id] = !!r.is_reward_blocked;
      }
    }

    // 8) INSERT 버퍼 & 출금가능포인트 누적
    const inserts = [];
    const addWithdrawMap = {};

    for (const p of products) {
      const {
        purchase_id, member_id, pv, type, active,
        rec_1_id, rec_2_id, rec_3_id, rec_4_id, rec_5_id
      } = p;

      // 데일리 지급
      const isDailyTarget = type === 'normal' || (type === 'bcode' && active === 1);
      if (isDailyTarget && !blockMap[member_id]) {
        const need = Math.floor(pv * dailyRate);
        const key = `${member_id}_daily_${member_id}_${purchase_id}`; // source=member_id, ref_id=purchase_id
        if (!existsSet.has(key)) {
          const { alloc, paid } = allocateFromSlots(slotMap, member_id, need);
          if (paid > 0) {
            inserts.push([member_id, 'daily', member_id, purchase_id, paid, '데일리수당', nowStr()]);
            addWithdrawMap[member_id] = (addWithdrawMap[member_id] || 0) + paid;
          } else {
            inserts.push([member_id, 'daily', member_id, purchase_id, 0, '한도초과(데일리)', nowStr()]);
          }
        }
      }

      // 매칭 지급 (레벨 고정, 구매일 조건 없음)
      if (type === 'normal') {
        const baseDaily = Math.floor(pv * dailyRate);
        const recs = [rec_1_id, rec_2_id, rec_3_id, rec_4_id, rec_5_id];

        for (let i = 0; i < 5; i++) {
          const recId = recs[i];
          const level = i + 1;
          const rate = matchRateMap[level];
          if (!rate || !recId) continue;

          const key = `${recId}_daily_matching_${member_id}_${purchase_id}`; // source=member_id, ref_id=purchase_id
          if (existsSet.has(key)) continue;

          if (blockMap[recId]) {
            inserts.push([recId, 'daily_matching', member_id, purchase_id, 0, `수당금지(매칭-${level}대)`, nowStr()]);
            existsSet.add(key);
            continue;
          }

          const need = Math.floor(baseDaily * rate);
          const { paid } = allocateFromSlots(slotMap, recId, need);
          if (paid > 0) {
            inserts.push([recId, 'daily_matching', member_id, purchase_id, paid, `데일리매칭-${level}대`, nowStr()]);
            addWithdrawMap[recId] = (addWithdrawMap[recId] || 0) + paid;
          } else {
            inserts.push([recId, 'daily_matching', member_id, purchase_id, 0, `한도초과(매칭-${level}대)`, nowStr()]);
          }
          existsSet.add(key);
        }
      }
    }

    // 9) 일괄 INSERT + 출금가능포인트 업데이트
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

    // 10) 요약/대시보드 갱신
    const y = yesterdayKST();
    const t = todayKST();

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
          total_amount = VALUES(total_amount),
          executed_date = VALUES(executed_date)
        `,
        [values]
      );
    }

    console.log(`✅ 데일리 + 매칭(레벨고정, 구매일 조건 제거, source/ref_id 구조 수정) 정산 완료`);
  } catch (err) {
    console.error('❌ 데일리 정산 실패:', err);
  }
}

module.exports = { processDailyRewards };
