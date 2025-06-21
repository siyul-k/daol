// ✅ 파일 경로: frontend/src/pages/AdminTreePage.jsx
import React, { useEffect, useState } from "react";
import axios from "../axiosConfig";

// ✅ 노드 박스 컴포넌트
const TreeNode = ({ node }) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div id={node.username} style={{ marginTop: "2rem", textAlign: "center" }}>
      <div
        style={{
          display: "inline-block",
          padding: "1rem",
          backgroundColor: "#1e293b",
          color: "#d1fae5",
          borderRadius: "0.75rem",
          boxShadow: "0 0 8px rgba(0,0,0,0.4)",
          minWidth: "180px",
          cursor: "pointer",
        }}
        onClick={() => setIsOpen(!isOpen)}
        title="클릭하여 하위 조직 열기/닫기"
      >
        <div style={{ fontWeight: "bold", fontSize: "16px" }}>{node.username}</div>
        <div>{node.name || "-"}</div>
        <div style={{ fontSize: "12px", marginTop: "4px" }}>
          {node.created_at?.slice(2, 10)}
        </div>
        <div style={{ fontSize: "12px", color: "#a7f3d0" }}>
          ({node.sales.toLocaleString()})
        </div>
        {node.children?.length > 0 && (
          <div style={{ marginTop: "4px", fontSize: "12px", color: "#38bdf8" }}>
            {isOpen ? "▼ 닫기" : "▶ 열기"}
          </div>
        )}
      </div>

      {isOpen && node.children?.length > 0 && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: "2rem",
            borderTop: "1px solid #ccc",
            paddingTop: "2rem",
            flexWrap: "wrap",
            gap: "2rem",
          }}
        >
          {node.children.map((child) => (
            <TreeNode key={child.username} node={child} />
          ))}
        </div>
      )}
    </div>
  );
};

export default function AdminTreePage() {
  const [tree, setTree] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTree();
  }, []);

  const fetchTree = async () => {
    try {
      const res = await axios.get("/tree/full");
      if (res.data.success) {
        setTree(res.data.tree);
      }
    } catch (err) {
      console.error("트리 불러오기 실패:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        padding: "2rem",
        backgroundColor: "#111827",
        minHeight: "100vh",
        color: "#fff",
      }}
    >
      <h1 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "1.5rem" }}>
        추천 계보 조직도
      </h1>

      {loading ? (
        <p>불러오는 중...</p>
      ) : tree && tree.username ? (
        <TreeNode node={tree} />
      ) : (
        <p>조직도 데이터가 없습니다.</p>
      )}
    </div>
  );
}
