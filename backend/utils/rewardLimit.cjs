// ✅ 파일 위치: backend/utils/rewardLimit.cjs
const connection = require('../db.cjs');

/** 한도 집계에 포함되는 리워드 타입 */
const COUNTED_TYPES = ['daily', 'daily_matching', 'recommend'];

/** 한도 배율(정책) */
const RATE_NORMAL_WITH_DOWNLINE = 2.5; // 직추천 normal 보유 시 250%
const RATE_NORMAL_ALONE        = 2.0;  // 미보유 시 200%
const RATE_BCODE               = 1.0;  // bcode는 항상 100%

/** 레거시 폴백: ref_id 없는 숨김 adjust를 슬롯에서 선소진 */
const APPLY_HIDDEN_ADJUST_FALLBACK = true;
// 필요 시 컷오프를 켤 수 있습니다. 예: '2025-07-27 09:00:00' (미사용 시 null)
const CUTOFF_DATE = null;

function placeholders(n) {
  return Array.from({ length: n }, () => '?').join(',');
}

/** 직추천 중 normal 보유자 존재 여부 */
async function hasRecommendedUserWithNormalProduct(memberId) {
  try {
    const [rows] = await connection.query(
      `SELECT 1
         FROM members m
         JOIN purchases p ON m.id = p.member_id
        WHERE m.recommender_id = ?
          AND p.type   = 'normal'
          AND p.status = 'approved'
        LIMIT 1`,
      [memberId]
    );
    return rows.length > 0;
  } catch (err) {
    console.error('❌ 추천 하위 기본상품 검사 오류:', err);
    return false;
  }
}

