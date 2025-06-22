// ✅ 파일 경로: frontend/src/pages/AdminTreePage.jsx
import React, { useEffect, useState } from "react";
import axios from "../axiosConfig";
import { Tree, TreeNode } from "react-organizational-chart";
import "./OrgChart.css"; // 공통 CSS (박스 스타일 포함)

// ✅ 노드 박스 컴포넌트
const OrgBox = ({ node }) => (
  <div className="org-box">
    <div className="org-id">{node.username}</div>
    <div className="org-name">{node.name || "-"}</div>
    <div className="org-date">{node.created_at?.slice(2, 10)}</div>
    <div className="org-sales">({Number(node.sales || 0).toLocaleString()})</div>
  </div>
);

// ✅ 재귀 렌더링 함수
const renderNode = (node) => (
  <TreeNode key={node.username} label={<OrgBox node={node} />}>
    {node.children?.map(renderNode)}
  </TreeNode>
);

export default function AdminTreePage() {
  const [tree, setTree] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get("/api/tree/full")
      .then((res) => {
        if (res.data.success && res.data.tree?.length > 0) {
          setTree(res.data.tree[0]); // 전체 트리의 최상위 노드 기준
        }
      })
      .catch((err) => {
        console.error("추천 트리 불러오기 실패:", err);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ padding: "2rem", color: "#fff" }}>불러오는 중...</p>;
  if (!tree) return <p style={{ padding: "2rem", color: "#fff" }}>조직도 데이터가 없습니다.</p>;

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
