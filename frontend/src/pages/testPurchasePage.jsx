// ✅ 파일 위치: src/pages/PurchasePage.jsx

import React, { useEffect, useState } from 'react';
import axios from '../axiosConfig';

const PurchasePage = ({ username }) => {
  const [packages, setPackages] = useState([]);
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    axios.get('/api/packages')
      .then(res => setPackages(res.data))
      .catch(() => setMessage('패키지 불러오기 실패'));
  }, []);

  const handlePurchase = () => {
    if (!selected) {
      setMessage('패키지를 선택하세요.');
      return;
    }

    axios.post('/api/purchase', { username, package_id: selected })
      .then(res => {
        setMessage(res.data.message);
        setSelected(null);
      })
      .catch(err => {
        setMessage(err.response?.data?.error || '구매 실패');
      });
  };

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h2 className="text-xl font-bold mb-4">상품 구매</h2>
      <ul className="space-y-2 mb-4">
        {packages.map(pkg => (
          <li key={pkg.id}>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="package"
                value={pkg.id}
                checked={selected === pkg.id}
                onChange={() => setSelected(pkg.id)}
              />
              <span>{pkg.name} - {pkg.price.toLocaleString()}원 / PV: {pkg.pv.toLocaleString()}</span>
            </label>
          </li>
        ))}
      </ul>

      <button
        className="bg-blue-600 text-white px-4 py-2 rounded"
        onClick={handlePurchase}
      >
        구매하기
      </button>

      {message && <p className="mt-4 text-red-500">{message}</p>}
    </div>
  );
};

export default PurchasePage;
