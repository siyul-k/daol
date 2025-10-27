// ✅ 파일: backend/utils/rewardLimit.cjs
const connection = require('../db.cjs');

/* ────────────────────────────────────────────────────────────────
 *  한도 계산 / 슬롯 관리 유틸
 *    - 한도 기준: 회원 단위 (모든 구매의 합)
 *    - 차감 순서: 오래된 구매부터 FIFO
 *    - ref_id는 한도 차감 기준이 아닌 “발생 출처” 표시용
 *    - 센터 계열은 한도 계산에 포함하지 않음
 * ──────────────────────────────────────────────────────────────── */

const COUNTED_TYPES = ['daily', 'daily_matching', 'sponsor']; // 센터는 제외

// 한도배율(정책)
const RATE_NORMAL_WITH_DOWNLINE = 2.5; // 추천인 있음
const RATE_NORMAL_ALONE        = 2.0; // 추천인 없음
const RATE_BCODE               = 1.0; // bcode는 100%

// 숨김 adjust (is_deleted=1) 선소진 옵션
const APPLY_HIDDEN_ADJUST_FALLBACK = true;
const CUTOFF_DATE = null;

// 유틸
function placeholders(n) {
  return Array.from({ length: n }, () => '?').join(',');
}

/** 직추천 normal 보유자 여부 */
async function hasRecommendedUserWithNormalProduct(memberId) {
  try {
    const [rows] = await connection.query(
      `SELECT 1
         FROM members m
         JOIN purchases p ON m.id = p.member_id
        WHERE m.recommender_id = ?
          AND p.type='normal' AND p.status='approved'
        LIMIT 1`,
      [memberId]
    );
    return rows.length > 0;
  } catch (err) {
    console.error('❌ 추천 하위 normal 상품 검사 오류:', err);
    return false;
  }
}

/** 단일 회원: 전체 구매 기준으로 남은 한도 슬롯 (FIFO) */
async function getPurchasesWithRemaining(memberId) {
  const [[member]] = await connection.query(
    `SELECT id FROM members WHERE id=? AND is_blacklisted=0`,
    [memberId]
  );
  if (!member) return [];

  // 모든 승인 구매
  const [purchases] = await connection.query(
    `SELECT id AS purchaseId, pv, type, created_at
       FROM purchases
      WHERE member_id=? AND status='approved'
      ORDER BY created_at ASC, id ASC`,
    [memberId]
  );
  if (!purchases.length) return [];

  const hasDownline = await hasRecommendedUserWithNormalProduct(memberId);

  // 각 구매별 한도 (회원 전체 한도 계산용)
  const slots = purchases.map(({ purchaseId, pv, type }) => {
    const rate =
      type === 'normal'
        ? (hasDownline ? RATE_NORMAL_WITH_DOWNLINE : RATE_NORMAL_ALONE)
        : RATE_BCODE;
    return { purchaseId, max: pv * rate, used: 0 };
  });

  // ✅ 회원 단위로 이미 지급된 금액 합산 (daily, matching, sponsor)
  const [usedRows] = await connection.query(
    `SELECT member_id, COALESCE(SUM(amount),0) AS used
       FROM rewards_log
      WHERE member_id = ?
        AND type IN (${placeholders(COUNTED_TYPES.length)})
        AND (is_deleted IS NULL OR is_deleted = 0)
      GROUP BY member_id`,
    [memberId, ...COUNTED_TYPES]
  );
  const usedTotal = usedRows[0] ? Number(usedRows[0].used) : 0;

  // 숨김 adjust (is_deleted=1, ref_id 없음) 폴백
  let hiddenAdj = 0;
  if (APPLY_HIDDEN_ADJUST_FALLBACK) {
    const params = [memberId];
    let cutoffSql = '';
    if (CUTOFF_DATE) {
      cutoffSql = ' AND created_at >= ?';
      params.push(CUTOFF_DATE);
    }
    const [[adj]] = await connection.query(
      `SELECT COALESCE(SUM(amount),0) AS total
         FROM rewards_log
        WHERE member_id=?
          AND type='adjust'
          AND (ref_id IS NULL OR ref_id=0)
          AND is_deleted=1${cutoffSql}`,
      params
    );
    hiddenAdj = Math.max(0, Number(adj?.total || 0));
  }

  // 총 한도 (회원 전체 기준)
  const totalMax = slots.reduce((sum, s) => sum + s.max, 0);
  let remainingTotal = Math.max(0, totalMax - usedTotal - hiddenAdj);

  // FIFO: 오래된 상품부터 잔여 소진
  const remain = [];
  for (const s of slots) {
    if (remainingTotal <= 0) {
      remain.push({ purchaseId: s.purchaseId, remaining: 0 });
      continue;
    }
    const take = Math.min(remainingTotal, s.max);
    remain.push({ purchaseId: s.purchaseId, remaining: take });
    remainingTotal -= take;
  }

  return remain;
}

