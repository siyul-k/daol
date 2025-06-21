// ✅ 파일 경로: backend/routes/tree.cjs
const express = require('express');
const router = express.Router();
const connection = require('../db.cjs');

// ✅ 추천인 기준 조직도 트리 구성 함수
function buildRecommenderTree(members, parentUsername = null) {
  return members
    .filter(m => m.recommender === parentUsername)
    .map(m => ({
      username: m.username,
      name: m.name,
      created_at: m.created_at,
      sales: m.sales,
      children: buildRecommenderTree(members, m.username)
    }));
}

// ✅ 후원인 기준 조직도 트리 구성 함수
function buildSponsorTree(members, parentUsername = null) {
  return members
    .filter(m => m.sponsor === parentUsername)
    .map(m => ({
      username: m.username,
      name: m.name,
      created_at: m.created_at,
      sales: m.sales,
      children: buildSponsorTree(members, m.username)
    }));
}

// ✅ 추천인 계보 조직도 API (관리자용 전체 트리): /api/tree/full
router.get('/full', async (req, res) => {
  try {
    const [rows] = await connection.promise().query(`
      SELECT username, name, recommender, created_at,
        IFNULL((
          SELECT SUM(pv) FROM purchases 
          WHERE member_id = m.id AND status = 'approved'
        ), 0) AS sales
      FROM members m
      WHERE is_admin = 0
    `);

    const tree = buildRecommenderTree(rows, null);
    res.json({ success: true, tree });
  } catch (err) {
    console.error("❌ 추천 계보 트리 오류:", err);
    res.status(500).json({ success: false, message: "서버 오류" });
  }
});

// ✅ 후원인 계보 조직도 API (관리자 전체 or 특정 사용자 하위): /api/tree/sponsor
router.get('/sponsor', async (req, res) => {
  const { username } = req.query;

  try {
    const [rows] = await connection.promise().query(`
      SELECT username, name, sponsor, created_at,
        IFNULL((
          SELECT SUM(pv) FROM purchases 
          WHERE member_id = m.id AND status = 'approved'
        ), 0) AS sales
      FROM members m
      WHERE is_admin = 0
    `);

    if (username) {
      const root = rows.find(m => m.username === username);
      if (!root) return res.status(404).json({ success: false, message: "사용자 없음" });

      const tree = {
        username: root.username,
        name: root.name,
        created_at: root.created_at,
        sales: root.sales,
        children: buildSponsorTree(rows, root.username)
      };
      return res.json({ success: true, tree });
    } else {
      const tree = buildSponsorTree(rows, null);
      return res.json({ success: true, tree });
    }

  } catch (err) {
    console.error("❌ 후원 계보 트리 오류:", err);
    res.status(500).json({ success: false, message: "서버 오류" });
  }
});

module.exports = router;
