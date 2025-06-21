import React, { useEffect, useState } from "react";
import axios from "../axiosConfig";
import { useAuth } from "../hooks/useAuth";

// ✅ 박스 컴포넌트
const TreeNode = ({ node }) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div id={node.username} style={{ marginTop: "2rem", textAlign: "center" }}>
      <div
        style={{
          display: "inline-block",
          padding: "1rem",
          backgroundColor: "#064e3b",
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
        <div style={{ fontSize: "12px", marginTop: "4px" }}>{node.created_at?.slice(2, 10)}</div>
        <div style={{ fontSize: "12px", color: "#6ee7b7" }}>
          ({node.sales.toLocaleString()} PV)
        </div>
        {node.children?.length > 0 && (
          <div style={{ marginTop: "4px", fontSize: "12px", color: "#34d399" }}>
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

export default function SponsorTreePage() {
  const { username } = useAuth();
  const [tree, setTree] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTree = async () => {
      try {
        const res = await axios.get(`/api/tree/sponsor?username=${username}`);
        if (res.data.success && res.data.tree.length > 0) {
          setTree(res.data.tree[0]);
        }
      } catch (err) {
        console.error("후원트리 불러오기 실패:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTree();
  }, [username]);

  return (
    <div style={{ padding: "2rem", backgroundColor: "#0f172a", minHeight: "100vh", color: "#fff" }}>
      <h1 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "1.5rem" }}>
        후원 계보 조직도
      </h1>
      {loading ? <p>불러오는 중...</p> : tree ? <TreeNode node={tree} /> : <p>데이터 없음</p>}
    </div>
  );
}
