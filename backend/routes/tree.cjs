// ✅ 파일 경로: backend/routes/tree.cjs

const express = require('express');
const router = express.Router();
const pool = require('../db.cjs'); // connection → pool

// ✅ 추천인 기준 조직도 트리 구성 함수 (id 기반)
function buildRecommenderTree(members, parentId = null) {
  return members
    .filter(m => m.recommender_id === parentId)
    .map(m => ({
      id: m.id,
      username: m.username,
      name: m.name,
      created_at: m.created_at,
      sales: m.sales,
      children: buildRecommenderTree(members, m.id)
    }));
}

// ✅ 추천인 계보 조직도 API (전체 트리): /api/tree/full
router.get('/full', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT id, username, name, recommender_id, created_at,
        IFNULL((SELECT SUM(pv) FROM purchases WHERE member_id = m.id AND status = 'approved'), 0) AS sales
      FROM members m
      WHERE is_admin = 0
    `);

    const tree = buildRecommenderTree(rows, null);
    res.json({ success: true, tree });
  } catch (err) {
    res.status(500).json({ success: false, message: "서버 오류" });
  }
});

// ✅ 추천인 계보 조직도 API (회원 전용): /api/tree/recommend?id=2
router.get('/recommend', async (req, res) => {
  const { id } = req.query;

  try {
    const [rows] = await pool.query(`
      SELECT id, username, name, recommender_id, created_at,
        IFNULL((SELECT SUM(pv) FROM purchases WHERE member_id = m.id AND status = 'approved'), 0) AS sales
      FROM members m
      WHERE is_admin = 0
    `);

    if (!id) {
      return res.status(400).json({ success: false, message: "id 필수" });
    }

    const root = rows.find(m => m.id === Number(id));
    if (!root) {
      return res.status(404).json({ success: false, message: "사용자 없음" });
    }

    const tree = {
      id: root.id,
      username: root.username,
      name: root.name,
      created_at: root.created_at,
      sales: root.sales,
      children: buildRecommenderTree(rows, root.id)
    };

    res.json({ success: true, tree });
  } catch (err) {
    res.status(500).json({ success: false, message: "서버 오류" });
  }
});

module.exports = router;