/** 여러 회원의 구매별 남은 한도 (회원 단위 합산 + FIFO 분배) */
async function getAllPurchasesRemaining(memberIds) {
  if (!Array.isArray(memberIds) || !memberIds.length) return [];

  const [members] = await connection.query(
    `SELECT id FROM members
      WHERE id IN (${placeholders(memberIds.length)})
        AND is_blacklisted=0`,
    memberIds
  );
  if (!members.length) return [];
  const activeIds = members.map(m => m.id);

  // 승인 구매 (회원별로 그룹화)
  const [pRows] = await connection.query(
    `SELECT member_id AS memberId, id AS purchaseId, pv, type, created_at
       FROM purchases
      WHERE member_id IN (${placeholders(activeIds.length)})
        AND status='approved'
      ORDER BY member_id ASC, created_at ASC, id ASC`,
    activeIds
  );
  if (!pRows.length) return [];

  // 직추천 normal 보유 여부
  const [recRows] = await connection.query(
    `SELECT m.recommender_id AS memberId, COUNT(*) AS cnt
       FROM members m
       JOIN purchases p ON m.id = p.member_id
      WHERE m.recommender_id IN (${placeholders(activeIds.length)})
        AND p.type='normal' AND p.status='approved'
      GROUP BY m.recommender_id`,
    activeIds
  );
  const hasDownlineMap = {};
  for (const r of recRows) hasDownlineMap[r.memberId] = r.cnt > 0;

  // 회원별 구매 목록
  const perMemberPurchases = {};
  for (const row of pRows) {
    if (!perMemberPurchases[row.memberId]) perMemberPurchases[row.memberId] = [];
    perMemberPurchases[row.memberId].push(row);
  }

  // ✅ 회원 단위 사용액 합산
  const [usedRows] = await connection.query(
    `SELECT member_id, COALESCE(SUM(amount),0) AS used
       FROM rewards_log
      WHERE member_id IN (${placeholders(activeIds.length)})
        AND type IN (${placeholders(COUNTED_TYPES.length)})
        AND (is_deleted IS NULL OR is_deleted=0)
      GROUP BY member_id`,
    [...activeIds, ...COUNTED_TYPES]
  );
  const usedMap = Object.fromEntries(usedRows.map(r => [r.member_id, Number(r.used)]));

  // 숨김 adjust 합산
  let hiddenAdjMap = {};
  if (APPLY_HIDDEN_ADJUST_FALLBACK) {
    const params = [...activeIds];
    let cutoffSql = '';
    if (CUTOFF_DATE) {
      cutoffSql = ' AND created_at >= ?';
      params.push(CUTOFF_DATE);
    }
    const [aRows] = await connection.query(
      `SELECT member_id, COALESCE(SUM(amount),0) AS total
         FROM rewards_log
        WHERE member_id IN (${placeholders(activeIds.length)})
          AND type='adjust'
          AND (ref_id IS NULL OR ref_id=0)
          AND is_deleted=1${cutoffSql}
        GROUP BY member_id`,
      params
    );
    hiddenAdjMap = Object.fromEntries(
      aRows.map(r => [r.member_id, Math.max(0, Number(r.total || 0))])
    );
  }

  // FIFO 계산
  const out = [];
  for (const memberId of activeIds) {
    const list = perMemberPurchases[memberId] || [];
    const hasDownline = !!hasDownlineMap[memberId];
    const usedTotal = usedMap[memberId] || 0;
    const hiddenAdj = hiddenAdjMap[memberId] || 0;

    const totalMax = list.reduce((sum, s) => {
      const rate =
        s.type === 'normal'
          ? (hasDownline ? RATE_NORMAL_WITH_DOWNLINE : RATE_NORMAL_ALONE)
          : RATE_BCODE;
      return sum + s.pv * rate;
    }, 0);

    let remainingTotal = Math.max(0, totalMax - usedTotal - hiddenAdj);

    for (const { purchaseId, pv, type } of list) {
      if (remainingTotal <= 0) {
        out.push({ memberId, purchaseId, remaining: 0 });
        continue;
      }
      const rate =
        type === 'normal'
          ? (hasDownline ? RATE_NORMAL_WITH_DOWNLINE : RATE_NORMAL_ALONE)
          : RATE_BCODE;
      const cap = pv * rate;
      const take = Math.min(remainingTotal, cap);
      out.push({ memberId, purchaseId, remaining: take });
      remainingTotal -= take;
    }
  }

  return out;
}

/** 단일 회원: 총 한도 잔여액 */
async function getAvailableRewardAmount(memberId) {
  try {
    const slots = await getPurchasesWithRemaining(memberId);
    return slots.reduce((sum, s) => sum + s.remaining, 0);
  } catch (err) {
    console.error('❌ 한도 계산 오류:', err);
    return 0;
  }
}

/** username 기준 한도 잔여액 */
async function getAvailableRewardAmountByUsername(username) {
  try {
    const [[row]] = await connection.query(
      `SELECT id FROM members WHERE username=? AND is_blacklisted=0 LIMIT 1`,
      [username]
    );
    if (!row) return 0;
    return await getAvailableRewardAmount(row.id);
  } catch (err) {
    console.error('❌ username 기반 한도계산 오류:', err);
    return 0;
  }
}

/** 여러 회원 한도 잔여액 맵 */
async function getAvailableRewardAmountByMemberIds(memberIds) {
  if (!Array.isArray(memberIds) || !memberIds.length) return {};
  const perPurchase = await getAllPurchasesRemaining(memberIds);
  const map = {};
  for (const r of perPurchase) {
    map[r.memberId] = (map[r.memberId] || 0) + r.remaining;
  }
  return map;
}

module.exports = {
  hasRecommendedUserWithNormalProduct,
  getPurchasesWithRemaining,
  getAllPurchasesRemaining,
  getAvailableRewardAmount,
  getAvailableRewardAmountByUsername,
  getAvailableRewardAmountByMemberIds,
  COUNTED_TYPES,
  RATE_NORMAL_WITH_DOWNLINE,
  RATE_NORMAL_ALONE,
  RATE_BCODE,
  APPLY_HIDDEN_ADJUST_FALLBACK,
  CUTOFF_DATE,
};
