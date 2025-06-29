// ✅ 파일 위치: backend/jobs/dailyRewardJob.cjs
const cron = require('node-cron');
const pool = require('../db.cjs'); // connection → pool로 변경 (커넥션 풀)
const axios = require('axios');

// 매일 오전 3시에 실행 (서버 시간 기준)
cron.schedule('0 3 * * *', async () => {
  console.log('🚀 데일리 수당 계산 시작...');

  try {
    // 1. JSON 수당 설정 불러오기
    const { data: config } = await axios.get(`${process.env.API_URL || 'http://localhost:3001'}/api/reward-config`);
    const rewardConfig = config.reward_config;
    const rewardTypes = config.reward_types;

    // 2. 패키지 구매한 회원 리스트 가져오기
    const [members] = await pool.query(`
      SELECT m.id AS member_id, m.username, m.recommender, p.amount, p.pv
      FROM purchases p
      JOIN members m ON m.id = p.member_id
      WHERE p.status = 'approved'
    `);

    for (const member of members) {
      const memberId = member.member_id;
      const username = member.username;
      const recommenderUsername = member.recommender;
      const pv = member.pv;
      const amount = member.amount;

      // 2.1. 한도 배율(리워드 정책)
      const limitMultiplier = rewardConfig.limits[pv.toString()];
      const maxReward = pv * limitMultiplier;

      // 3. 이미 받은 수당 총합 계산
      const [[{ total }]] = await pool.query(`
        SELECT IFNULL(SUM(amount), 0) AS total
        FROM rewards_log
        WHERE member_id = ? AND type IN ('daily', 'referral', 'binary', 'matching', 'rank', 'adjustment')
      `, [memberId]);
      const totalReward = total;

      // 4. 데일리 수당 계산 (PV * 2% 등)
      const dailyRate = rewardTypes.daily.rate;
      const todayReward = pv * dailyRate;

      if (totalReward + todayReward <= maxReward) {
        // 5. 데일리 수당 로그 기록
        await pool.query(`
          INSERT INTO rewards_log (member_id, type, amount, description, created_at)
          VALUES (?, 'daily', ?, '데일리 수당', NOW())
        `, [memberId, todayReward]);

        // 6. 포인트 잔액 업데이트
        await pool.query(`
          UPDATE members SET point_balance = point_balance + ? WHERE id = ?
        `, [todayReward, memberId]);

        console.log(`✅ ${username} → ${todayReward.toLocaleString()}P 지급 완료`);
      } else {
        console.log(`⚠️ ${username} → 한도 초과로 지급 보류 (누적: ${totalReward}, 한도: ${maxReward})`);
      }

      // ✅ 추천수당 로직 (최초 1회, 추천인에게 PV * 비율 지급)
      if (recommenderUsername) {
        const referralRate = rewardTypes.referral.rate;

        // 추천인을 member_id로 조회
        const [referrerInfo] = (await pool.query(`
          SELECT id, username FROM members WHERE username = ? LIMIT 1
        `, [recommenderUsername]))[0];

        if (referrerInfo) {
          const recommenderId = referrerInfo.id;

          // 추천수당 중복 지급 방지 (description으로 구분)
          const [[alreadyPaid]] = await pool.query(`
            SELECT COUNT(*) AS cnt FROM rewards_log
            WHERE member_id = ? AND type = 'referral' AND description = ?
          `, [recommenderId, `추천수당-${username}`]);

          if (alreadyPaid.cnt === 0) {
            const referralReward = pv * referralRate;

            await pool.query(`
              INSERT INTO rewards_log (member_id, type, amount, description, created_at)
              VALUES (?, 'referral', ?, ?, NOW())
            `, [recommenderId, referralReward, `추천수당-${username}`]);

            await pool.query(`
              UPDATE members SET point_balance = point_balance + ? WHERE id = ?
            `, [referralReward, recommenderId]);

            console.log(`🎁 추천수당 → ${referrerInfo.username}에게 ${referralReward.toLocaleString()}P 지급 (추천: ${username})`);
          }
        }
      }
    }

    console.log('✅ 데일리 + 추천 수당 계산 완료');
  } catch (err) {
    console.error('❌ 수당 계산 오류:', err.message);
  }
});
