// ✅ 파일 경로: backend/services/rewardReferral.cjs

const connection = require('../db.cjs');
const { getAvailableRewardAmountByUsername } = require('../utils/rewardLimit.cjs');

async function processReferralRewards() {
  try {
    // 1. 센터피 정산되지 않은 승인 상품 조회
    const [rows] = await connection.promise().query(`
      SELECT p.id AS purchase_id, p.member_id, p.pv, p.type, m.username, m.center
      FROM purchases p
      JOIN members m ON p.member_id = m.id
      WHERE p.status = 'approved'
        AND NOT EXISTS (
          SELECT 1 FROM rewards_log 
          WHERE source = p.id AND type IN ('center', 'center_recommend')
        )
    `);

    // 2. 보너스 비율 설정 가져오기
    const [[centerRow]] = await connection.promise().query(`
      SELECT rate FROM bonus_config WHERE reward_type = 'center' AND level = 0 LIMIT 1
    `);
    const [[centerRecommenderRow]] = await connection.promise().query(`
      SELECT rate FROM bonus_config WHERE reward_type = 'center_recommend' AND level = 0 LIMIT 1
    `);

    const centerRate = centerRow?.rate || 0.04;
    const recommendRate = centerRecommenderRow?.rate || 0.01;

    for (const row of rows) {
      const {
        purchase_id, pv, type,
        center
      } = row;

      // ✅ Bcode 상품은 센터피 발생 없음
      if (type !== 'normal') continue;

      // ✅ 센터장 및 추천인 조회
      if (!center) continue;

      const [centerRows] = await connection.promise().query(
        `SELECT center_owner, center_recommender FROM centers WHERE center_name = ?`,
        [center]
      );
      if (centerRows.length === 0) continue;

      const { center_owner, center_recommender } = centerRows[0];

      // ✅ 센터장에게 지급
      if (center_owner) {
        const centerAmount = Math.floor(pv * centerRate);

        const available = await getAvailableRewardAmountByUsername(center_owner);
        if (available >= centerAmount) {
          await connection.promise().query(`
            INSERT INTO rewards_log (user_id, type, source, amount, memo, created_at)
            VALUES (?, 'center', ?, ?, '센터피', NOW())
          `, [center_owner, purchase_id, centerAmount]);
        } else {
          await connection.promise().query(`
            INSERT INTO rewards_log (user_id, type, source, amount, memo, created_at)
            VALUES (?, 'center', ?, 0, '한도초과(센터피)', NOW())
          `, [center_owner, purchase_id]);
        }
      }

      // ✅ 센터추천자에게 지급
      if (center_owner && center_recommender) {
        const recommendAmount = Math.floor(pv * recommendRate);

        const available = await getAvailableRewardAmountByUsername(center_recommender);
        if (available >= recommendAmount) {
          await connection.promise().query(`
            INSERT INTO rewards_log (user_id, type, source, amount, memo, created_at)
            VALUES (?, 'center_recommend', ?, ?, '센터추천피', NOW())
          `, [center_recommender, purchase_id, recommendAmount]);
        } else {
          await connection.promise().query(`
            INSERT INTO rewards_log (user_id, type, source, amount, memo, created_at)
            VALUES (?, 'center_recommend', ?, 0, '한도초과(센터추천)', NOW())
          `, [center_recommender, purchase_id]);
        }
      }
    }

    console.log(`✅ 센터피/센터추천피 정산 완료 (${rows.length}건)`);
  } catch (err) {
    console.error('❌ 센터피 정산 실패:', err);
  }
}

module.exports = { processReferralRewards };
