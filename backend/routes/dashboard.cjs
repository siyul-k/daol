// ✅ 파일: backend/routes/dashboard.cjs
const express = require('express');
const router = express.Router();
const pool = require('../db.cjs');

const NodeCache = require('node-cache');
const dashboardCache = new NodeCache({ stdTTL: 20 });

// username → member_id 변환
async function getMemberId(username) {
  const [rows] = await pool.query(
    'SELECT id FROM members WHERE username = ? LIMIT 1',
    [username]
  );
  return rows[0] ? rows[0].id : null;
}

router.get('/:username', async (req, res) => {
  const { username } = req.params;

  const cacheKey = `dashboard:${username}`;
  const cached = dashboardCache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    const member_id = await getMemberId(username);
    if (!member_id) {
      return res.status(404).json({ error: '존재하지 않는 회원입니다.' });
    }

    const [
      [member],
      [purchase],
      [depositCompleted],      // 입금: 완료만
      [reward],
      [withdrawReqAndDone],    // 출금: 요청+완료
      [withdrawable],          // ✅ 출금가능: members.withdrawable_point
      [shoppingPoint],
      recommenders,            // 추천인 목록 (직접 하위)
      sponsors,                // 후원인 목록 (직접 하위, L/R 무관)
      [packageTotalPV]         // ✅ 보유 패키지: PV 합산
    ] = await Promise.all([
      pool.query('SELECT username, name FROM members WHERE id = ?', [member_id]).then(r => r[0]),
      pool.query('SELECT point_balance AS available_point FROM members WHERE id = ?', [member_id]).then(r => r[0]),
      pool.query(
        `SELECT IFNULL(SUM(amount),0) AS total_deposit
           FROM deposit_requests
          WHERE member_id = ? AND status = '완료'`,
        [member_id]
      ).then(r => r[0]),
      pool.query(
        'SELECT IFNULL(SUM(amount),0) AS total_reward FROM rewards_log WHERE member_id = ?',
        [member_id]
      ).then(r => r[0]),
      pool.query(
        `SELECT IFNULL(SUM(amount),0) AS total_withdraw
           FROM withdraw_requests
          WHERE member_id = ? AND status IN ('요청','완료')`,
        [member_id]
      ).then(r => r[0]),
      pool.query(
        'SELECT IFNULL(withdrawable_point,0) AS withdrawable_point FROM members WHERE id = ?',
        [member_id]
      ).then(r => r[0]),
      pool.query(
        'SELECT IFNULL(shopping_point,0) AS shopping_point FROM members WHERE id = ?',
        [member_id]
      ).then(r => r[0]),
      pool.query('SELECT username, name FROM members WHERE recommender_id = ?', [member_id]).then(r => r[0]),
      pool.query('SELECT username, name FROM members WHERE sponsor_id = ?', [member_id]).then(r => r[0]),
      pool.query(
        `SELECT IFNULL(SUM(pv),0) AS package_total_pv
           FROM purchases
          WHERE member_id = ?
            AND status = 'approved'
            AND (type = 'normal' OR type = 'bcode')`,
        [member_id]
      ).then(r => r[0])
    ]);

    const result = {
      username: member?.username || username,
      name: member?.name || '',
      availablePoints: Number(purchase?.available_point || 0),
      depositAmount: Number(depositCompleted?.total_deposit || 0),     // 입금: 완료만
      totalReward: Number(reward?.total_reward || 0),
      totalWithdraw: Number(withdrawReqAndDone?.total_withdraw || 0),  // 출금: 요청+완료
      withdrawableAmount: Number(withdrawable?.withdrawable_point || 0), // members 컬럼 값 그대로
      shoppingPoint: Number(shoppingPoint?.shopping_point || 0),
      recommenderList: recommenders.map(r => r.username),
      sponsorList: sponsors.map(r => r.username),                       // ✅ 추가
      packageTotal: Number(packageTotalPV?.package_total_pv || 0)       // PV 합산
    };

    dashboardCache.set(cacheKey, result);
    res.json(result);
  } catch (err) {
    console.error('❌ 대시보드 통합API 오류:', err);
    res.status(500).json({ error: '대시보드 데이터 조회 실패', details: err.message });
  }
});

module.exports = router;
