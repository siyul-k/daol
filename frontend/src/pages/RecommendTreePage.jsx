// ✅ 파일 경로: src/pages/RecommendTreePage.jsx
import React, { useEffect, useState } from "react";
import axios from "../axiosConfig";
import { Tree, TreeNode } from "react-organizational-chart";
import moment from "moment-timezone";
import "./OrgChart.css";

const OrgBox = ({ node }) => {
  const date = node.created_at
    ? moment(node.created_at).tz("Asia/Seoul").format("YY-MM-DD")
    : "-";

  return (
    <div
      className="org-box"
      data-id={node.id}
      data-username={node.username}
    >
      <div className="org-id">{node.username}</div>
      <div className="org-name">{node.name || "-"}</div>
      <div className="org-date">{date}</div>
      <div className="org-sales">({Number(node.sales).toLocaleString()})</div>
    </div>
  );
};

const renderNode = (node) => (
  <TreeNode key={node.id} label={<OrgBox node={node} />}>
    {node.children?.map((child) => renderNode(child))}
  </TreeNode>
);

export default function RecommendTreePage() {
  const currentUser = JSON.parse(localStorage.getItem("user"));
  const [tree, setTree] = useState(null);
  const [searchId, setSearchId] = useState("");
  const [scale, setScale] = useState(1);

  // 배율 조정
  const changeScale = (delta) => {
    setScale((prev) => {
      let next = prev + delta;
      if (next < 0.1) next = 0.1;
      if (next > 2) next = 2;
      return parseFloat(next.toFixed(2));
    });
  };

  useEffect(() => {
    axios
      .get(`/api/tree/recommend?id=${currentUser.id}`)
      .then((res) => {
        if (res.data.success && res.data.tree) {
          setTree(res.data.tree);
        }
      })
      .catch(console.error);
  }, []);

  const handleSearch = () => {
    if (!searchId.trim()) return;
    let nodeEl = document.querySelector(
      `.org-box[data-username="${searchId.trim()}"]`
    );
    if (!nodeEl) {
      nodeEl = document.querySelector(`.org-box[data-id="${searchId.trim()}"]`);
    }
    if (nodeEl) {
      nodeEl.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "center",
      });
    } else {
      alert("해당 ID의 회원을 찾을 수 없습니다.");
    }
  };

  if (!tree) return <p>불러오는 중…</p>;

  return (
    <div className="org-wrapper">
      <h1>추천 계보 조직도</h1>

      {/* 검색창 */}
      <div
        style={{
          margin: "12px 0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        <input
          className="org-search-input"
          type="text"
          placeholder="회원 ID 검색"
          value={searchId}
          onChange={(e) => setSearchId(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          style={{
            padding: "6px 12px",
            borderRadius: 4,
            border: "1px solid #ccc",
            background: "#fff",
            color: "#000",
            outline: "none",
            width: 220,
          }}
        />
        <button
          onClick={handleSearch}
          style={{
            padding: "6px 14px",
            borderRadius: 4,
            border: "none",
            background: "#3388ff",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          검색
        </button>
      </div>

      {/* 확대/축소 컨트롤 */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "rgba(0,0,0,0.45)",
            color: "#fff",
            padding: "6px 8px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.18)",
            backdropFilter: "blur(4px)",
          }}
        >
          <button
            onClick={() => changeScale(-0.1)}
            style={{ background: "transparent", border: "none", color: "inherit", fontSize: 16, cursor: "pointer" }}
          >
            –
          </button>
          <select
            value={scale}
            onChange={(e) => setScale(parseFloat(e.target.value))}
            style={{
              background: "#0f172a",
              color: "#fff",
              border: "1px solid #334155",
              borderRadius: 6,
              padding: "2px 8px",
              outline: "none",
            }}
          >
            {[1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1].map((v) => (
              <option key={v} value={v} style={{ color: "#fff", background: "#0f172a" }}>
                {v}x
              </option>
            ))}
          </select>
          <button
            onClick={() => changeScale(0.1)}
            style={{ background: "transparent", border: "none", color: "inherit", fontSize: 16, cursor: "pointer" }}
          >
            +
          </button>
        </div>
      </div>

      {/* 조직도 */}
      <div className="org-container">
        <div style={{ transform: `scale(${scale})`, transformOrigin: "top center" }}>
          <Tree lineWidth="1px" lineColor="#ffffff" lineBorderRadius="4px">
            {renderNode(tree)}
          </Tree>
        </div>
      </div>
    </div>
  );
}
