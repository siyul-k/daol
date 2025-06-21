// ✅ 파일 경로: src/pages/RecommendTreePage.jsx
import React, { useEffect, useState } from "react";
import axios from "../axiosConfig";
import { Tree, TreeNode } from "react-organizational-chart";
import "./OrgChart.css";

const OrgBox = ({ node }) => (
  <div className="org-box">
    <div className="org-id">{node.username}</div>
    <div className="org-name">{node.name || "-"}</div>
    <div className="org-date">{node.created_at?.slice(2, 10)}</div>
    <div className="org-sales">({node.sales.toLocaleString()})</div>
  </div>
);

const renderNode = (node) => (
  <TreeNode key={node.username} label={<OrgBox node={node} />}>
    {node.children?.map(renderNode)}
  </TreeNode>
);

export default function RecommendTreePage() {
  const [tree, setTree] = useState(null);
  const currentUser = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    axios
      .get(`/api/tree/recommend?username=${currentUser.username}`)
      .then((res) => {
        if (res.data.success) {
          setTree(res.data.tree);
        }
      })
      .catch(console.error);
  }, []);

  if (!tree) return <p>불러오는 중…</p>;

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
