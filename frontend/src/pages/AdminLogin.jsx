// ✅ 파일 위치: src/pages/AdminLogin.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../axiosConfig";

export default function AdminLogin() {
  console.log("✅ AdminLogin 렌더링됨; hash =", window.location.hash);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const navigate                 = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");  // 이전 에러 지우기
    try {
      const res = await axios.post("/api/admin-login", { username, password });
      // 로그인 성공
      if (res.data.success) {
        localStorage.setItem("admin", JSON.stringify(res.data.admin));
        navigate("/admin/notices", { replace: true });
      } else {
        // 응답은 왔지만 success=false
        setError(res.data.message || "⚠️ 로그인에 실패했습니다.");
      }
    } catch (err) {
      console.error("로그인 오류:", err);
      if (err.response) {
        // 서버가 응답했을 때
        if (err.response.status === 401) {
          setError("⚠️ 아이디 또는 비밀번호가 틀렸습니다.");
        } else {
          setError("❌ 서버 오류가 발생했습니다.");
        }
      } else {
        // 네트워크 등
        setError("❌ 네트워크 오류가 발생했습니다.");
      }
    }
  };

  return (
    <div
      style={{
        maxWidth: "400px",
        margin: "80px auto",
        padding: "2rem",
        backgroundColor: "#fff",
        border: "2px solid #ccc",
        borderRadius: "12px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        textAlign: "center",
      }}
    >
      <h1
        style={{
          fontSize: "24px",
          marginBottom: "1.5rem",
          color: "#1f2937",
        }}
      >
        🛡 관리자 로그인 페이지
      </h1>

      <form
        onSubmit={handleLogin}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        <input
          type="text"
          placeholder="관리자 아이디"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{
            padding: "0.75rem",
            fontSize: "16px",
            border: "1px solid #ccc",
            borderRadius: "6px",
          }}
          required
        />
        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            padding: "0.75rem",
            fontSize: "16px",
            border: "1px solid #ccc",
            borderRadius: "6px",
          }}
          required
        />

        <button
          type="submit"
          style={{
            padding: "0.75rem",
            backgroundColor: "#2563eb",
            color: "white",
            border: "none",
            fontSize: "16px",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          🔐 관리자 로그인
        </button>

        {error && (
          <p
            style={{
              marginTop: "0.5rem",
              color: "red",
              fontWeight: "bold",
            }}
          >
            {error}
          </p>
        )}
      </form>
    </div>
  );
}
