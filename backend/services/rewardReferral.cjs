// ✅ 파일 경로: backend/services/rewardReferral.cjs
const connection = require('../db.cjs');
const { getPurchasesWithRemaining } = require('../utils/rewardLimit.cjs');

const toKRW = (n) => Math.max(0, Math.floor(Number(n) || 0));

// 구매건별 FIFO 한도 분배 (현재는 추천수당 폐지 상태, 추후 필요 시 사용 가능)
async function allocateRecommendFIFOOnce(memberId, amount) {
  const slots = await getPurchasesWithRemaining(memberId); 
  const alloc = [];
  let rem = toKRW(amount);

  for (const s of slots) {
    if (rem <= 0) break;
    const cap = toKRW(s.remaining);
    if (cap <= 0) continue;
    const take = Math.min(rem, cap);
    if (take > 0) {
      alloc.push({ ref_id: s.purchaseId, amount: take });
      rem -= take;
    }
  }
  return { alloc, paid: toKRW(amount) - rem, lack: rem };
}

const availCache = new Map();
async function hasAnyAvailable(memberId) {
  if (availCache.has(memberId)) return availCache.get(memberId);
  const slots = await getPurchasesWithRemaining(memberId);
  const sum = slots.reduce((a, b) => a + (Number(b.remaining) || 0), 0);
  const ok = sum > 0;
  availCache.set(memberId, ok);
  return ok;
}

async function processReferralRewards() {
  try {
    const [bonusRows] = await connection.query(`
      SELECT reward_type, level, rate
      FROM bonus_config
      WHERE reward_type IN ('center', 'center_recommend') AND level = 0
    `);
    const centerRate    = Number(bonusRows.find(r => r.reward_type === 'center')?.rate ?? 0.03);
    const centerRecRate = Number(bonusRows.find(r => r.reward_type === 'center_recommend')?.rate ?? 0.01);

    // ✅ 날짜 조건 제거 → 미정산된 승인 normal 구매건만 정산
    const [rows] = await connection.query(`
      SELECT p.id AS purchase_id, p.member_id, p.pv, m.center_id
      FROM purchases p
      JOIN members m ON p.member_id = m.id
      WHERE p.status = 'approved'
        AND p.type   = 'normal'
        AND p.id NOT IN (
          SELECT DISTINCT ref_id
          FROM rewards_log
          WHERE type IN ('center','center_recommend')
        )
      ORDER BY p.created_at ASC
    `);

    if (!rows.length) {
      console.log(`[정산대상 없음] 미지급된 승인건 없음`);
      return;
    }

    const centerIds = [...new Set(rows.map(r => r.center_id).filter(Boolean))];
    const centerCache = {};
    if (centerIds.length) {
      const [cs] = await connection.query(
        `SELECT id, center_owner_id, center_recommender_id
         FROM centers
         WHERE id IN (${centerIds.map(()=>'?').join(',')})`,
        centerIds
      );
      for (const c of cs) centerCache[c.id] = c;
    }

    const blockIds = [
      ...new Set(
        centerIds.length ? Object.values(centerCache).flatMap(c => [c.center_owner_id, c.center_recommender_id]) : []
      )
    ];
    const blockMap = {};
    if (blockIds.length) {
      const [br] = await connection.query(
        `SELECT id, is_reward_blocked
         FROM members
         WHERE id IN (${blockIds.map(()=>'?').join(',')})`,
        blockIds
      );
      for (const b of br) blockMap[b.id] = !!b.is_reward_blocked;
    }

    for (const row of rows) {
      const { purchase_id, member_id, pv, center_id } = row;

      // 센터피
      if (center_id && centerCache[center_id]) {
        const centerOwnerId = centerCache[center_id].center_owner_id;
        if (centerOwnerId && !blockMap[centerOwnerId]) {
          const amount = toKRW(pv * centerRate);
          if (amount > 0) {
            const canPay = await hasAnyAvailable(centerOwnerId);
            await connection.query(`
              INSERT IGNORE INTO rewards_log
                (member_id, type, source, ref_id, amount, is_released, memo, created_at)
              VALUES (?, 'center', ?, ?, ?, 1, '센터피', NOW())
            `, [
              centerOwnerId,
              member_id,       // ✅ source = 구매자(member_id)
              purchase_id,     // ✅ ref_id = purchase_id
              canPay ? amount : 0
            ]);
          }
        }
      }

      // 센터추천피
      if (center_id && centerCache[center_id]) {
        const centerRecId = centerCache[center_id].center_recommender_id;
        if (centerRecId && !blockMap[centerRecId]) {
          const amount = toKRW(pv * centerRecRate);
          if (amount > 0) {
            const canPay = await hasAnyAvailable(centerRecId);
            await connection.query(`
              INSERT IGNORE INTO rewards_log
                (member_id, type, source, ref_id, amount, is_released, memo, created_at)
              VALUES (?, 'center_recommend', ?, ?, ?, 1, '센터추천피', NOW())
            `, [
              centerRecId,
              member_id,       // ✅ source = 구매자(member_id)
              purchase_id,
              canPay ? amount : 0
            ]);
          }
        }
      }
    }

    console.log(`✅ 센터피/센터추천피 정산 완료 (총 ${rows.length}건 미지급 처리)\n`);
  } catch (err) {
    console.error('❌ 센터피/센터추천피 정산 실패:', err);
  }
}

module.exports = { processReferralRewards };