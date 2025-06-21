// ✅ 파일 경로: frontend/src/pages/ProductPage.jsx

import React, { useEffect, useState } from "react";
import axios from "../axiosConfig";
import { useNavigate } from "react-router-dom";

export default function ProductPage() {
  const navigate = useNavigate();
  const [pointBalance, setPointBalance] = useState(0);
  const [packages, setPackages] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const currentUser = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pointRes, packageRes] = await Promise.all([
          axios.get(`/api/purchase-points/${currentUser.username}`),
          axios.get(`/api/packages`)
        ]);

        setPointBalance(Number(pointRes.data.available_point || 0));
        setPackages(packageRes.data || []);
      } catch (err) {
        console.error("❌ 데이터 불러오기 실패:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser.username]);

  const handlePurchase = async () => {
    if (!selectedId) {
      alert("상품을 선택해주세요.");
      return;
    }

    try {
      await axios.post('/api/purchase', {
        username: currentUser.username,
        package_id: selectedId
      });

      alert("✅ 상품 구매가 완료되었습니다.");
      navigate('/product-history');
    } catch (err) {
      console.error("❌ 구매 실패:", err.response?.data || err.message);
      alert(err.response?.data?.error || "구매 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">상품구매신청</h1>

      {loading ? (
        <p className="text-gray-500">불러오는 중...</p>
      ) : (
        <>
          <div className="mb-4 text-lg">
            현재 사용 가능 포인트:{" "}
            <span className="font-bold text-blue-600">
              {pointBalance.toLocaleString()}
            </span>
          </div>

          <div className="mb-6">
            <label className="block font-semibold mb-2">상품 선택</label>
            <select
              className="w-full border px-4 py-2 rounded"
              value={selectedId || ""}
              onChange={(e) => setSelectedId(Number(e.target.value))}
            >
              <option value="">-- 선택하세요 --</option>
              {packages
                .filter(pkg => pkg.type === 'normal') // ✅ 수정된 부분
                .map(pkg => (
                  <option
                    key={pkg.id}
                    value={pkg.id}
                    disabled={pointBalance < pkg.price}
                  >
                    {pkg.name} - {pkg.price.toLocaleString()}원 / PV {pkg.pv.toLocaleString()}
                  </option>
              ))}
            </select>
          </div>

          <button
            onClick={handlePurchase}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          >
            상품 구매하기
          </button>
        </>
      )}
    </div>
  );
}
