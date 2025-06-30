// ✅ 파일 경로: backend/services/rewardReferral.cjs

const connection = require('../db.cjs');
const { getAvailableRewardAmount } = require('../utils/rewardLimit.cjs');

async function processReferralRewards() {
  try {
    // 1. 보너스 설정 전체 조회
    const [bonusRows] = await connection.query(`
      SELECT reward_type, level, rate
      FROM bonus_config
      WHERE reward_type IN ('center', 'center_recommend', 'referral') AND level = 0
    `);

    const centerRate = bonusRows.find(r => r.reward_type === 'center')?.rate || 0.04;
    const recommendRate = bonusRows.find(r => r.reward_type === 'center_recommend')?.rate || 0.01;
    const referralRate = bonusRows.find(r => r.reward_type === 'referral')?.rate || 0.03;

    // 2. 센터피/추천수당 정산 대상 상품 조회
    const [rows] = await connection.query(`
      SELECT 
        p.id AS purchase_id, p.pv, p.type, m.center_id, m.recommender_id
      FROM purchases p
      JOIN members m ON p.member_id = m.id
      WHERE p.status = 'approved'
        AND p.type = 'normal'
        AND NOT EXISTS (
          SELECT 1 FROM rewards_log 
          WHERE source = p.id AND type IN ('center', 'center_recommend', 'referral')
        )
    `);

    if (rows.length > 0) {
      console.log(`\n[정산대상 ${rows.length}건]:`);
      for (const row of rows) {
        console.log(`  ▶ purchase_id=${row.purchase_id}, pv=${row.pv}, type=${row.type}, center_id=${row.center_id}, recommender_id=${row.recommender_id}`);
      }
    } else {
      console.log('[정산대상 없음]');
    }

    // 블락맵(수당금지) 캐싱
    const allIds = [
      ...new Set(rows.map(r => [
        r.center_id, r.recommender_id
      ]).flat().filter(Boolean))
    ];
    let centerOwnerIds = [];
    let centerRecommenderIds = [];
    if (rows.some(r => r.center_id)) {
      const centerIds = [...new Set(rows.map(r => r.center_id).filter(Boolean))];
      if (centerIds.length > 0) {
        const [centerRows] = await connection.query(
          `SELECT id, center_owner_id, center_recommender_id FROM centers WHERE id IN (${centerIds.map(()=>'?').join(',')})`,
          centerIds
        );
        centerOwnerIds = centerRows.map(c => c.center_owner_id).filter(Boolean);
        centerRecommenderIds = centerRows.map(c => c.center_recommender_id).filter(Boolean);
      }
    }
    const blockIds = [...new Set([
      ...allIds,
      ...centerOwnerIds,
      ...centerRecommenderIds
    ])];
    let blockMap = {};
    if (blockIds.length > 0) {
      const [blockRows] = await connection.query(
        `SELECT id, is_reward_blocked FROM members WHERE id IN (${blockIds.map(()=>'?').join(',')})`,
        blockIds
      );
      for (const r of blockRows) blockMap[r.id] = r.is_reward_blocked;
    }

    // center_id → 센터 정보 캐시 (owner_id, recommender_id)
    const centerCache = {};
    async function getCenterInfo(center_id) {
      if (!center_id) return null;
      if (centerCache[center_id]) return centerCache[center_id];
      const [[row]] = await connection.query(
        `SELECT center_owner_id, center_recommender_id FROM centers WHERE id = ? LIMIT 1`, [center_id]
      );
      if (row) centerCache[center_id] = row;
      return row || null;
    }

    // 한도/가용액 캐시
    const availableMap = {};

    // === [추가] 추천수당 지급 내역 누적 배열 (후처리용)
    const referralUpdateMap = {}; // member_id: 지급액 합산
    let payLog = [];

    for (const row of rows) {
      const {
        purchase_id, pv, type, center_id, recommender_id
      } = row;

      // === 센터피/센터추천피 정산 (normal 상품만, center_id 있을 때) ===
      if (type === 'normal' && center_id) {
        const centerInfo = await getCenterInfo(center_id);
        // 센터장
        if (centerInfo && centerInfo.center_owner_id && !blockMap[centerInfo.center_owner_id]) {
          const owner_id = centerInfo.center_owner_id;
          if (!availableMap[owner_id]) {
            availableMap[owner_id] = await getAvailableRewardAmount(owner_id);
          }
          const ownerAvailable = availableMap[owner_id];
          const centerAmount = Math.floor(pv * centerRate);
          payLog.push(`[센터피] 센터장:${owner_id}, purchase_id:${purchase_id}, pv:${pv}, amount:${centerAmount}, 가용:${ownerAvailable}`);
          await connection.query(`
            INSERT INTO rewards_log (member_id, type, source, amount, memo, created_at)
            VALUES (?, 'center', ?, ?, ?, NOW())
          `, [
            owner_id,
            purchase_id,
            ownerAvailable >= centerAmount ? centerAmount : 0,
            ownerAvailable >= centerAmount ? '센터피' : '한도초과(센터피)'
          ]);
        }
        // 센터추천자
        if (centerInfo && centerInfo.center_recommender_id && !blockMap[centerInfo.center_recommender_id]) {
          const center_rec_id = centerInfo.center_recommender_id;
          if (!availableMap[center_rec_id]) {
            availableMap[center_rec_id] = await getAvailableRewardAmount(center_rec_id);
          }
          const recommenderAvailable = availableMap[center_rec_id];
          const recommendAmount = Math.floor(pv * recommendRate);
          payLog.push(`[센터추천피] 추천자:${center_rec_id}, purchase_id:${purchase_id}, pv:${pv}, amount:${recommendAmount}, 가용:${recommenderAvailable}`);
          await connection.query(`
            INSERT INTO rewards_log (member_id, type, source, amount, memo, created_at)
            VALUES (?, 'center_recommend', ?, ?, ?, NOW())
          `, [
            center_rec_id,
            purchase_id,
            recommenderAvailable >= recommendAmount ? recommendAmount : 0,
            recommenderAvailable >= recommendAmount ? '센터추천피' : '한도초과(센터추천)'
          ]);
        }
      }

      // === 추천수당 정산 (normal 상품만, recommender_id 있을 때) ===
      if (type === 'normal' && recommender_id) {
        if (blockMap[recommender_id]) continue;

        if (!availableMap[recommender_id]) {
          availableMap[recommender_id] = await getAvailableRewardAmount(recommender_id);
        }
        const referralAvailable = availableMap[recommender_id];
        const referralAmount = Math.floor(pv * referralRate);
        payLog.push(`[추천수당] 추천인:${recommender_id}, purchase_id:${purchase_id}, pv:${pv}, amount:${referralAmount}, 가용:${referralAvailable}`);

        const actualAmount = referralAvailable >= referralAmount ? referralAmount : 0;
        await connection.query(`
          INSERT INTO rewards_log (member_id, type, source, amount, memo, created_at)
          VALUES (?, 'referral', ?, ?, ?, NOW())
        `, [
          recommender_id,
          purchase_id,
          actualAmount,
          actualAmount > 0 ? '추천수당' : '한도초과(추천수당)'
        ]);
        // === [추가] 추천수당 지급액만 누적(0 이상만)
        if (actualAmount > 0) {
          referralUpdateMap[recommender_id] = (referralUpdateMap[recommender_id] || 0) + actualAmount;
        }
      }
    }

    // === [추가] 추천수당 지급액 만큼만 출금가능포인트 동시 update! ===
    for (const member_id in referralUpdateMap) {
      const total = referralUpdateMap[member_id];
      await connection.query(
        'UPDATE members SET withdrawable_point = withdrawable_point + ? WHERE id = ?',
        [total, member_id]
      );
    }

    // === [추가] 지급 상세 로그 출력 ===
    if (payLog.length > 0) {
      console.log('\n[지급내역]');
      payLog.forEach(msg => console.log(' ', msg));
    } else {
      console.log('[지급 없음]');
    }

    console.log(`✅ 센터피/센터추천피/추천수당 정산 완료 (${rows.length}건)\n`);
  } catch (err) {
    console.error('❌ 센터피/추천수당 정산 실패:', err);
  }
}

module.exports = { processReferralRewards };
