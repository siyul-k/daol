import React, { useState, useEffect } from "react";
import axios from "../axiosConfig";
import { Tree, TreeNode } from "react-organizational-chart";
import "./OrgChart.css";

/** ─── 1) 박스 렌더링 컴포넌트 ─── */
const OrgBox = ({ node }) => (
  <div className="org-box">
    <div className="org-id">{node.username}</div>
    <div className="org-name">{node.name || "-"}</div>
    <div className="org-date">{node.created_at?.slice(2, 10)}</div>
    <div className="org-sales">({node.sales.toLocaleString()})</div>
  </div>
);

/** ─── 2) 재귀 탐색: username 에 해당하는 노드만 리턴 ─── */
const findSubtree = (node, username) => {
  if (node.username === username) return node;
  for (const child of node.children || []) {
    const found = findSubtree(child, username);
    if (found) return found;
  }
  return null;
};

/** ─── 3) 재귀 렌더러 ─── */
const renderNode = (node) => (
  <TreeNode key={node.username} label={<OrgBox node={node} />}>
    {node.children?.map(renderNode)}
  </TreeNode>
);

/** ─── 4) 메인 컴포넌트 ─── */
export default function AdminTreeSponsorPage({ currentUser }) {
  const [tree, setTree] = useState(null);

  useEffect(() => {
    axios
      .get("/api/tree/sponsor")
      .then((res) => {
        if (!res.data.success || !res.data.tree.length) return;
        // 전체 트리 중 첫 번째 루트
        const fullRoot = res.data.tree[0];
        if (currentUser) {
          // 본인 서브트리만 찾아서 세팅
          const subtree = findSubtree(fullRoot, currentUser);
          setTree(subtree || { ...fullRoot, children: [] });
        } else {
          // 관리자 모드: 전체 트리
          setTree(fullRoot);
        }
      })
      .catch(console.error);
  }, [currentUser]);

  if (!tree) return <p>불러오는 중…</p>;

  return (
    <div className="org-wrapper">
      <h1>후원 계보 조직도</h1>
      <div className="org-container">
        <Tree lineWidth="1px" lineColor="#ffffff" lineBorderRadius="4px">
          {renderNode(tree)}
        </Tree>
      </div>
    </div>
  );
}
