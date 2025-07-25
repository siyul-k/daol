// ✅ 파일 경로: frontend/src/pages/AdminProductsPage.jsx

import React, { useEffect, useState } from 'react';
import axios from '../axiosConfig';
import { Trash2, RotateCcw } from 'lucide-react';

// 아이템 개수 옵션
const PAGE_SIZE_OPTIONS = [25, 50, 100, 150, 9999]; // 9999=전체
const PAGE_LABELS = ['25개씩', '50개씩', '100개씩', '150개씩', '전체'];

export default function AdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [filters, setFilters] = useState({
    username: '',
    name: '',
    product_name: '',
    type: '',
    startDate: '',
    endDate: ''
  });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // 상품 목록 조회
  const fetchProducts = async (_page = page, _limit = limit) => {
    setLoading(true);
    try {
      const params = {
        ...filters,
        page: _page,
        limit: _limit
      };
      // 날짜 필터링
      if (!filters.startDate) delete params.startDate;
      if (!filters.endDate) delete params.endDate;

      const res = await axios.get('/api/admin/products', { params });
      setProducts(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error('❌ 상품 조회 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProducts(); }, [page, limit]); // page/limit 변경 시 자동

  // 검색 버튼 처리
  const handleSearch = () => {
    setPage(1);
    fetchProducts(1, limit);
  };

  // 삭제
  const handleDelete = async (id) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;
    try {
      await axios.delete(`/api/admin/products/${id}`);
      fetchProducts();
      alert('삭제되었습니다');
    } catch (err) {
      console.error('❌ 삭제 실패:', err);
      alert('삭제 실패');
    }
  };

  // 상태 토글(bcode 상품)
  const handleToggle = async (id) => {
    try {
      await axios.put(`/api/admin/products/${id}/toggle`);
      fetchProducts();
      alert('상태가 변경되었습니다');
    } catch (err) {
      console.error('❌ 상태 변경 실패:', err);
      alert('상태 변경 실패');
    }
  };

  // 엑셀 다운로드
  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        ...filters,
        startDate: filters.startDate || '',
        endDate: filters.endDate || ''
      }).toString();
      const res = await axios.get(`/api/admin/products/export?${params}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'products.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('❌ 엑셀 다운로드 실패:', err);
    }
  };

  // 등록일 포맷 및 width 최적화
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    let hour = date.getHours();
    const minute = String(date.getMinutes()).padStart(2, '0');
    const second = String(date.getSeconds()).padStart(2, '0');
    const ampm = hour >= 12 ? '오후' : '오전';
    if (hour > 12) hour -= 12;
    if (hour === 0) hour = 12;
    return `${year}.${month}.${day} ${ampm} ${hour}:${minute}`;
  };

  // 페이지네이션
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-2 sm:p-4 w-full">
      <h2 className="text-base sm:text-xl font-bold mb-2 sm:mb-4">상품관리</h2>

      {/* 필터 (반응형) */}
      <div className="flex flex-wrap gap-2 mb-3 sm:mb-4 items-center">
        <input
          type="text"
          placeholder="아이디"
          className="border p-1 rounded text-xs sm:text-sm w-20 sm:w-28"
          value={filters.username}
          onChange={(e) => setFilters({ ...filters, username: e.target.value })}
        />
        <input
          type="text"
          placeholder="이름"
          className="border p-1 rounded text-xs sm:text-sm w-20 sm:w-28"
          value={filters.name}
          onChange={(e) => setFilters({ ...filters, name: e.target.value })}
        />
        <input
          type="text"
          placeholder="상품명"
          className="border p-1 rounded text-xs sm:text-sm w-24 sm:w-32"
          value={filters.product_name}
          onChange={(e) => setFilters({ ...filters, product_name: e.target.value })}
        />
        <select
          className="border p-1 rounded text-xs sm:text-sm w-20 sm:w-28"
          value={filters.type}
          onChange={(e) => setFilters({ ...filters, type: e.target.value })}
        >
          <option value="">전체유형</option>
          <option value="normal">기본</option>
          <option value="bcode">보너스</option>
        </select>
        <span className="text-xs">기간</span>
        <input
          type="date"
          className="border p-1 rounded text-xs sm:text-sm w-28 sm:w-40"
          value={filters.startDate}
          onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
          placeholder="시작일"
        />
        <span>~</span>
        <input
          type="date"
          className="border p-1 rounded text-xs sm:text-sm w-28 sm:w-40"
          value={filters.endDate}
          onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
          placeholder="종료일"
        />
        {/* 개수 선택 */}
        <select
          value={limit}
          onChange={e => { setLimit(Number(e.target.value)); setPage(1); }}
          className="border rounded px-2 py-1 text-xs sm:text-sm"
        >
          {PAGE_SIZE_OPTIONS.map((n, i) => (
            <option key={n} value={n}>{PAGE_LABELS[i]}</option>
          ))}
        </select>
        <div className="flex gap-2 mt-2 sm:mt-0 w-full sm:w-auto">
          <button
            onClick={handleSearch}
            className="bg-blue-600 text-white px-3 py-1 rounded text-xs sm:text-sm"
          >
            검색
          </button>
          <button
            onClick={handleExport}
            className="bg-green-600 text-white px-3 py-1 rounded text-xs sm:text-sm"
          >
            내보내기
          </button>
        </div>
      </div>

      {/* 테이블 (반응형, 가로 스크롤, 등록일 넓이 최적화) */}
      <div className="w-full overflow-x-auto">
        <table className="min-w-[950px] w-full border text-xs sm:text-sm text-center">
          <thead className="bg-gray-100">
            <tr>
              <th className="whitespace-nowrap w-40">등록일</th>
              <th className="whitespace-nowrap w-14">수정</th>
              <th className="whitespace-nowrap w-14">삭제</th>
              <th className="whitespace-nowrap w-20">아이디</th>
              <th className="whitespace-nowrap w-20">이름</th>
              <th className="whitespace-nowrap w-32">상품명</th>
              <th className="whitespace-nowrap w-20">금액</th>
              <th className="whitespace-nowrap w-16">PV</th>
              <th className="whitespace-nowrap w-20">상태</th>
              <th className="whitespace-nowrap w-16">타입</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center py-6 text-gray-400">조회된 내역이 없습니다.</td>
              </tr>
            ) : (
              products.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="w-40">{formatDate(row.created_at)}</td>
                  <td className="w-14">
                    {row.type === 'bcode' && (
                      <button onClick={() => handleToggle(row.id)}>
                        <RotateCcw size={16} className="text-blue-500 hover:text-blue-700" />
                      </button>
                    )}
                  </td>
                  <td className="w-14">
                    <button onClick={() => handleDelete(row.id)}>
                      <Trash2 size={16} className="text-red-500 hover:text-red-700" />
                    </button>
                  </td>
                  <td className="w-20">{row.username}</td>
                  <td className="w-20">{row.name}</td>
                  <td className="w-32">{row.product_name}</td>
                  <td className="w-20">{row.amount?.toLocaleString()}</td>
                  <td className="w-16">{row.pv?.toLocaleString()}</td>
                  <td className="w-20">{row.type === 'bcode' ? (row.active ? '승인완료' : '비활성화') : '-'}</td>
                  <td className="w-16">{row.type}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      <div className="flex flex-wrap gap-2 my-4">
        {total > limit && Array.from({ length: Math.ceil(total / limit) }, (_, i) => (
          <button
            key={i}
            className={`px-2 py-1 border rounded ${page === i + 1 ? 'bg-blue-600 text-white' : ''}`}
            onClick={() => setPage(i + 1)}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}
