// ✅ 파일 위치: backend/routes/check-user.cjs
const express = require('express');
const router = express.Router();
const pool = require('../db.cjs');

/**
 * GET /api/check-user
 * - username 또는 member_id로 회원 정보 조회
 * - 반환: { success, member_id, username, name }
 * 예: /api/check-user?username=test
 * 예: /api/check-user?member_id=123
 */
router.get('/', async (req, res) => {
  const { username, member_id } = req.query;

  // 최소 하나의 파라미터 필요
  if (!username && !member_id) {
    return res.status(400).json({ success: false, message: 'No username or member_id' });
  }

  let sql = '';
  let params = [];
  if (member_id) {
    sql = `SELECT id AS member_id, username, name FROM members WHERE id = ? LIMIT 1`;
    params = [member_id];
  } else {
    sql = `SELECT id AS member_id, username, name FROM members WHERE username = ? LIMIT 1`;
    params = [username];
  }

  try {
    const [results] = await pool.query(sql, params);
    if (results.length === 0) {
      return res.json({ success: false, message: 'Not found' });
    }
    const { member_id, username, name } = results[0];
    res.json({ success: true, member_id, username, name });
  } catch (err) {
    res.status(500).json({ success: false, message: 'DB error' });
  }
});

module.exports = router;
