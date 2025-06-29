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

  const [errors, setErrors] = useState({});
  const [centerChecked, setCenterChecked] = useState(false);
  const [recommenderChecked, setRecommenderChecked] = useState(false);

  const usernameRegex = /^[a-zA-Z0-9]*$/;

  // 입력 변경 핸들러 (입력 시 체크 해제)
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
    if (name === "center") setCenterChecked(false);
    if (name === "recommender") setRecommenderChecked(false);
  };

  // 센터/추천인 정보 확인
  const checkUser = async (type) => {
    setErrors((prev) => ({ ...prev, [type + "Check"]: "" }));
    try {
      const value = form[type];
      if (!value) {
        setErrors((prev) => ({ ...prev, [type]: "이 항목을 입력해주세요." }));
        return;
      }
      let res;
      if (type === "center") {
        res = await axios.get(`/api/lookup/center`, { params: { center: value } });
        setForm((prev) => ({ ...prev, centerName: res.data.owner_name }));
        setCenterChecked(true);
      } else if (type === "recommender") {
        res = await axios.get(`/api/lookup/recommender`, { params: { username: value } });
        setForm((prev) => ({ ...prev, recommenderName: res.data.name }));
        setRecommenderChecked(true);
      }
    } catch (err) {
      if (type === "center") {
        setForm((prev) => ({ ...prev, centerName: "" }));
        setCenterChecked(false);
        setErrors((prev) => ({ ...prev, center: "존재하지 않는 센터입니다." }));
      } else if (type === "recommender") {
        setForm((prev) => ({ ...prev, recommenderName: "" }));
        setRecommenderChecked(false);
        setErrors((prev) => ({ ...prev, recommender: "존재하지 않는 추천인입니다." }));
      }
    }
  };

  // 회원가입 요청
  const handleSubmit = async (e) => {
    e.preventDefault();

    // 필수 입력 체크
    const newErrors = {};
    if (!form.username) newErrors.username = "이 항목을 입력해주세요.";
    else if (!usernameRegex.test(form.username)) newErrors.username = "영어/숫자만 입력하세요.";
    if (!form.name) newErrors.name = "이 항목을 입력해주세요.";
    if (!form.password) newErrors.password = "이 항목을 입력해주세요.";
    if (!form.center) newErrors.center = "이 항목을 입력해주세요.";
    if (!form.recommender) newErrors.recommender = "이 항목을 입력해주세요.";
    if (!form.phone) newErrors.phone = "이 항목을 입력해주세요.";

    if (!centerChecked) newErrors.centerCheck = "센터장 확인 버튼을 눌러주세요.";
    if (!recommenderChecked) newErrors.recommenderCheck = "추천인 확인 버튼을 눌러주세요.";

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) return;

    try {
      // id값 기반 회원가입 요청
      const [centerRes, recommenderRes] = await Promise.all([
        axios.get(`/api/lookup/center`, { params: { center: form.center } }),
        axios.get(`/api/lookup/recommender`, { params: { username: form.recommender } }),
      ]);
      const center_id = centerRes.data.id;
      const recommender_id = recommenderRes.data.id;

      const payload = {
        username: form.username,
        password: form.password,
        name: form.name,
        email: form.email,
        phone: form.phone,
        center_id,
        recommender_id,
      };

      await axios.post(`/api/signup`, payload);
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

  // 인풋 스타일
  const inputStyle = (err) => ({
    border: err ? "1.5px solid #ef4444" : "1px solid #d1d5db",
    outline: "none",
    borderRadius: "6px",
    padding: "12px",
    fontSize: "15px",
    background: "#fafafa",
    color: "#222",
    marginBottom: "2px"
  });

  // 파란 버튼 스타일
  const blueBtnStyle = {
    padding: "0.75rem",
    backgroundColor: "#3b82f6",
    color: "white",
    fontWeight: "bold",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
    transition: "background 0.2s",
  };

  const blueBtnHover = {
    backgroundColor: "#2563eb"
  };

  // 버튼에 hover 스타일 적용 위해 상태 사용
  const [centerBtnHover, setCenterBtnHover] = useState(false);
  const [recBtnHover, setRecBtnHover] = useState(false);

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
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>
          {/* 아이디 */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <input
              name="username"
              placeholder="아이디(영어/숫자만)"
              value={form.username}
              onChange={handleChange}
              style={inputStyle(errors.username)}
              autoComplete="off"
              maxLength={20}
            />
            {errors.username && (
              <span style={{ color: "#ef4444", fontSize: "13px", marginLeft: "4px" }}>
                {errors.username}
              </span>
            )}
          </div>
          {/* 이름 */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <input
              name="name"
              placeholder="이름"
              value={form.name}
              onChange={handleChange}
              style={inputStyle(errors.name)}
              autoComplete="off"
            />
            {errors.name && (
              <span style={{ color: "#ef4444", fontSize: "13px", marginLeft: "4px" }}>
                {errors.name}
              </span>
            )}
          </div>
          {/* 이메일 */}
          <input
            name="email"
            placeholder="Email (선택)"
            value={form.email}
            onChange={handleChange}
            style={inputStyle(false)}
            autoComplete="off"
          />
          {/* 비밀번호 */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <input
              type="password"
              name="password"
              placeholder="비밀번호"
              value={form.password}
              onChange={handleChange}
              style={inputStyle(errors.password)}
              autoComplete="off"
            />
            {errors.password && (
              <span style={{ color: "#ef4444", fontSize: "13px", marginLeft: "4px" }}>
                {errors.password}
              </span>
            )}
          </div>

          {/* 센터 + 확인버튼 */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <input
                name="center"
                placeholder="센터"
                value={form.center}
                onChange={handleChange}
                style={inputStyle(errors.center)}
                autoComplete="off"
              />
              {errors.center && (
                <span style={{ color: "#ef4444", fontSize: "13px", marginLeft: "4px" }}>
                  {errors.center}
                </span>
              )}
            </div>
            <button
              type="button"
              style={centerBtnHover ? { ...blueBtnStyle, ...blueBtnHover, minWidth: 80 } : { ...blueBtnStyle, minWidth: 80 }}
              onClick={() => checkUser("center")}
              onMouseEnter={() => setCenterBtnHover(true)}
              onMouseLeave={() => setCenterBtnHover(false)}
            >
              센터장 확인
            </button>
          </div>
          {/* 센터장 이름 */}
          <input value={form.centerName || ""} placeholder="센터장" disabled style={inputStyle(false)} />
          {errors.centerCheck && (
            <span style={{ color: "#ef4444", fontSize: "13px", marginLeft: "4px" }}>
              {errors.centerCheck}
            </span>
          )}

          {/* 추천인 + 확인버튼 */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <input
                name="recommender"
                placeholder="추천인"
                value={form.recommender}
                onChange={handleChange}
                style={inputStyle(errors.recommender)}
                autoComplete="off"
              />
              {errors.recommender && (
                <span style={{ color: "#ef4444", fontSize: "13px", marginLeft: "4px" }}>
                  {errors.recommender}
                </span>
              )}
            </div>
            <button
              type="button"
              style={recBtnHover ? { ...blueBtnStyle, ...blueBtnHover, minWidth: 80 } : { ...blueBtnStyle, minWidth: 80 }}
              onClick={() => checkUser("recommender")}
              onMouseEnter={() => setRecBtnHover(true)}
              onMouseLeave={() => setRecBtnHover(false)}
            >
              추천인 확인
            </button>
          </div>
          {/* 추천인 이름 */}
          <input value={form.recommenderName || ""} placeholder="추천인 이름" disabled style={inputStyle(false)} />
          {errors.recommenderCheck && (
            <span style={{ color: "#ef4444", fontSize: "13px", marginLeft: "4px" }}>
              {errors.recommenderCheck}
            </span>
          )}

          {/* 핸드폰 */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <input
              name="phone"
              placeholder="핸드폰번호"
              value={form.phone}
              onChange={handleChange}
              style={inputStyle(errors.phone)}
              autoComplete="off"
              maxLength={20}
            />
            {errors.phone && (
              <span style={{ color: "#ef4444", fontSize: "13px", marginLeft: "4px" }}>
                {errors.phone}
              </span>
            )}
          </div>

          <button
            type="submit"
            style={blueBtnStyle}
            onMouseDown={e => e.currentTarget.style.background = "#2563eb"}
            onMouseUp={e => e.currentTarget.style.background = "#3b82f6"}
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
