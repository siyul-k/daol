// ✅ 파일 경로: frontend/src/pages/AdminProductsPage.jsx
import React, { useEffect, useState } from 'react';
import axios from '../axiosConfig';
import { Trash2, RotateCcw } from 'lucide-react';

const PAGE_SIZE_OPTIONS = [25, 50, 100, 150, 9999];
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

  const fetchProducts = async (_page = page, _limit = limit) => {
    setLoading(true);
    try {
      const params = {
        ...filters,
        page: _page,
        limit: _limit
      };
      if (!filters.startDate) delete params.startDate;
      if (!filters.endDate) delete params.endDate;

      const res = await axios.get('/api/ad-da/products', { params });
      setProducts(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error('❌ 상품 조회 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProducts(); }, [page, limit]);

  const handleSearch = () => {
    setPage(1);
    fetchProducts(1, limit);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;
    try {
      await axios.delete(`/api/ad-da/products/${id}`);
      fetchProducts();
      alert('삭제되었습니다');
    } catch (err) {
      console.error('❌ 삭제 실패:', err);
      alert('삭제 실패');
    }
  };

  const handleToggle = async (id) => {
    try {
      await axios.put(`/api/ad-da/products/${id}/toggle`);
      fetchProducts();
      alert('상태가 변경되었습니다');
    } catch (err) {
      console.error('❌ 상태 변경 실패:', err);
      alert('상태 변경 실패');
    }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        ...filters,
        startDate: filters.startDate || '',
        endDate: filters.endDate || ''
      }).toString();
      const res = await axios.get(`/api/ad-da/products/export?${params}`, {
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

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-2 sm:p-4 w-full">
      <h2 className="text-base sm:text-xl font-bold mb-2 sm:mb-4">상품관리</h2>

      {/* 필터 */}
      <div className="flex flex-wrap gap-2 mb-3 sm:mb-4 items-center">
        <input
          type="text"
          placeholder="아이디"
          className="border p-1 rounded text-xs sm:text-sm w-20 sm:w-28
                     dark:bg-gray-900 dark:border-white/10 dark:text-gray-100"
          value={filters.username}
          onChange={(e) => setFilters({ ...filters, username: e.target.value })}
        />
        <input
          type="text"
          placeholder="이름"
          className="border p-1 rounded text-xs sm:text-sm w-20 sm:w-28
                     dark:bg-gray-900 dark:border-white/10 dark:text-gray-100"
          value={filters.name}
          onChange={(e) => setFilters({ ...filters, name: e.target.value })}
        />
        <input
          type="text"
          placeholder="상품명"
          className="border p-1 rounded text-xs sm:text-sm w-24 sm:w-32
                     dark:bg-gray-900 dark:border-white/10 dark:text-gray-100"
          value={filters.product_name}
          onChange={(e) => setFilters({ ...filters, product_name: e.target.value })}
        />
        <select
          className="border p-1 rounded text-xs sm:text-sm w-20 sm:w-28
                     dark:bg-gray-900 dark:border-white/10 dark:text-gray-100"
          value={filters.type}
          onChange={(e) => setFilters({ ...filters, type: e.target.value })}
        >
          <option value="">전체유형</option>
          <option value="normal">기본</option>
          <option value="bcode">보너스</option>
        </select>
        <span className="text-xs dark:text-gray-300">기간</span>
        <input
          type="date"
          className="border p-1 rounded text-xs sm:text-sm w-28 sm:w-40
                     dark:bg-gray-900 dark:border-white/10 dark:text-gray-100"
          value={filters.startDate}
          onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
        />
        <span className="dark:text-gray-300">~</span>
        <input
          type="date"
          className="border p-1 rounded text-xs sm:text-sm w-28 sm:w-40
                     dark:bg-gray-900 dark:border-white/10 dark:text-gray-100"
          value={filters.endDate}
          onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
        />
        <select
          value={limit}
          onChange={e => { setLimit(Number(e.target.value)); setPage(1); }}
          className="border rounded px-2 py-1 text-xs sm:text-sm
                     dark:bg-gray-900 dark:border-white/10 dark:text-gray-100"
        >
          {PAGE_SIZE_OPTIONS.map((n, i) => (
            <option key={n} value={n}>{PAGE_LABELS[i]}</option>
          ))}
        </select>
        <div className="flex gap-2 mt-2 sm:mt-0 w-full sm:w-auto">
          <button onClick={handleSearch} className="bg-blue-600 text-white px-3 py-1 rounded text-xs sm:text-sm">
            검색
          </button>
          <button onClick={handleExport} className="bg-green-600 text-white px-3 py-1 rounded text-xs sm:text-sm">
            내보내기
          </button>
        </div>
      </div>

      {/* 테이블 */}
      <div className="w-full overflow-x-auto">
        <table className="min-w-[950px] w-full text-xs sm:text-sm text-center
                         border border-gray-200 dark:border-white/10">
          <thead className="bg-gray-100 dark:bg-gray-700 dark:text-white">
            <tr>
              <th className="whitespace-nowrap w-40 border dark:border-white/10">등록일</th>
              <th className="whitespace-nowrap w-14 border dark:border-white/10">수정</th>
              <th className="whitespace-nowrap w-14 border dark:border-white/10">삭제</th>
              <th className="whitespace-nowrap w-20 border dark:border-white/10">아이디</th>
              <th className="whitespace-nowrap w-20 border dark:border-white/10">이름</th>
              <th className="whitespace-nowrap w-32 border dark:border-white/10">상품명</th>
              <th className="whitespace-nowrap w-20 border dark:border-white/10">금액</th>
              <th className="whitespace-nowrap w-16 border dark:border-white/10">PV</th>
              <th className="whitespace-nowrap w-20 border dark:border-white/10">상태</th>
              <th className="whitespace-nowrap w-16 border dark:border-white/10">타입</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 dark:text-gray-100">
            {products.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center py-6 text-gray-400 dark:text-gray-500">
                  조회된 내역이 없습니다.
                </td>
              </tr>
            ) : (
              products.map((row) => (
                <tr key={row.id} className="border-t border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-gray-700/60">
                  <td className="w-40 border dark:border-white/10">{row.created_at || '-'}</td>
                  <td className="w-14 border dark:border-white/10">
                    {row.type === 'bcode' && (
                      <button onClick={() => handleToggle(row.id)}>
                        <RotateCcw size={16} className="text-blue-500 hover:text-blue-700" />
                      </button>
                    )}
                  </td>
                  <td className="w-14 border dark:border-white/10">
                    <button onClick={() => handleDelete(row.id)}>
                      <Trash2 size={16} className="text-red-500 hover:text-red-700" />
                    </button>
                  </td>
                  <td className="w-20 border dark:border-white/10">{row.username}</td>
                  <td className="w-20 border dark:border-white/10">{row.name}</td>
                  <td className="w-32 border dark:border-white/10">{row.product_name}</td>
                  <td className="w-20 border dark:border-white/10">{row.amount?.toLocaleString()}</td>
                  <td className="w-16 border dark:border-white/10">{row.pv?.toLocaleString()}</td>
                  <td className="w-20 border dark:border-white/10">
                    {row.type === 'bcode' ? (row.active ? '승인완료' : '비활성화') : '-'}
                  </td>
                  <td className="w-16 border dark:border-white/10">{row.type}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ✅ 페이지네이션 (화살표형) */}
      <div className="mt-4 flex items-center justify-between flex-wrap gap-3 text-sm text-gray-700 dark:text-gray-300">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className={`px-3 py-1 rounded border transition
              ${page === 1
                ? 'opacity-40 cursor-not-allowed bg-gray-200 dark:bg-gray-700'
                : 'bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
          >
            ← 이전
          </button>

          <span>
            페이지 <span className="font-semibold">{page}</span> / {totalPages}
          </span>

          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className={`px-3 py-1 rounded border transition
              ${page >= totalPages
                ? 'opacity-40 cursor-not-allowed bg-gray-200 dark:bg-gray-700'
                : 'bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
          >
            다음 →
          </button>
        </div>

        <div>
          {total > 0 ? (
            <>
              {((page - 1) * limit) + 1} - {Math.min(page * limit, total)} / 총 {total.toLocaleString()}건
            </>
          ) : (
            '데이터 없음'
          )}
        </div>
      </div>
    </div>
  );
}
