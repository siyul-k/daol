// ✅ 파일 경로: backend/routes/tree.cjs
const express = require('express');
const router = express.Router();
const pool = require('../db.cjs');

// 추천 트리 빌드
function buildRecommenderTree(members, parentId = null) {
  return members
    .filter((m) => m.recommender_id === parentId)
    .map((m) => ({
      id: m.id,
      username: m.username,
      name: m.name,
      created_at: m.created_at,
      sales: m.sales,
      children: buildRecommenderTree(members, m.id),
    }));
}

// 후원 트리 빌드 (유니레벨)
function buildSponsorTree(members, parentId = null) {
  const children = members
    .filter((m) => m.sponsor_id === parentId)
    .sort((a, b) => a.id - b.id); // 단순 ID 순

  return children.map((m) => ({
    id: m.id,
    username: m.username,
    name: m.name,
    created_at: m.created_at,
    sales: m.sales,
    children: buildSponsorTree(members, m.id),
  }));
}

/* ───────── 추천 트리: 전체 ───────── */
router.get('/full', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT m.id, m.username, m.name, m.recommender_id, m.created_at,
             m.sponsor_id,
             IFNULL((SELECT SUM(pv) FROM purchases p WHERE p.member_id=m.id AND p.status='approved'),0) AS sales
      FROM members m
      WHERE m.is_admin=0
    `);
    const tree = buildRecommenderTree(rows, null);
    res.json({ success: true, tree });
  } catch (err) {
    console.error("❌ 추천 전체 트리 오류:", err);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

/* ───────── 추천 트리: 개인 ───────── */
router.get('/recommend', async (req, res) => {
  const { id } = req.query;
  try {
    if (!id) return res.status(400).json({ success: false, message: 'id 필수' });

    const [rows] = await pool.query(`
      SELECT m.id, m.username, m.name, m.recommender_id, m.created_at,
             m.sponsor_id,
             IFNULL((SELECT SUM(pv) FROM purchases p WHERE p.member_id=m.id AND p.status='approved'),0) AS sales
      FROM members m
      WHERE m.is_admin=0
    `);

    const root = rows.find((m) => m.id === Number(id));
    if (!root) return res.status(404).json({ success: false, message: '사용자 없음' });

    const tree = {
      id: root.id,
      username: root.username,
      name: root.name,
      created_at: root.created_at,
      sales: root.sales,
      children: buildRecommenderTree(rows, root.id),
    };

    res.json({ success: true, tree });
  } catch (err) {
    console.error("❌ 추천 개인 트리 오류:", err);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

/* ───────── 후원 트리: 개인 + 전체 ───────── */
router.get('/sponsor', async (req, res) => {
  const { id } = req.query;
  try {
    const [rows] = await pool.query(`
      SELECT m.id, m.username, m.name, m.created_at,
             m.recommender_id, m.sponsor_id,
             IFNULL((SELECT SUM(pv) FROM purchases p WHERE p.member_id=m.id AND p.status='approved'),0) AS sales
      FROM members m
      WHERE m.is_admin=0
    `);

    if (id) {
      // ─ 개인 기준 ─
      const root = rows.find((m) => m.id === Number(id));
      if (!root) return res.status(404).json({ success: false, message: '사용자 없음' });

      const tree = {
        id: root.id,
        username: root.username,
        name: root.name,
        created_at: root.created_at,
        sales: root.sales,
        children: buildSponsorTree(rows, root.id),
      };
      return res.json({ success: true, tree });
    } else {
      // ─ 전체 기준 ─
      const tree = buildSponsorTree(rows, null);
      return res.json({ success: true, tree });
    }
  } catch (err) {
    console.error("❌ 후원 트리 오류:", err);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

module.exports = router;
