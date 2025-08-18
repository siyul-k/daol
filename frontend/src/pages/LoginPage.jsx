// ✅ 파일 경로: src/pages/LoginPage.jsx

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "../axiosConfig";
import cityBg from "../assets/city-bg.jpg"; // ← 도시 배경 이미지 추가

export default function LoginPage() {
  console.log("📌 다크테마 LoginPage 렌더링됨");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`/api/login`, { username, password });

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
        backgroundImage: `url(${cityBg})`,   // 🔥 도시 배경 이미지 적용
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        position: "relative",
      }}
    >
      {/* 배경 어둡게 오버레이 */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.3)", // 살짝 어둡게
          zIndex: 0,
        }}
      />

      {/* 로그인 카드 */}
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          padding: "2.5rem",
          background: "rgba(30,33,57,0.6)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "16px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
          backdropFilter: "blur(12px)",
          textAlign: "center",
          zIndex: 1,
        }}
      >
        {/* DAOL 타이틀 */}
        <h1
          style={{
            fontSize: "32px",
            fontWeight: "bold",
            background: "linear-gradient(to right, #00c6ff, #0072ff)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            marginBottom: "1rem",
          }}
        >
          DAOL
        </h1>
        <p style={{ color: "#d1d5db", marginBottom: "2rem", fontSize: "14px" }}>
          
        </p>

        {/* 로그인 폼 */}
        <form
          onSubmit={handleLogin}
          style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
        >
          <input
            type="text"
            placeholder="아이디"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{
              padding: "0.85rem",
              fontSize: "16px",
              borderRadius: "8px",
              border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(255,255,255,0.05)",
              color: "white",
              outline: "none",
            }}
          />
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              padding: "0.85rem",
              fontSize: "16px",
              borderRadius: "8px",
              border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(255,255,255,0.05)",
              color: "white",
              outline: "none",
            }}
          />
          <button
            type="submit"
            style={{
              padding: "0.85rem",
              fontSize: "16px",
              fontWeight: "bold",
              borderRadius: "8px",
              border: "none",
              background:
                "linear-gradient(90deg, #3b82f6 0%, #9333ea 100%)",
              color: "white",
              cursor: "pointer",
              transition: "0.3s",
            }}
          >
            로그인
          </button>
          {error && <p style={{ color: "#f87171", fontWeight: "bold" }}>{error}</p>}
        </form>

        {/* 하단 링크 */}
        <div
          style={{
            marginTop: "1.5rem",
            fontSize: "14px",
            display: "flex",
            justifyContent: "space-between",
            color: "#9ca3af",
          }}
        >
          <Link
            to="/signup"
            style={{
              color: "#00c6ff",
              textDecoration: "none",
              fontWeight: "bold",
            }}
          >
            회원가입
          </Link>
          <a
            href="#"
            style={{
              color: "#00c6ff",
              textDecoration: "none",
              fontWeight: "bold",
            }}
          >
            비밀번호 찾기
          </a>
        </div>
      </div>
    </div>
  );
}
