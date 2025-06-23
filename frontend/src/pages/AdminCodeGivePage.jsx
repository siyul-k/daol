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
  }, [page, limit]);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">코드 상품 지급</h2>

      {/* 필터 영역 */}
      <div className="flex gap-2 mb-4 items-center">
        <input
          type="text"
          placeholder="아이디 검색"
          className="border px-2 py-1"
          value={filters.username}
          onChange={(e) => setFilters({ ...filters, username: e.target.value })}
        />
        <input
          type="text"
          placeholder="이름 검색"
          className="border px-2 py-1"
          value={filters.name}
          onChange={(e) => setFilters({ ...filters, name: e.target.value })}
        />
        <button className="px-4 bg-gray-700 text-white rounded" onClick={handleSearch}>
          검색
        </button>
        <select
          className="border px-2 py-1 ml-auto"
          value={limit}
          onChange={(e) => setLimit(e.target.value === 'all' ? 'all' : Number(e.target.value))}
        >
          <option value={10}>10개씩</option>
          <option value={25}>25개씩</option>
          <option value={50}>50개씩</option>
          <option value="all">전체보기</option>
        </select>
        <button
          className="ml-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={() => setShowModal(true)}
        >
          <PlusCircle className="inline-block mr-2" size={18} />
          코드 지급 등록
        </button>
      </div>

      {/* 테이블 */}
      <table className="w-full border text-sm text-center">
        <thead className="bg-gray-100">
          <tr>
            <th className="py-2">등록일</th>
            <th>아이디</th>
            <th>이름</th>
            <th>금액</th>
            <th>PV</th>
            <th>상태</th>
            <th>수정</th>
            <th>삭제</th>
          </tr>
        </thead>
        <tbody>
          {codes.map((row) => (
            <tr key={row.id} className="border-t">
              <td>{row.created_at?.slice(0, 10)}</td>
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

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="mt-4 flex justify-center gap-2 text-sm">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={`px-3 py-1 border rounded ${
                page === i + 1 ? 'bg-blue-600 text-white' : ''
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* 등록 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
          <div className="bg-white p-6 rounded shadow w-96">
            <h3 className="text-lg font-semibold mb-3">코드 지급 등록</h3>

            <input
              type="text"
              className="border w-full p-2 mb-2"
              placeholder="아이디 입력"
              value={newCode.username}
              onChange={(e) => setNewCode({ ...newCode, username: e.target.value })}
            />
            <button
              className="bg-gray-700 text-white px-3 py-1 mb-2 rounded"
              onClick={handleCheckUsername}
            >
              아이디 확인
            </button>
            {usernameCheck.valid && (
              <p className="mb-2 text-green-600">이름: {usernameCheck.name}</p>
            )}

            <select
              className="border w-full p-2 mb-2"
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

            <div className="flex justify-end">
              <button
                className="px-3 py-1 mr-2 bg-gray-300 rounded"
                onClick={() => setShowModal(false)}
              >
                취소
              </button>
              <button
                className="px-3 py-1 bg-blue-600 text-white rounded"
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
