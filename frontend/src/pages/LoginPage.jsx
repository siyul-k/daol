// ✅ 파일 경로: src/pages/LoginPage.jsx

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "../axiosConfig";
import logo from "../assets/logo.png";  // 로고 이미지 임포트

export default function LoginPage() {
  console.log("📌 일반 LoginPage 렌더링됨");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`/api/login`, {
        username,
        password,
      });

      if (res.data.success) {
        localStorage.setItem("user", JSON.stringify(res.data.user));
        localStorage.setItem("username", res.data.user.username);
        navigate("/dashboard");
      } else {
        setError(res.data.message || "로그인 실패");
      }
    } catch (err) {
      console.error("❌ 로그인 오류:", err);
      setError("ID 또는 비밀번호를 확인하세요.");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f3f4f6",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          padding: "2rem",
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
          textAlign: "center",
        }}
      >
        {/* 로그인 박스 내 상단에 로고 넣기, 최대 너비 200px, 여백 설정 */}
        <img
          src={logo}
          alt="로고"
          style={{
            maxWidth: "200px",
            width: "100%",
            height: "auto",
            margin: "0 auto 1.5rem",
            display: "block",
          }}
        />

        <h1 style={{ fontSize: "20px", marginBottom: "1.5rem", fontWeight: "bold" }}></h1>

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <input
            type="text"
            placeholder="아이디"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{
              padding: "0.75rem",
              fontSize: "16px",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
            }}
          />
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              padding: "0.75rem",
              fontSize: "16px",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
            }}
          />
          <button
            type="submit"
            style={{
              padding: "0.75rem",
              backgroundColor: "#3b82f6",
              color: "white",
              fontWeight: "bold",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            로그인
          </button>
          {error && <p style={{ color: "red", fontWeight: "bold" }}>{error}</p>}
        </form>

        <div style={{ marginTop: "1.5rem", fontSize: "14px", color: "#6b7280" }}>
          <Link to="/signup" style={{ marginRight: "1rem", color: "#374151", textDecoration: "underline" }}>
            회원가입
          </Link>
          <span style={{ color: "#9ca3af" }}>|</span>
          <a href="#" style={{ marginLeft: "1rem", color: "#374151", textDecoration: "underline" }}>
            비밀번호 찾기
          </a>
        </div>
      </div>
    </div>
  );
}
