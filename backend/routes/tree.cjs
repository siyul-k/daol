// ✅ 파일 경로: backend/routes/tree.cjs
const express = require('express');
const router = express.Router();
const connection = require('../db.cjs');

// ✅ 재귀로 추천인 기준 트리 생성
function buildRecommenderTree(members, username) {
  return members
    .filter((m) => m.recommender === username)
    .map((child) => ({
      username: child.username,
      name: child.name,
      created_at: child.created_at,
      sales: child.sales || 0,
      children: buildRecommenderTree(members, child.username),
    }));
}

// ✅ 재귀로 후원인 기준 트리 생성 (좌/우 순서 고정)
function buildSponsorTree(members, username) {
  const children = members.filter((m) => m.sponsor === username);
  const left = children.find((c) => c.sponsor_direction === 'left');
  const right = children.find((c) => c.sponsor_direction === 'right');

  const nodes = [];
  if (left)
    nodes.push({
      username: left.username,
      name: left.name,
      created_at: left.created_at,
      sales: left.sales || 0,
      children: buildSponsorTree(members, left.username),
    });
  if (right)
    nodes.push({
      username: right.username,
      name: right.name,
      created_at: right.created_at,
      sales: right.sales || 0,
      children: buildSponsorTree(members, right.username),
    });

  return nodes;
}

// ✅ 관리자용: 전체 추천인 조직도
router.get('/full', async (req, res) => {
  try {
    const [rows] = await connection.promise().query(`
      SELECT m.id, username, name, recommender, created_at,
        IFNULL((
          SELECT SUM(pv) FROM purchases 
          WHERE member_id = m.id AND status = 'approved'
        ), 0) AS sales
      FROM members m
      WHERE is_admin = 0
    `);

    const root = rows.find((m) => !m.recommender);
    if (!root) return res.json({ success: false, message: "루트 노드 없음", tree: [] });

    const tree = {
      username: root.username,
      name: root.name,
      created_at: root.created_at,
      sales: root.sales,
      children: buildRecommenderTree(rows, root.username),
    };

    res.json({ success: true, tree: [tree] });
  } catch (err) {
    console.error("❌ 추천 계보 트리 오류:", err);
    res.status(500).json({ success: false, message: "서버 오류" });
  }
});

// ✅ 회원/관리자 겸용: 본인 기준 추천인 트리
router.get('/recommend', async (req, res) => {
  const username = req.query.username;
  if (!username) return res.status(400).json({ success: false, message: "username 필요" });

  try {
    const [rows] = await connection.promise().query(`
      SELECT m.id, username, name, recommender, created_at,
        IFNULL((
          SELECT SUM(pv) FROM purchases 
          WHERE member_id = m.id AND status = 'approved'
        ), 0) AS sales
      FROM members m
      WHERE is_admin = 0
    `);

    const root = rows.find((m) => m.username === username);
    if (!root) return res.json({ success: false, message: "해당 회원 없음", tree: [] });

    const tree = {
      username: root.username,
      name: root.name,
      created_at: root.created_at,
      sales: root.sales,
      children: buildRecommenderTree(rows, root.username),
    };

    res.json({ success: true, tree: [tree] });
  } catch (err) {
    console.error("❌ 추천 트리 오류:", err);
    res.status(500).json({ success: false, message: "서버 오류" });
  }
});

// ✅ 회원/관리자 겸용: 본인 기준 후원인 트리
router.get('/sponsor', async (req, res) => {
  const username = req.query.username;
  if (!username) return res.status(400).json({ success: false, message: "username 필요" });

  try {
    const [rows] = await connection.promise().query(`
      SELECT m.id, username, name, sponsor, sponsor_direction, created_at,
        IFNULL((
          SELECT SUM(pv) FROM purchases 
          WHERE member_id = m.id AND status = 'approved'
        ), 0) AS sales
      FROM members m
      WHERE is_admin = 0
    `);

    const root = rows.find((m) => m.username === username);
    if (!root) return res.json({ success: false, message: "해당 회원 없음", tree: [] });

    const tree = {
      username: root.username,
      name: root.name,
      created_at: root.created_at,
      sales: root.sales,
      children: buildSponsorTree(rows, root.username),
    };

    res.json({ success: true, tree: [tree] });
  } catch (err) {
    console.error("❌ 후원 트리 오류:", err);
    res.status(500).json({ success: false, message: "서버 오류" });
  }
});

module.exports = router;
