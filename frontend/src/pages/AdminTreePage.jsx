// ✅ 파일 경로: frontend/pages/AdminTreePage.jsx
import React, { useEffect, useState } from "react";
import axios from "../axiosConfig";
import { Tree, TreeNode } from "react-organizational-chart";
import "./OrgChart.css";

/** ─── 1) 박스 렌더링 ─── */
const OrgBox = ({ node }) => (
  <div className="org-box">
    <div className="org-id">{node.username}</div>
    <div className="org-name">{node.name || "-"}</div>
    <div className="org-date">{node.created_at?.slice(2, 10)}</div>
    <div className="org-sales">({node.sales.toLocaleString()})</div>
  </div>
);

/** ─── 2) 재귀 탐색 ─── */
const findSubtree = (node, username) => {
  if (node.username === username) return node;
  for (const child of node.children || []) {
    const found = findSubtree(child, username);
    if (found) return found;
  }
  return null;
};

/** ─── 3) 재귀 렌더링 ─── */
const renderNode = (node) => (
  <TreeNode key={node.username} label={<OrgBox node={node} />}>
    {node.children?.map(renderNode)}
  </TreeNode>
);

export default function AdminTreePage() {
  const [tree, setTree] = useState(null);
  const currentUser = JSON.parse(localStorage.getItem("user"))?.username;

  useEffect(() => {
    axios
      .get("/api/tree/recommend")
      .then((res) => {
        if (!res.data.success || !res.data.tree.length) return;
        const fullRoot = res.data.tree[0];

        if (currentUser) {
          const subtree = findSubtree(fullRoot, currentUser);
          setTree(subtree || { ...fullRoot, children: [] });
        } else {
          setTree(fullRoot);
        }
      })
      .catch(console.error);
  }, []);

  if (!tree) return <div className="org-wrapper"><p>조직도 데이터가 없습니다.</p></div>;

  return (
    <div className="org-wrapper">
      <h1>추천 계보 조직도</h1>
      <div className="org-container">
        <Tree lineWidth="1px" lineColor="#ffffff" lineBorderRadius="4px">
          {renderNode(tree)}
        </Tree>
      </div>
    </div>
  );
}
