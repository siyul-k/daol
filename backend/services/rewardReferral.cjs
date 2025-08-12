// ✅ 파일 경로: backend/services/rewardReferral.cjs
const connection = require('../db.cjs');
const { getPurchasesWithRemaining } = require('../utils/rewardLimit.cjs');

// 원화 정수(내림)
const toKRW = (n) => Math.max(0, Math.floor(Number(n) || 0));

// 추천수당을 추천인의 가장 오래된 슬롯부터 분배(ref_id 세팅, 부분지급 허용)
async function allocateRecommendFIFO(memberId, amount) {
  const slots = await getPurchasesWithRemaining(memberId); // [{purchaseId, remaining}], created_at ASC
  const alloc = [];
  let rem = toKRW(amount);

  for (const s of slots) {
    if (rem <= 0) break;
    const cap = toKRW(s.remaining);
    if (cap <= 0) continue;
    const take = Math.min(rem, cap);
    if (take > 0) {
      alloc.push({ ref_id: s.purchaseId, amount: toKRW(take) });
      rem -= take;
    }
  }
  const paid = toKRW(amount) - rem;
  return { alloc, paid: toKRW(paid), lack: toKRW(rem) };
}

async function processReferralRewards() {
  try {
    // 1) 보너스 설정
    const [bonusRows] = await connection.query(`
      SELECT reward_type, level, rate
      FROM bonus_config
      WHERE reward_type IN ('center', 'center_recommend', 'referral') AND level = 0
    `);
    const centerRate    = Number(bonusRows.find(r => r.reward_type === 'center')?.rate ?? 0.04);
    const centerRecRate = Number(bonusRows.find(r => r.reward_type === 'center_recommend')?.rate ?? 0.01);
    const recommendRate = Number(bonusRows.find(r => r.reward_type === 'referral')?.rate ?? 0.03);

    // 2) 정산 대상(normal만 / 아직 세 가지 보상이 source=p.id로 기록 안 된 건)
    const [rows] = await connection.query(`
      SELECT p.id AS purchase_id, p.member_id, p.pv, p.type, m.center_id, m.recommender_id
      FROM purchases p
      JOIN members m ON p.member_id = m.id
      WHERE p.status = 'approved'
        AND p.type   = 'normal'
        AND NOT EXISTS (
          SELECT 1 FROM rewards_log
           WHERE source = p.id
             AND type IN ('center','center_recommend','recommend')
        )
      ORDER BY p.created_at ASC
    `);

    if (!rows.length) {
      console.log('[정산대상 없음]');
      console.log('✅ 센터피/센터추천피/추천수당 정산 완료 (0건)\n');
      return;
    }

    // 센터 캐시
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

    // 블락맵(수당금지)
    const blockIds = [...new Set(
      rows.map(r => r.recommender_id).filter(Boolean)
        .concat(centerIds.length ? Object.values(centerCache).flatMap(c => [c.center_owner_id, c.center_recommender_id]) : [])
    )];
    const blockMap = {};
    if (blockIds.length) {
      const [br] = await connection.query(
        `SELECT id, is_reward_blocked FROM members WHERE id IN (${blockIds.map(()=>'?').join(',')})`,
        blockIds
      );
      for (const b of br) blockMap[b.id] = !!b.is_reward_blocked;
    }

    // 출금가능액 즉시 반영 맵(추천수당만)
    const addWithdrawMap = {};
    const payLog = [];

    for (const row of rows) {
      const { purchase_id, member_id: buyerId, pv, type, center_id, recommender_id } = row;

      // ───────── 센터피/센터추천피: 적립만(is_released=0), 한도와 무관 ─────────
      if (type === 'normal' && center_id && centerCache[center_id]) {
        const { center_owner_id, center_recommender_id } = centerCache[center_id];

        // 센터장
        if (center_owner_id && !blockMap[center_owner_id]) {
          const amount = toKRW(pv * centerRate);
          if (amount > 0) {
            // source = 구매ID(p.id), ref_id = 구매ID(p.id)  ← 멱등/중복방지
            await connection.query(`
              INSERT IGNORE INTO rewards_log
                (member_id, type, source, ref_id, amount, is_released, memo, created_at)
              VALUES (?, 'center', ?, ?, ?, 0, '센터피(적립)', NOW())
            `, [center_owner_id, purchase_id, purchase_id, amount]);
            payLog.push(`[센터피 적립] 센터장:${center_owner_id} src(purchase):${purchase_id} pv:${pv} amt:${amount}`);
          }
        }

        // 센터추천자
        if (center_recommender_id && !blockMap[center_recommender_id]) {
          const amount = toKRW(pv * centerRecRate);
          if (amount > 0) {
            await connection.query(`
              INSERT IGNORE INTO rewards_log
                (member_id, type, source, ref_id, amount, is_released, memo, created_at)
              VALUES (?, 'center_recommend', ?, ?, ?, 0, '센터추천피(적립)', NOW())
            `, [center_recommender_id, purchase_id, purchase_id, amount]);
            payLog.push(`[센터추천 적립] 추천자:${center_recommender_id} src(purchase):${purchase_id} pv:${pv} amt:${amount}`);
          }
        }
      }

      // ───────── 추천수당(recommend): 슬롯(FIFO) 분배 + 즉시 출금가능 반영 ─────────
      if (type === 'normal' && recommender_id && !blockMap[recommender_id]) {
        const target = toKRW(pv * recommendRate);
        const { alloc, paid, lack } = await allocateRecommendFIFO(recommender_id, target);

        payLog.push(`[추천수당] 추천인:${recommender_id} src(purchase):${purchase_id} pv:${pv} target:${target} paid:${paid} lack:${lack}`);

        if (paid > 0) {
          for (const a of alloc) {
            await connection.query(`
              INSERT IGNORE INTO rewards_log
                (member_id, type, source, ref_id, amount, memo, created_at)
              VALUES (?, 'recommend', ?, ?, ?, '추천수당', NOW())
            `, [recommender_id, purchase_id, a.ref_id, toKRW(a.amount)]);
          }
          addWithdrawMap[recommender_id] = (addWithdrawMap[recommender_id] || 0) + paid;
        } else {
          // 0원도 멱등키로 남겨 재시도시 무해
          await connection.query(`
            INSERT IGNORE INTO rewards_log
              (member_id, type, source, ref_id, amount, memo, created_at)
            VALUES (?, 'recommend', ?, ?, 0, '한도초과(추천수당)', NOW())
          `, [recommender_id, purchase_id, purchase_id]);
        }
      }
    }

    // 추천수당만 출금가능액 즉시 반영
    for (const id of Object.keys(addWithdrawMap)) {
      const sum = toKRW(addWithdrawMap[id]);
      if (sum > 0) {
        await connection.query(
          `UPDATE members SET withdrawable_point = withdrawable_point + ? WHERE id = ?`,
          [sum, id]
        );
      }
    }

    // 로그
    if (payLog.length) {
      console.log('\n[지급/적립 내역]');
      payLog.forEach(m => console.log(' ', m));
    }
    console.log(`✅ 센터피/센터추천피(적립) + 추천수당 정산 완료 (구매 ${rows.length}건)\n`);
  } catch (err) {
    console.error('❌ 센터피/추천수당 정산 실패:', err);
  }
}

module.exports = { processReferralRewards };
