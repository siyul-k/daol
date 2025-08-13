// ✅ 파일 경로: backend/services/rewardReferral.cjs
const connection = require('../db.cjs');
const { getPurchasesWithRemaining } = require('../utils/rewardLimit.cjs');

const toKRW = (n) => Math.max(0, Math.floor(Number(n) || 0));

// 구매건별 FIFO 한도 분배 (매번 fresh 호출)
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
      WHERE reward_type IN ('center', 'center_recommend', 'referral') AND level = 0
    `);
    const centerRate    = Number(bonusRows.find(r => r.reward_type === 'center')?.rate ?? 0.04);
    const centerRecRate = Number(bonusRows.find(r => r.reward_type === 'center_recommend')?.rate ?? 0.01);
    const recommendRate = Number(bonusRows.find(r => r.reward_type === 'referral')?.rate ?? 0.03);

    const [rows] = await connection.query(`
      SELECT p.id AS purchase_id, p.member_id, p.pv, m.center_id, m.recommender_id
      FROM purchases p
      JOIN members m ON p.member_id = m.id
      WHERE p.status = 'approved'
        AND p.type   = 'normal'
        AND DATE(p.created_at) = CURDATE()
      ORDER BY p.created_at ASC
    `);
    if (!rows.length) {
      console.log('[정산대상 없음]');
      return;
    }

    const purchaseIds = rows.map(r => r.purchase_id);
    const doneCenter = new Set();
    const doneCenterRecommend = new Set();
    const doneRecommend = new Set();
    if (purchaseIds.length) {
      const [doneRows] = await connection.query(
        `SELECT DISTINCT source, type
         FROM rewards_log
         WHERE source IN (${purchaseIds.map(()=>'?').join(',')})
           AND type IN ('center','center_recommend','recommend')`,
        purchaseIds
      );
      for (const r of doneRows) {
        if (r.type === 'center') doneCenter.add(r.source);
        if (r.type === 'center_recommend') doneCenterRecommend.add(r.source);
        if (r.type === 'recommend') doneRecommend.add(r.source);
      }
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
        rows.map(r => r.recommender_id).filter(Boolean)
          .concat(centerIds.length ? Object.values(centerCache).flatMap(c => [c.center_owner_id, c.center_recommender_id]) : [])
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

    const addWithdrawMap = {};
    const payLog = [];

    for (const row of rows) {
      const { purchase_id, member_id: buyerId, pv, center_id, recommender_id } = row;

      // 센터피
      if (!doneCenter.has(purchase_id) && center_id && centerCache[center_id]) {
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
              purchase_id, // 구매자 상품ID
              purchase_id, // 센터피는 ref_id=source 동일
              canPay ? amount : 0
            ]);
          }
        }
      }

      // 센터추천피
      if (!doneCenterRecommend.has(purchase_id) && center_id && centerCache[center_id]) {
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
              purchase_id,
              purchase_id,
              canPay ? amount : 0
            ]);
          }
        }
      }

      // 추천수당 (건별 한도 계산)
      if (!doneRecommend.has(purchase_id) && recommender_id && !blockMap[recommender_id]) {
        const target = toKRW(pv * recommendRate);
        if (target > 0) {
          const { alloc, paid, lack } = await allocateRecommendFIFOOnce(recommender_id, target);
          if (paid > 0) {
            for (const a of alloc) {
              await connection.query(`
                INSERT IGNORE INTO rewards_log
                  (member_id, type, source, ref_id, amount, memo, created_at)
                VALUES (?, 'recommend', ?, ?, ?, '추천', NOW())
              `, [recommender_id, purchase_id, a.ref_id, a.amount]);
            }
            addWithdrawMap[recommender_id] = (addWithdrawMap[recommender_id] || 0) + paid;
          } else {
            await connection.query(`
              INSERT IGNORE INTO rewards_log
                (member_id, type, source, ref_id, amount, memo, created_at)
              VALUES (?, 'recommend', ?, ?, 0, '한도초과(추천수당)', NOW())
            `, [recommender_id, purchase_id, purchase_id]);
          }
          payLog.push(`[추천수당] 추천인:${recommender_id} src:${purchase_id} pv:${pv} target:${target} paid:${paid} lack:${lack}`);
        }
      }
    }

    for (const id of Object.keys(addWithdrawMap)) {
      const sum = toKRW(addWithdrawMap[id]);
      if (sum > 0) {
        await connection.query(
          `UPDATE members SET withdrawable_point = withdrawable_point + ? WHERE id = ?`,
          [sum, id]
        );
      }
    }

    if (payLog.length) {
      console.log('\n[지급/적립 내역]');
      payLog.forEach(m => console.log(' ', m));
    }
    console.log(`✅ 건별 센터피/센터추천피 + 추천수당 정산 완료 (구매 ${rows.length}건)\n`);
  } catch (err) {
    console.error('❌ 센터피/추천수당 정산 실패:', err);
  }
}

module.exports = { processReferralRewards };
