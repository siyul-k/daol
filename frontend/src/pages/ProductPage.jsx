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
  const [confirmOpen, setConfirmOpen] = useState(false); // ✅ 추가: 모달 열림 상태
  const [purchaseLoading, setPurchaseLoading] = useState(false); // ✅ 추가: 구매 중복방지
  const [selectedPkg, setSelectedPkg] = useState(null); // ✅ 선택 상품 정보

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

  // ✅ 상품 선택 변경시 상세도 저장
  useEffect(() => {
    setSelectedPkg(packages.find(pkg => pkg.id === selectedId) || null);
  }, [selectedId, packages]);

  // ✅ "구매하기" 버튼 클릭시 모달 오픈
  const handlePurchaseClick = () => {
    if (!selectedId) {
      alert("상품을 선택해주세요.");
      return;
    }
    setConfirmOpen(true);
  };

  // ✅ 모달에서 '확인' 시 실제 구매요청
  const handleConfirmPurchase = async () => {
    setPurchaseLoading(true);
    try {
      await axios.post('/api/purchase', {
        username: currentUser.username,
        package_id: selectedId
      });

      alert("상품 구매가 완료되었습니다.");
      navigate('/product-history');
    } catch (err) {
      console.error("❌ 구매 실패:", err.response?.data || err.message);
      alert(err.response?.data?.error || "구매 중 오류가 발생했습니다.");
    } finally {
      setPurchaseLoading(false);
      setConfirmOpen(false);
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
              disabled={purchaseLoading}
            >
              <option value="">-- 선택하세요 --</option>
              {packages
                .filter(pkg => pkg.type === 'normal')
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
            onClick={handlePurchaseClick}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
            disabled={purchaseLoading}
          >
            {purchaseLoading ? '구매 중...' : '상품 구매하기'}
          </button>

          {/* ✅ 구매확인 모달 */}
          {confirmOpen && selectedPkg && (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
              <div className="bg-white p-8 rounded shadow-lg max-w-xs text-center">
                <div className="mb-4 font-semibold text-lg">
                  <span className="text-blue-700">{selectedPkg.name}</span><br />
                  {selectedPkg.price.toLocaleString()} 패키지를<br />
                  정말 구매하시겠습니까?
                </div>
                <button
                  className="bg-blue-600 text-white px-4 py-2 rounded mr-2"
                  onClick={handleConfirmPurchase}
                  disabled={purchaseLoading}
                >
                  확인
                </button>
                <button
                  className="bg-gray-300 text-gray-800 px-4 py-2 rounded"
                  onClick={() => setConfirmOpen(false)}
                  disabled={purchaseLoading}
                >
                  취소
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
