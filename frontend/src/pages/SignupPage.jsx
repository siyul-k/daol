// ✅ 파일 경로: frontend/src/pages/SignupPage.jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "../axiosConfig";
import cityBg from "../assets/city-bg.jpg"; // 🔥 도시 네온 배경

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "", [`${name}Check`]: "" }));

    if (name === "center") setCenterChecked(false);
    if (name === "recommender") setRecommenderChecked(false);
  };

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
        setForm((prev) => ({ ...prev, centerName: res.data.owner_name || res.data.name || "" }));
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

  const handleSubmit = async (e) => {
    e.preventDefault();
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

  const inputStyle = (err) => ({
    border: err ? "1.5px solid #ef4444" : "1px solid rgba(255,255,255,0.2)",
    outline: "none",
    borderRadius: "8px",
    padding: "12px",
    fontSize: "15px",
    background: "rgba(255,255,255,0.05)",
    color: "white",
    marginBottom: "2px",
  });

  const blueBtnStyle = {
    padding: "0.75rem",
    background: "linear-gradient(90deg, #3b82f6 0%, #9333ea 100%)",
    color: "white",
    fontWeight: "bold",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundImage: `url(${cityBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.55)",
          zIndex: 0,
        }}
      />
      <div
        style={{
          width: "100%",
          maxWidth: "500px",
          padding: "2.5rem",
          background: "rgba(30,33,57,0.6)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "16px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
          backdropFilter: "blur(12px)",
          zIndex: 1,
        }}
      >
        <h1
          style={{
            fontSize: "28px",
            fontWeight: "bold",
            textAlign: "center",
            marginBottom: "1rem",
            background: "linear-gradient(to right, #00c6ff, #0072ff)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          회원등록
        </h1>
        <p style={{ textAlign: "center", marginBottom: "1.5rem", color: "#d1d5db" }}>
          아래 항목을 입력해주세요
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
          {/* 아이디 */}
          <input
            name="username"
            placeholder="아이디(영어/숫자만)"
            value={form.username}
            onChange={handleChange}
            style={inputStyle(errors.username)}
            autoComplete="off"
            maxLength={20}
          />
          {errors.username && <span style={{ color: "#f87171", fontSize: "13px" }}>{errors.username}</span>}

          {/* 이름 */}
          <input
            name="name"
            placeholder="이름"
            value={form.name}
            onChange={handleChange}
            style={inputStyle(errors.name)}
            autoComplete="off"
          />
          {errors.name && <span style={{ color: "#f87171", fontSize: "13px" }}>{errors.name}</span>}

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
          <input
            type="password"
            name="password"
            placeholder="비밀번호"
            value={form.password}
            onChange={handleChange}
            style={inputStyle(errors.password)}
            autoComplete="off"
          />
          {errors.password && <span style={{ color: "#f87171", fontSize: "13px" }}>{errors.password}</span>}

          {/* 센터 + 확인 */}
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input
              name="center"
              placeholder="센터"
              value={form.center}
              onChange={handleChange}
              style={{ ...inputStyle(errors.center), flex: 1 }}
              autoComplete="off"
            />
            <button type="button" style={blueBtnStyle} onClick={() => checkUser("center")}>
              센터장 확인
            </button>
          </div>
          <input value={form.centerName || ""} placeholder="센터장" disabled style={inputStyle(false)} />
          {errors.center && <span style={{ color: "#f87171", fontSize: "13px" }}>{errors.center}</span>}
          {errors.centerCheck && <span style={{ color: "#f87171", fontSize: "13px" }}>{errors.centerCheck}</span>}

          {/* 추천인 + 확인 */}
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input
              name="recommender"
              placeholder="추천인"
              value={form.recommender}
              onChange={handleChange}
              style={{ ...inputStyle(errors.recommender), flex: 1 }}
              autoComplete="off"
            />
            <button type="button" style={blueBtnStyle} onClick={() => checkUser("recommender")}>
              추천인 확인
            </button>
          </div>
          <input value={form.recommenderName || ""} placeholder="추천인 이름" disabled style={inputStyle(false)} />
          {errors.recommender && <span style={{ color: "#f87171", fontSize: "13px" }}>{errors.recommender}</span>}
          {errors.recommenderCheck && <span style={{ color: "#f87171", fontSize: "13px" }}>{errors.recommenderCheck}</span>}

          {/* 핸드폰 */}
          <input
            name="phone"
            placeholder="핸드폰번호"
            value={form.phone}
            onChange={handleChange}
            style={inputStyle(errors.phone)}
            autoComplete="off"
            maxLength={20}
          />
          {errors.phone && <span style={{ color: "#f87171", fontSize: "13px" }}>{errors.phone}</span>}

          <button type="submit" style={blueBtnStyle}>
            회원가입
          </button>
        </form>

        <div style={{ marginTop: "1rem", textAlign: "center" }}>
          <Link to="/login" style={{ fontSize: "14px", color: "#00c6ff", textDecoration: "none", fontWeight: "bold" }}>
            로그인
          </Link>
        </div>
      </div>
    </div>
  );
}
