// ✅ 파일 경로: frontend/src/pages/AdminProductsPage.jsx
import React, { useEffect, useState } from 'react';
import axios from '../axiosConfig';
import { Trash2, RotateCcw } from 'lucide-react';

export default function AdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [filters, setFilters] = useState({
    username: '',
    name: '',
    product_name: '',
    type: '',
    date: '',
  });

  const fetchProducts = async () => {
    try {
      const res = await axios.get('/api/admin/products', { params: filters });
      setProducts(res.data);
    } catch (err) {
      console.error('❌ 상품 조회 실패:', err);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleSearch = () => {
    fetchProducts();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;
    try {
      await axios.delete(`/api/admin/products/${id}`);
      fetchProducts();
    } catch (err) {
      console.error('❌ 삭제 실패:', err);
      alert('삭제 실패');
    }
  };

  const handleToggle = async (id) => {
    try {
      await axios.put(`/api/admin/products/${id}/toggle`);
      fetchProducts();
    } catch (err) {
      console.error('❌ 상태 변경 실패:', err);
      alert('상태 변경 실패');
    }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams(filters).toString();
      const res = await axios.get(`/api/admin/products/export?${params}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'products.xlsx');
      document.body.appendChild(link);
      link.click();
    } catch (err) {
      console.error('❌ 엑셀 다운로드 실패:', err);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">상품관리</h2>

      {/* 필터 */}
      <div className="flex flex-wrap gap-2 mb-4">
        <input
          type="text"
          placeholder="아이디"
          className="border p-2 text-sm"
          value={filters.username}
          onChange={(e) => setFilters({ ...filters, username: e.target.value })}
        />
        <input
          type="text"
          placeholder="이름"
          className="border p-2 text-sm"
          value={filters.name}
          onChange={(e) => setFilters({ ...filters, name: e.target.value })}
        />
        <input
          type="text"
          placeholder="상품명"
          className="border p-2 text-sm"
          value={filters.product_name}
          onChange={(e) => setFilters({ ...filters, product_name: e.target.value })}
        />
        <select
          className="border p-2 text-sm"
          value={filters.type}
          onChange={(e) => setFilters({ ...filters, type: e.target.value })}
        >
          <option value="">전체유형</option>
          <option value="normal">기본</option>
          <option value="bcode">보너스</option>
        </select>
        <input
          type="date"
          className="border p-2 text-sm"
          value={filters.date}
          onChange={(e) => setFilters({ ...filters, date: e.target.value })}
        />
        <button onClick={handleSearch} className="bg-blue-600 text-white px-4 py-2 rounded text-sm">
          검색
        </button>
        <button onClick={handleExport} className="bg-green-600 text-white px-4 py-2 rounded text-sm">
          📁 엑셀 다운로드
        </button>
      </div>

      {/* 테이블 */}
      <table className="w-full border text-sm text-center">
        <thead className="bg-gray-100">
          <tr>
            <th>등록일</th>
            <th>수정</th>
            <th>삭제</th>
            <th>아이디</th>
            <th>이름</th>
            <th>상품명</th>
            <th>금액</th>
            <th>PV</th>
            <th>상태</th>
            <th>타입</th>
          </tr>
        </thead>
        <tbody>
          {products.map((row) => (
            <tr key={row.id} className="border-t">
              <td>{formatDate(row.created_at)}</td>
              <td>
                {row.type === 'bcode' && (
                  <button onClick={() => handleToggle(row.id)}>
                    <RotateCcw size={16} className="text-blue-500 hover:text-blue-700" />
                  </button>
                )}
              </td>
              <td>
                <button onClick={() => handleDelete(row.id)}>
                  <Trash2 size={16} className="text-red-500 hover:text-red-700" />
                </button>
              </td>
              <td>{row.username}</td>
              <td>{row.name}</td>
              <td>{row.product_name}</td>
              <td>{row.amount.toLocaleString()}</td>
              <td>{row.pv.toLocaleString()}</td>
              <td>{row.type === 'bcode' ? (row.active ? '승인완료' : '비활성화') : '-'}</td>
              <td>{row.type}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
