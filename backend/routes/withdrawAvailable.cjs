// ✅ 파일 경로: backend/routes/withdrawAvailable.cjs
const express = require('express');
const router = express.Router();
const connection = require('../db.cjs');

// 이번주 월요일 00:00 구하기
function getWeekStart() {
  const now = new Date();
  const day = now.getDay() || 7;
  now.setHours(0, 0, 0, 0);
  now.setDate(now.getDate() - day + 1);
  return now.toISOString().slice(0, 19).replace('T', ' ');
}

// ✅ username → member_id 변환 함수
async function getMemberId(username) {
  const [[row]] = await connection.promise().query(
    'SELECT id FROM members WHERE username = ? LIMIT 1',
    [username]
  );
  return row ? row.id : null;
}

// ✅ 출금 가능 금액 조회
router.get('/', async (req, res) => {
  const { username } = req.query;
  if (!username) return res.status(400).json({ error: 'username is required' });

  try {
    const member_id = await getMemberId(username);
    if (!member_id) return res.status(404).json({ error: '존재하지 않는 회원입니다.' });

    // 이번주 월요일 00:00:00
    const weekStart = getWeekStart();

    // ✅ 일반 수당 (센터피/센터추천 제외, 전체기간)
    const [normalRewards] = await connection.promise().query(
      `SELECT IFNULL(SUM(amount), 0) AS total
       FROM rewards_log
       WHERE member_id = ? AND type NOT IN ('center', 'center_recommend')`,
      [member_id]
    );

    const [normalWithdraws] = await connection.promise().query(
      `SELECT IFNULL(SUM(amount), 0) AS total
       FROM withdraw_requests
       WHERE member_id = ? AND type = 'normal' AND status IN ('요청', '완료')`,
      [member_id]
    );

    // ✅ 센터피 수당 - "이번주 지급분 제외" (이번주 월요일 이전 지급분만!)
    const [centerRewards] = await connection.promise().query(
      `SELECT IFNULL(SUM(amount), 0) AS total
       FROM rewards_log
       WHERE member_id = ?
         AND type IN ('center', 'center_recommend')
         AND created_at < ?`,
      [member_id, weekStart]
    );

    const [centerWithdraws] = await connection.promise().query(
      `SELECT IFNULL(SUM(amount), 0) AS total
       FROM withdraw_requests
       WHERE member_id = ? AND type = 'center' AND status IN ('요청', '완료')`,
      [member_id]
    );

    const normal = normalRewards[0].total - normalWithdraws[0].total;
    const center = centerRewards[0].total - centerWithdraws[0].total;

    res.json({
      normal: normal > 0 ? normal : 0,
      center: center > 0 ? center : 0,
      weekStart // (디버깅용)
    });
  } catch (err) {
    console.error('❌ 출금 가능액 계산 오류:', err);
    res.status(500).json({ error: '서버 오류' });
  }
});

module.exports = router;
