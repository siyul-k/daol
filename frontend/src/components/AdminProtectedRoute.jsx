// ✅ src/components/AdminProtectedRoute.jsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function AdminProtectedRoute({ children }) {
  const navigate = useNavigate();
  useEffect(() => {
    const admin = JSON.parse(localStorage.getItem("admin"));
    if (!admin || !admin.id) {
      navigate("/ad-da/login", { replace: true });
    }
  }, [navigate]);
  return children;
}