/** 단일 회원: 구매별 남은 한도 슬롯 */
async function getPurchasesWithRemaining(memberId) {
  // 블랙리스트 제외
  const [[member]] = await connection.query(
    `SELECT id FROM members WHERE id = ? AND is_blacklisted = 0`,
    [memberId]
  );
  if (!member) return [];

  // 승인 구매 (오래된 순)
  const [purchases] = await connection.query(
    `SELECT id AS purchaseId, pv, type, created_at
       FROM purchases
      WHERE member_id = ?
        AND status = 'approved'
      ORDER BY created_at ASC, id ASC`,
    [memberId]
  );
  if (!purchases.length) return [];

  const hasDownline = await hasRecommendedUserWithNormalProduct(memberId);

  // 구매별 상한
  const slots = purchases.map(({ purchaseId, pv, type }) => {
    const rate =
      type === 'normal'
        ? (hasDownline ? RATE_NORMAL_WITH_DOWNLINE : RATE_NORMAL_ALONE)
        : RATE_BCODE;
    return { purchaseId, max: pv * rate, used: 0 };
  });

  // 구매별 사용액(= ref_id로 귀속된 지급 합계)
  const purchaseIds = purchases.map(p => p.purchaseId);
  const usedMap = {};
  if (purchaseIds.length) {
    const params = [...purchaseIds, ...COUNTED_TYPES];
    const [rows] = await connection.query(
      `SELECT ref_id AS purchaseId, COALESCE(SUM(amount),0) AS used
         FROM rewards_log
        WHERE ref_id IN (${placeholders(purchaseIds.length)})
          AND type   IN (${placeholders(COUNTED_TYPES.length)})
          AND (is_deleted IS NULL OR is_deleted = 0)
        GROUP BY ref_id`,
      params
    );
    for (const r of rows) usedMap[r.purchaseId] = Number(r.used) || 0;
  }

  // 기본 남은액
  const remain = slots.map(s => ({
    purchaseId: s.purchaseId,
    remaining: Math.max(0, s.max - (usedMap[s.purchaseId] || 0)),
  }));

  // 🔁 레거시 폴백: ref_id 없는 숨김 adjust(=is_deleted=1)를 오래된 슬롯부터 소진
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
        WHERE member_id = ?
          AND type='adjust'
          AND (ref_id IS NULL OR ref_id = 0)
          AND is_deleted = 1${cutoffSql}`,
      params
    );
    let hiddenAdj = Math.max(0, Number(adj?.total || 0)); // 음수는 폴백에서 무시

    if (hiddenAdj > 0) {
      for (const r of remain) {
        if (hiddenAdj <= 0) break;
        const take = Math.min(hiddenAdj, r.remaining);
        if (take > 0) {
          r.remaining -= take;
          hiddenAdj   -= take;
        }
      }
    }
  }

  return remain;
}

/** 배치: 여러 회원의 구매별 남은 한도 */
async function getAllPurchasesRemaining(memberIds) {
  if (!Array.isArray(memberIds) || !memberIds.length) return [];

  // 블랙리스트 제외
  const [members] = await connection.query(
    `SELECT id FROM members
      WHERE id IN (${placeholders(memberIds.length)})
        AND is_blacklisted = 0`,
    memberIds
  );
  if (!members.length) return [];
  const activeIds = members.map(m => m.id);

  // 승인 구매
  const [pRows] = await connection.query(
    `SELECT member_id AS memberId, id AS purchaseId, pv, type, created_at
       FROM purchases
      WHERE member_id IN (${placeholders(activeIds.length)})
        AND status = 'approved'
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
        AND p.type   = 'normal'
        AND p.status = 'approved'
      GROUP BY m.recommender_id`,
    activeIds
  );
  const hasDownlineMap = {};
  for (const r of recRows) hasDownlineMap[r.memberId] = r.cnt > 0;

  // 구매별 상한
  const perMemberPurchases = {};
  for (const row of pRows) {
    if (!perMemberPurchases[row.memberId]) perMemberPurchases[row.memberId] = [];
    perMemberPurchases[row.memberId].push(row);
  }

  const allPurchaseIds = pRows.map(r => r.purchaseId);

  // 구매별 사용액(= ref_id 귀속 지급 합계)
  const usedByPurchase = {};
  if (allPurchaseIds.length) {
    const params = [...allPurchaseIds, ...COUNTED_TYPES];
    const [rows] = await connection.query(
      `SELECT ref_id AS purchaseId, COALESCE(SUM(amount),0) AS used
         FROM rewards_log
        WHERE ref_id IN (${placeholders(allPurchaseIds.length)})
          AND type   IN (${placeholders(COUNTED_TYPES.length)})
          AND (is_deleted IS NULL OR is_deleted = 0)
        GROUP BY ref_id`,
      params
    );
    for (const r of rows) usedByPurchase[r.purchaseId] = Number(r.used) || 0;
  }

  // 레거시 숨김 adjust 합계(회원별, ref_id 없음)
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
          AND (ref_id IS NULL OR ref_id = 0)
          AND is_deleted = 1${cutoffSql}
        GROUP BY member_id`,
      params
    );
    hiddenAdjMap = Object.fromEntries(
      aRows.map(r => [r.member_id, Math.max(0, Number(r.total || 0))])
    );
  }

  // 남은액 산출 (오래된 구매부터 숨김 adjust 차감)
  const out = [];
  for (const memberId of activeIds) {
    const list = perMemberPurchases[memberId] || [];
    const hasDownline = !!hasDownlineMap[memberId];
    let hiddenAdj = hiddenAdjMap[memberId] || 0;

    for (const { purchaseId, pv, type } of list) {
      const rate =
        type === 'normal'
          ? (hasDownline ? RATE_NORMAL_WITH_DOWNLINE : RATE_NORMAL_ALONE)
          : RATE_BCODE;
      const max  = pv * rate;
      const used = usedByPurchase[purchaseId] || 0;
      let remaining = Math.max(0, max - used);

      if (APPLY_HIDDEN_ADJUST_FALLBACK && hiddenAdj > 0) {
        const take = Math.min(hiddenAdj, remaining);
        if (take > 0) {
          remaining -= take;
          hiddenAdj -= take;
        }
      }

      out.push({ memberId, purchaseId, remaining });
    }
  }
  return out;
}

/** 데일리 슬롯 수: 남은액 ≥ dailyAmount 인 슬롯 개수 */
async function getDailySlots(memberId, dailyAmount = 10) {
  const slots = await getPurchasesWithRemaining(memberId);
  return slots.filter(s => s.remaining >= dailyAmount).length;
}

/** 총 한도 잔여액(단일): 슬롯 합계 */
async function getAvailableRewardAmount(memberId) {
  try {
    const slots = await getPurchasesWithRemaining(memberId);
    return slots.reduce((sum, s) => sum + s.remaining, 0);
  } catch (err) {
    console.error('❌ 수당한도 계산 오류:', err);
    return 0;
  }
}

/** username으로 총 한도 잔여액 */
async function getAvailableRewardAmountByUsername(username) {
  try {
    const [[row]] = await connection.query(
      `SELECT id FROM members WHERE username = ? AND is_blacklisted = 0 LIMIT 1`,
      [username]
    );
    if (!row) return 0;
    return await getAvailableRewardAmount(row.id);
  } catch (err) {
    console.error('❌ username 기반 한도계산 오류:', err);
    return 0;
  }
}

/** 여러 회원 총 한도(배치): 구매별 잔여 합산 */
async function getAvailableRewardAmountByMemberIds(memberIds) {
  if (!Array.isArray(memberIds) || memberIds.length === 0) return {};
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
  getDailySlots,
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
