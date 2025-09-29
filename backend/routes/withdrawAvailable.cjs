// ✅ 파일 경로: backend/routes/withdrawAvailable.cjs
const express = require('express');
const router = express.Router();
const pool = require('../db.cjs');
const moment = require('moment-timezone');   // ✅ 추가

// 이번주 월요일 00:00 (한국시간)
function getWeekStart() {
  const now = moment().tz('Asia/Seoul');   // 한국시간 기준
  const day = now.isoWeekday();            // 1=월 ~ 7=일
  const monday = now.clone().startOf('day').subtract(day - 1, 'days');
  return monday.format('YYYY-MM-DD HH:mm:ss');
}

// ✅ username → member_id 변환 함수
async function getMemberId(username) {
  const [[row]] = await pool.query(
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

    // 이번주 월요일 00:00:00 (KST)
    const weekStart = getWeekStart();

    // ✅ 일반 수당 (센터피/센터추천 제외, 전체기간)
    const [normalRewards] = await pool.query(
      `SELECT IFNULL(SUM(amount), 0) AS total
       FROM rewards_log
       WHERE member_id = ? AND type NOT IN ('center', 'center_recommend')`,
      [member_id]
    );

    const [normalWithdraws] = await pool.query(
      `SELECT IFNULL(SUM(amount), 0) AS total
       FROM withdraw_requests
       WHERE member_id = ? AND type = 'normal' AND status IN ('요청', '완료')`,
      [member_id]
    );

    // ✅ 센터피 수당 - "이번주 지급분 제외" (이번주 월요일 이전 지급분만! KST 기준)
    const [centerRewards] = await pool.query(
      `SELECT IFNULL(SUM(amount), 0) AS total
       FROM rewards_log
       WHERE member_id = ?
         AND type IN ('center', 'center_recommend')
         AND created_at < ?`,
      [member_id, weekStart]
    );

    const [centerWithdraws] = await pool.query(
      `SELECT IFNULL(SUM(amount), 0) AS total
       FROM withdraw_requests
       WHERE member_id = ? AND type = 'center' AND status IN ('요청', '완료')`,
      [member_id]
    );

    const normal = Number(normalRewards[0].total) - Number(normalWithdraws[0].total);
    const center = Number(centerRewards[0].total) - Number(centerWithdraws[0].total);

    res.json({
      normal: normal > 0 ? normal : 0,
      center: center > 0 ? center : 0,
      weekStart // (KST 기준 월요일 00:00, 디버깅용)
    });
  } catch (err) {
    console.error('❌ 출금 가능액 계산 오류:', err);
    res.status(500).json({ error: '서버 오류' });
  }
});

module.exports = router;
