// ✅ 파일 위치: backend/routes/lookup.cjs

const express = require('express');
const router = express.Router();
const pool = require('../db.cjs');

// 센터명 → 센터 정보 반환
router.get('/center', async (req, res) => {
  const { center } = req.query;
  try {
    if (center) {
      const [centers] = await pool.query(
        `SELECT id, center_owner_id FROM centers WHERE center_name = ? LIMIT 1`,
        [center]
      );
      if (centers.length === 0) {
        return res.status(404).json({ message: '센터 없음' });
      }
      const centerId = centers[0].id;
      const ownerId = centers[0].center_owner_id;
      const [owners] = await pool.query(
        `SELECT id, name, username FROM members WHERE id = ? LIMIT 1`,
        [ownerId]
      );
      return res.json({
        id: centerId,
        owner_id: ownerId,
        owner_name: owners[0]?.name || "",
        owner_username: owners[0]?.username || ""
      });
    } else {
      return res.status(400).json({ message: 'center 파라미터 필요' });
    }
  } catch (err) {
    console.error("센터 확인 오류:", err);
    res.status(500).json({ message: 'DB 오류' });
  }
});

// ⭐ 추천인 이름/id 조회 (username 또는 member_id 지원)
router.get('/recommender', async (req, res) => {
  const { username, member_id } = req.query;
  try {
    let sql, params;
    if (member_id) {
      sql = 'SELECT id, name FROM members WHERE id = ? LIMIT 1';
      params = [member_id];
    } else if (username) {
      sql = 'SELECT id, name FROM members WHERE username = ? LIMIT 1';
      params = [username];
    } else {
      return res.status(400).json({ message: 'username 혹은 member_id 필요' });
    }
    const [results] = await pool.query(sql, params);
    if (results.length === 0) {
      return res.status(404).json({ message: '추천인 없음' });
    }
    res.json({ id: results[0].id, name: results[0].name });
  } catch (err) {
    res.status(500).json({ message: 'DB 오류' });
  }
});

module.exports = router;
