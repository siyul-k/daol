// ✅ 파일 경로: frontend/src/pages/AdminCodeGivePage.jsx

import React, { useEffect, useState } from 'react';
import axios from '../axiosConfig';
import { PlusCircle, Trash2, Pencil } from 'lucide-react';

export default function AdminCodeGivePage() {
  const [codes, setCodes] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [showModal, setShowModal] = useState(false);
  const [newCode, setNewCode] = useState({ username: '', product_id: '' });
  const [usernameCheck, setUsernameCheck] = useState({ name: '', valid: false });
  const [products, setProducts] = useState([]);
  const [filters, setFilters] = useState({ username: '', name: '' });

  const fetchCodes = async () => {
    try {
      const query = new URLSearchParams({
        ...filters,
        page,
        limit,
      }).toString();
      const res = await axios.get(`/api/admin/code-give?${query}`);
      setCodes(res.data.rows);
      setTotal(res.data.total);
    } catch (err) {
      console.error('코드 내역 조회 실패:', err);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await axios.get('/api/admin/code-give/products');
      setProducts(res.data);
    } catch (err) {
      console.error('상품 목록 조회 실패:', err);
    }
  };

  const handleCheckUsername = async () => {
    try {
      const res = await axios.get(`/api/admin/code-give/check-username/${newCode.username}`);
      setUsernameCheck({ name: res.data.name, valid: true });
    } catch {
      alert('존재하지 않는 아이디입니다.');
      setUsernameCheck({ name: '', valid: false });
    }
  };

  const handleCreate = async () => {
    if (!usernameCheck.valid) return alert('아이디 확인을 먼저 해주세요');
    if (!newCode.product_id) return alert('상품을 선택해주세요');

    try {
      await axios.post('/api/admin/code-give', newCode);
      alert('지급 완료');
      setShowModal(false);
      setNewCode({ username: '', product_id: '' });
      setUsernameCheck({ name: '', valid: false });
      fetchCodes();
    } catch (err) {
      alert('지급 실패');
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;
    try {
      await axios.delete(`/api/admin/code-give/${id}`);
      alert('삭제되었습니다!');
      fetchCodes();
    } catch (err) {
      alert('삭제 실패');
      console.error(err);
    }
  };

  const handleToggleActive = async (id, current) => {
    try {
      await axios.put(`/api/admin/code-give/${id}`, { active: current ? 0 : 1 });
      fetchCodes();
    } catch (err) {
      alert('상태 변경 실패');
      console.error(err);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchCodes();
  };

  const totalPages = limit === 'all' ? 1 : Math.ceil(total / limit);

  useEffect(() => {
    fetchCodes();
    fetchProducts();
    // eslint-disable-next-line
  }, [page, limit]);

  return (
    <div className="p-2 sm:p-4">
      <h2 className="text-base sm:text-xl font-bold mb-2 sm:mb-4">코드 상품 지급</h2>

      {/* 필터 영역 */}
      <div className="flex flex-wrap gap-2 mb-3 sm:mb-4 items-center">
        <input
          type="text"
          placeholder="아이디 검색"
          className="border px-2 py-1 text-xs sm:text-sm rounded"
          value={filters.username}
          onChange={(e) => setFilters({ ...filters, username: e.target.value })}
        />
        <input
          type="text"
          placeholder="이름 검색"
          className="border px-2 py-1 text-xs sm:text-sm rounded"
          value={filters.name}
          onChange={(e) => setFilters({ ...filters, name: e.target.value })}
        />
        <button className="px-3 py-1 bg-gray-700 text-white rounded text-xs sm:text-sm" onClick={handleSearch}>
          검색
        </button>
        <select
          className="border px-2 py-1 ml-auto text-xs sm:text-sm rounded"
          value={limit}
          onChange={(e) => setLimit(e.target.value === 'all' ? 'all' : Number(e.target.value))}
        >
          <option value={10}>10개씩</option>
          <option value={25}>25개씩</option>
          <option value={50}>50개씩</option>
          <option value="all">전체보기</option>
        </select>
        <button
          className="ml-2 px-3 py-2 bg-blue-600 text-white rounded text-xs sm:text-sm flex items-center"
          onClick={() => setShowModal(true)}
        >
          <PlusCircle className="inline-block mr-1" size={16} />
          코드 지급 등록
        </button>
      </div>

      {/* 테이블 (반응형) */}
      <div className="w-full overflow-x-auto">
        <table className="min-w-[600px] w-full border text-xs sm:text-sm text-center">
          <thead className="bg-gray-100">
            <tr>
              <th className="py-2 whitespace-nowrap">등록일</th>
              <th className="whitespace-nowrap">아이디</th>
              <th className="whitespace-nowrap">이름</th>
              <th className="whitespace-nowrap">금액</th>
              <th className="whitespace-nowrap">PV</th>
              <th className="whitespace-nowrap">상태</th>
              <th className="whitespace-nowrap">수정</th>
              <th className="whitespace-nowrap">삭제</th>
            </tr>
          </thead>
          <tbody>
            {codes.map((row) => (
              <tr key={row.id} className="border-t">
                <td>
                  {row.created_at
                    ? new Date(new Date(row.created_at).getTime() + 9 * 60 * 60 * 1000)
                        .toLocaleString('ko-KR')
                    : ''}
                </td>
                <td>{row.username}</td>
                <td>{row.name}</td>
                <td>{row.amount.toLocaleString()}</td>
                <td>{row.pv.toLocaleString()}</td>
                <td>{row.active ? '활성' : '비활성'}</td>
                <td>
                  <button onClick={() => handleToggleActive(row.id, row.active)}>
                    <Pencil size={16} className="text-blue-500 hover:text-blue-700" />
                  </button>
                </td>
                <td>
                  <button onClick={() => handleDelete(row.id)}>
                    <Trash2 size={16} className="text-red-500 hover:text-red-700" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="mt-4 flex justify-center gap-2 text-xs sm:text-sm">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={`px-3 py-1 border rounded ${page === i + 1 ? 'bg-blue-600 text-white' : ''}`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* 등록 모달 (반응형) */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div
            className="bg-white p-3 sm:p-6 rounded-xl shadow w-full max-w-xs sm:max-w-md"
            style={{ maxHeight: '90vh', overflowY: 'auto' }}
          >
            <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3">코드 지급 등록</h3>
            <div className="flex flex-col gap-2">
              <input
                type="text"
                className="border w-full p-1 sm:p-2 rounded text-xs sm:text-sm"
                placeholder="아이디 입력"
                value={newCode.username}
                onChange={(e) => setNewCode({ ...newCode, username: e.target.value })}
              />
              <button
                className="bg-gray-700 text-white px-2 py-1 sm:px-3 sm:py-1 rounded text-xs sm:text-sm"
                onClick={handleCheckUsername}
              >
                아이디 확인
              </button>
              {usernameCheck.valid && (
                <p className="mb-1 text-green-600 text-xs sm:text-sm">이름: {usernameCheck.name}</p>
              )}
              <select
                className="border w-full p-1 sm:p-2 rounded text-xs sm:text-sm"
                value={newCode.product_id}
                onChange={(e) => setNewCode({ ...newCode, product_id: e.target.value })}
              >
                <option value="">-- 상품 선택 --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.price.toLocaleString()}원)
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-2 mt-4">
              <button
                className="px-2 py-1 bg-gray-300 rounded text-xs sm:text-sm"
                onClick={() => setShowModal(false)}
              >
                취소
              </button>
              <button
                className="px-2 py-1 bg-blue-600 text-white rounded text-xs sm:text-sm"
                onClick={handleCreate}
              >
                등록
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
