// ✅ 파일 경로: backend/services/rewardDaily.cjs
console.log('[DEBUG] rewardDaily.cjs loaded from', __filename);

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
  return t.toISOString().slice(0, 10); // YYYY-MM-DD
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
async function processDailyRewards(forcedDate) {
  try {
    const rewardDate = forcedDate || todayKST();   // 날짜 지정 가능
    const createdAt  = nowStr();

    // ─── 0) 요일 체크 ───
    const [rows] = await connection.query(`
      SELECT value FROM settings WHERE key_name = 'reward_days' LIMIT 1
    `);
    if (rows.length) {
      const allowedDays = rows[0].value.split(',').map(s => s.trim().toLowerCase());
      const dayNames = ['sun','mon','tue','wed','thu','fri','sat'];
      const todayName = dayNames[new Date(rewardDate).getDay()];

      if (!allowedDays.includes(todayName)) {
        console.log(`ℹ️ ${rewardDate} (${todayName}) → 설정된 요일 아님, 데일리 정산 스킵`);
        return;
      }
    }

    // 1) 승인 구매 + 상위 1~15대
    const [products] = await connection.query(`
      SELECT 
        p.id AS purchase_id, p.member_id, p.pv, p.type, p.active, p.created_at,
        m.rec_1_id, m.rec_2_id, m.rec_3_id, m.rec_4_id, m.rec_5_id,
        m.rec_6_id, m.rec_7_id, m.rec_8_id, m.rec_9_id, m.rec_10_id,
        m.rec_11_id, m.rec_12_id, m.rec_13_id, m.rec_14_id, m.rec_15_id,
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

    // 3) 매칭 수당률 (1~15대)
    const [matchingRows] = await connection.query(`
      SELECT level, rate FROM bonus_config
      WHERE reward_type = 'daily_matching' AND level BETWEEN 1 AND 15
      ORDER BY level ASC
    `);
    const matchRateMap = {};
    for (const row of matchingRows) {
      let r = Number(row.rate);
      if (r > 1) r /= 100;
      matchRateMap[row.level] = r;
    }

    // 4) 오늘 이미 지급된 조합(중복방지) - reward_date 기준
    const [todayLogs] = await connection.query(`
      SELECT member_id, type, source, ref_id
      FROM rewards_log
      WHERE reward_date = ?
    `, [rewardDate]);
    const existsSet = new Set(todayLogs.map(r => `${r.member_id}_${r.type}_${r.source}_${r.ref_id}`));

    // 5) 관여 회원(본인 + 상위1~15대)
    const memberIds = [
      ...new Set(
        products
          .flatMap(p => [
            p.member_id,
            p.rec_1_id, p.rec_2_id, p.rec_3_id, p.rec_4_id, p.rec_5_id,
            p.rec_6_id, p.rec_7_id, p.rec_8_id, p.rec_9_id, p.rec_10_id,
            p.rec_11_id, p.rec_12_id, p.rec_13_id, p.rec_14_id, p.rec_15_id
          ])
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
      for (const r of mrows) blockMap[r.id] = !!r.is_reward_blocked;
    }

    // 8) INSERT 버퍼 & 출금가능포인트 누적
    const inserts = [];
    const addWithdrawMap = {};

    for (const p of products) {
      const {
        purchase_id, member_id, pv, type, active,
        rec_1_id, rec_2_id, rec_3_id, rec_4_id, rec_5_id,
        rec_6_id, rec_7_id, rec_8_id, rec_9_id, rec_10_id,
        rec_11_id, rec_12_id, rec_13_id, rec_14_id, rec_15_id
      } = p;

      // 데일리 지급
      const isDailyTarget = type === 'normal' || (type === 'bcode' && active === 1);
      if (isDailyTarget && !blockMap[member_id]) {
        const need = Math.floor(pv * dailyRate);
        const key  = `${member_id}_daily_${member_id}_${purchase_id}`;
        if (!existsSet.has(key)) {
          const { paid } = allocateFromSlots(slotMap, member_id, need);
          if (paid > 0) {
            inserts.push([member_id, 'daily', member_id, purchase_id, paid, '데일리', rewardDate, createdAt, 0]);
            addWithdrawMap[member_id] = (addWithdrawMap[member_id] || 0) + paid;
          } else {
            inserts.push([member_id, 'daily', member_id, purchase_id, 0, '한도초과(데일리)', rewardDate, createdAt, 0]);
          }
          existsSet.add(key);
        }
      }

      // 매칭 지급 (레벨 확장 / normal만)
      if (type === 'normal') {
        const baseDaily = Math.floor(pv * dailyRate);
        const recs = [
          rec_1_id, rec_2_id, rec_3_id, rec_4_id, rec_5_id,
          rec_6_id, rec_7_id, rec_8_id, rec_9_id, rec_10_id,
          rec_11_id, rec_12_id, rec_13_id, rec_14_id, rec_15_id
        ];

        for (let i = 0; i < 15; i++) {
          const recId = recs[i];
          const level = i + 1;
          const rate = matchRateMap[level];
          if (!rate || !recId) continue;

          const key = `${recId}_daily_matching_${member_id}_${purchase_id}`;
          if (existsSet.has(key)) continue;

          if (blockMap[recId]) {
            inserts.push([recId, 'daily_matching', member_id, purchase_id, 0, `수당금지(매칭-${level}대)`, rewardDate, createdAt, 0]);
            existsSet.add(key);
            continue;
          }

          const need = Math.floor(baseDaily * rate);
          const { paid } = allocateFromSlots(slotMap, recId, need);
          if (paid > 0) {
            inserts.push([recId, 'daily_matching', member_id, purchase_id, paid, `데일리매칭-${level}대`, rewardDate, createdAt, 0]);
            addWithdrawMap[recId] = (addWithdrawMap[recId] || 0) + paid;
          } else {
            inserts.push([recId, 'daily_matching', member_id, purchase_id, 0, `한도초과(매칭-${level}대)`, rewardDate, createdAt, 0]);
          }
          existsSet.add(key);
        }
      }
    }

    // 9) 일괄 INSERT + 출금가능포인트 업데이트
    if (inserts.length > 0) {
      await connection.query(
        `INSERT IGNORE INTO rewards_log
         (member_id, type, source, ref_id, amount, memo, reward_date, created_at, need_guard)
         VALUES ?`,
        [inserts]
      );
      console.log(`📝 rewards_log insert: ${inserts.length} rows (reward_date=${rewardDate})`);

      for (const id of Object.keys(addWithdrawMap)) {
        const sum = addWithdrawMap[id];
        if (sum > 0) {
          await connection.query(
            'UPDATE members SET withdrawable_point = withdrawable_point + ? WHERE id = ?',
            [sum, id]
          );
        }
      }
    } else {
      console.log(`ℹ️ ${rewardDate} 신규 지급 없음 (모두 중복 또는 한도초과)`);
    }

    // 10) 요약/대시보드 갱신
    const y = yesterdayKST();
    const t = rewardDate;

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

    console.log(`✅ 데일리 + 매칭 정산 완료 (reward_date=${rewardDate})`);
  } catch (err) {
    console.error('❌ 데일리 정산 실패:', err);
  }
}

module.exports = { processDailyRewards };

/* ────────────────────────────────────────────────────────────────
 * CLI 단발 실행 지원
 * ──────────────────────────────────────────────────────────────── */
if (require.main === module) {
  (async () => {
    const dateArg = process.argv[2] || null;
    try {
      console.log(`▶ 수동 실행: 데일리 정산 (date=${dateArg || '오늘'})`);
      await processDailyRewards(dateArg);
      console.log('✅ 수동 실행 완료 (데일리)');
    } catch (err) {
      console.error('❌ 단발 실행 에러:', err);
      process.exit(1);
    } finally {
      process.exit(0);
    }
  })();
}
