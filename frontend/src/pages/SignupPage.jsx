// ✅ 파일 경로: frontend/src/pages/SignupPage.jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "../axiosConfig";

export default function SignupPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: "",
    name: "",
    email: "",
    password: "",
    center: "",
    centerName: "",
    recommender: "",
    recommenderName: "",
    sponsor: "",
    sponsorName: "",
    sponsor_direction: "",
    phone: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const checkUser = async (type) => {
    try {
      const value = form[type];
      if (!value) return;

      let res;

      if (type === "center") {
        res = await axios.get(`/api/lookup/center`, {
          params: { center: value },
        });
      } else if (type === "recommender") {
        res = await axios.get(`/api/lookup/recommender`, {
          params: { username: value },
        });
      } else if (type === "sponsor") {
        if (!form.sponsor_direction) {
          alert("후원 방향을 선택해주세요");
          return;
        }

        res = await axios.get(`/api/lookup/sponsor`, {
          params: {
            username: value,
            direction: form.sponsor_direction,
          },
        });

        if (!res.data.available) {
          alert("이미 해당 방향에 하위 회원이 존재합니다");
          return;
        }
      }

      const nameKey = type + "Name";
      setForm((prev) => ({ ...prev, [nameKey]: res.data.name }));
    } catch (err) {
      console.error(err);
      alert("아이디를 확인하세요");
      const nameKey = type + "Name";
      setForm((prev) => ({ ...prev, [nameKey]: "" }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await axios.post(`/api/signup`, form);
      alert("가입이 성공적으로 완료되었습니다!");
      navigate("/login");
    } catch (err) {
      if (err.response && err.response.status === 400) {
        alert(err.response.data.message);
      } else {
        alert("서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
        console.error(err);
      }
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
          maxWidth: "480px",
          padding: "2rem",
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
        }}
      >
        <h1 style={{ fontSize: "20px", marginBottom: "1rem", fontWeight: "bold", textAlign: "center" }}>
          🚀 Please join us 🚀
        </h1>
        <p style={{ textAlign: "center", marginBottom: "1.5rem", color: "#6b7280" }}>
          아래 항목을 입력해주세요
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <input name="username" placeholder="아이디" value={form.username} onChange={handleChange} required />
          <input name="name" placeholder="이름" value={form.name} onChange={handleChange} required />
          <input name="email" placeholder="Email (선택)" value={form.email} onChange={handleChange} />
          <input type="password" name="password" placeholder="비밀번호" value={form.password} onChange={handleChange} required />

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input name="center" placeholder="센터" value={form.center} onChange={handleChange} required />
            <button type="button" onClick={() => checkUser("center")}>센터장 확인</button>
          </div>
          <input value={form.centerName || ""} placeholder="센터장" disabled />

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input name="recommender" placeholder="추천인" value={form.recommender} onChange={handleChange} required />
            <button type="button" onClick={() => checkUser("recommender")}>추천인 확인</button>
          </div>
          <input value={form.recommenderName || ""} placeholder="추천인 이름" disabled />

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input name="sponsor" placeholder="후원인" value={form.sponsor} onChange={handleChange} required />
            <button type="button" onClick={() => checkUser("sponsor")}>후원인 확인</button>
          </div>
          <input value={form.sponsorName || ""} placeholder="후원인 이름" disabled />

          <div>
            <label>
              <input
                type="radio"
                name="sponsor_direction"
                value="L"
                checked={form.sponsor_direction === "L"}
                onChange={handleChange}
              /> 좌측
            </label>
            <label style={{ marginLeft: "1rem" }}>
              <input
                type="radio"
                name="sponsor_direction"
                value="R"
                checked={form.sponsor_direction === "R"}
                onChange={handleChange}
              /> 우측
            </label>
          </div>

          <input name="phone" placeholder="핸드폰번호" value={form.phone} onChange={handleChange} required />

          <button
            type="submit"
            style={{
              padding: "0.75rem",
              backgroundColor: "#3b82f6",
              color: "white",
              fontWeight: "bold",
              borderRadius: "6px",
              border: "none"
            }}
          >
            회원가입
          </button>
        </form>

        <div style={{ marginTop: "1rem", textAlign: "center" }}>
          <Link to="/login" style={{ fontSize: "14px", color: "#374151", textDecoration: "underline" }}>
            로그인
          </Link>
        </div>
      </div>
    </div>
  );
}
