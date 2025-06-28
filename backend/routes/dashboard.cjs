// ✅ 파일: backend/routes/dashboard.cjs
const express = require('express');
const router = express.Router();
const connection = require('../db.cjs');

const NodeCache = require('node-cache');
const dashboardCache = new NodeCache({ stdTTL: 20 });

// username → member_id 변환 함수
async function getMemberId(username) {
  const [[row]] = await connection.promise().query(
    'SELECT id FROM members WHERE username = ? LIMIT 1',
    [username]
  );
  return row ? row.id : null;
}

router.get('/:username', async (req, res) => {
  const { username } = req.params;

  const cacheKey = `dashboard:${username}`;
  const cached = dashboardCache.get(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  try {
    const member_id = await getMemberId(username);
    if (!member_id) return res.status(404).json({ error: '존재하지 않는 회원입니다.' });

    const [
      [member],
      [purchase],
      [deposit],
      [reward],
      [withdraw],
      [withdrawable],
      [shoppingPoint],
      recommenders,
      [packageTotal]  // <-- 추가!
    ] = await Promise.all([
      connection.promise().query('SELECT username, name FROM members WHERE id = ?', [member_id]).then(r => r[0]),
      connection.promise().query('SELECT point_balance AS available_point FROM members WHERE id = ?', [member_id]).then(r => r[0]),
      connection.promise().query('SELECT IFNULL(SUM(amount),0) AS total_deposit FROM deposit_requests WHERE member_id = ?', [member_id]).then(r => r[0]),
      connection.promise().query('SELECT IFNULL(SUM(amount),0) AS total_reward FROM rewards_log WHERE member_id = ?', [member_id]).then(r => r[0]),
      connection.promise().query('SELECT IFNULL(SUM(amount),0) AS total_withdraw FROM withdraw_requests WHERE member_id = ?', [member_id]).then(r => r[0]),
      connection.promise().query(
        'SELECT (SELECT IFNULL(SUM(amount),0) FROM rewards_log WHERE member_id = ?) - (SELECT IFNULL(SUM(amount),0) FROM withdraw_requests WHERE member_id = ?) AS withdrawable',
        [member_id, member_id]
      ).then(r => r[0]),
      connection.promise().query('SELECT IFNULL(shopping_point,0) AS shopping_point FROM members WHERE id = ?', [member_id]).then(r => r[0]),
      connection.promise().query('SELECT username FROM members WHERE recommender_id = ?', [member_id]).then(r => r[0]),
      // 👇 보유 패키지 합산 (normal + bcode)
      connection.promise().query(
        `SELECT IFNULL(SUM(amount),0) AS package_total
         FROM purchases
         WHERE member_id = ? AND status = 'approved' AND (type = 'normal' OR type = 'bcode')`,
        [member_id]
      ).then(r => r[0])
    ]);

    const result = {
      username: member?.username || username,
      name: member?.name || "",
      availablePoints: Number(purchase?.available_point || 0),
      depositAmount: Number(deposit?.total_deposit || 0),
      totalReward: Number(reward?.total_reward || 0),
      totalWithdraw: Number(withdraw?.total_withdraw || 0),
      withdrawableAmount: Number(withdrawable?.withdrawable || 0),
      shoppingPoint: Number(shoppingPoint?.shopping_point || 0),
      recommenderList: recommenders.map(r => r.username),
      packageTotal: Number(packageTotal?.package_total || 0) // 추가
    };

    dashboardCache.set(cacheKey, result);
    res.json(result);

  } catch (err) {
    console.error('❌ 대시보드 통합API 오류:', err);
    res.status(500).json({ error: '대시보드 데이터 조회 실패', details: err.message });
  }
});

module.exports = router;
