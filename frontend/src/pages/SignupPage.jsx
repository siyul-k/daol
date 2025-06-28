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
    phone: "",
  });

  // 유저네임: 영어, 숫자만 허용
  const usernameRegex = /^[a-zA-Z0-9]*$/;

  // 입력 변경 핸들러
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "username") {
      if (!usernameRegex.test(value)) return; // 영어, 숫자 외 입력 무시
    }
    setForm({ ...form, [name]: value });
  };

  // 유저 정보 확인 (센터, 추천인)
  const checkUser = async (type) => {
  try {
    const value = form[type];
    if (!value) return;
    let res;
    if (type === "center") {
      res = await axios.get(`/api/lookup/center`, {
        params: { center: value },
      });
      setForm((prev) => ({ ...prev, centerName: res.data.owner_name }));
    } else if (type === "recommender") {
      res = await axios.get(`/api/lookup/recommender`, {
        params: { username: value },
      });
      setForm((prev) => ({ ...prev, recommenderName: res.data.name }));
    }
  } catch (err) {
    alert("아이디를 확인하세요");
    if (type === "center") {
      setForm((prev) => ({ ...prev, centerName: "" }));
    } else if (type === "recommender") {
      setForm((prev) => ({ ...prev, recommenderName: "" }));
    }
  }
};


  // 회원가입 요청
  const handleSubmit = async (e) => {
    e.preventDefault();

    // 아이디 입력 체크 (영어+숫자)
    if (!usernameRegex.test(form.username) || !form.username) {
      alert("아이디는 영어와 숫자만 입력 가능합니다.");
      return;
    }

    try {
      // 1. username → id 변환 (각 API로 조회)
      const [centerRes, recommenderRes] = await Promise.all([
        axios.get(`/api/lookup/center`, { params: { center: form.center } }),
        axios.get(`/api/lookup/recommender`, { params: { username: form.recommender } }),
      ]);

      const center_id = centerRes.data.id;
      const recommender_id = recommenderRes.data.id;

      if (!center_id || !recommender_id) {
        alert("센터/추천인 아이디를 확인하세요.");
        return;
      }

      // 2. id값 기반 회원가입 요청
      const payload = {
        username: form.username,
        password: form.password,
        name: form.name,
        email: form.email,
        phone: form.phone,
        center_id,
        recommender_id,
      };

      const res = await axios.post(`/api/signup`, payload);
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
          회원등록 신청
        </h1>
        <p style={{ textAlign: "center", marginBottom: "1.5rem", color: "#6b7280" }}>
          아래 항목을 입력해주세요
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <input
            name="username"
            placeholder="아이디(영어/숫자만)"
            value={form.username}
            onChange={handleChange}
            required
            autoComplete="off"
            pattern="^[a-zA-Z0-9]+$"
            title="아이디는 영어와 숫자만 입력 가능합니다."
            maxLength={20}
          />
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
