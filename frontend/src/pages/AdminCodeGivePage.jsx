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
      const query = new URLSearchParams({ ...filters, page, limit }).toString();
      const res = await axios.get(`/api/ad-da/code-give?${query}`);
      setCodes(res.data.rows);
      setTotal(res.data.total);
    } catch (err) {
      console.error('코드 내역 조회 실패:', err);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await axios.get('/api/ad-da/code-give/products');
      setProducts(res.data);
    } catch (err) {
      console.error('상품 목록 조회 실패:', err);
    }
  };

  const handleCheckUsername = async () => {
    try {
      const res = await axios.get(`/api/ad-da/code-give/check-username/${newCode.username}`);
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
      await axios.post('/api/ad-da/code-give', newCode);
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
      await axios.delete(`/api/ad-da/code-give/${id}`);
      alert('삭제되었습니다!');
      fetchCodes();
    } catch (err) {
      alert('삭제 실패');
      console.error(err);
    }
  };

  const handleToggleActive = async (id, current) => {
    try {
      await axios.put(`/api/ad-da/code-give/${id}`, { active: current ? 0 : 1 });
    } catch (err) {
      alert('상태 변경 실패');
      console.error(err);
    } finally {
      fetchCodes();
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
    <div className="p-2 sm:p-4 text-gray-900 dark:text-gray-100">
      <h2 className="text-base sm:text-xl font-bold mb-2 sm:mb-4">코드 상품 지급</h2>

      {/* 필터 영역 */}
      <div className="flex flex-wrap gap-2 mb-3 sm:mb-4 items-center">
        <input
          type="text"
          placeholder="아이디 검색"
          className="border border-gray-300 rounded px-2 py-1 text-xs sm:text-sm
                     bg-white placeholder-gray-400 text-gray-900
                     dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400"
          value={filters.username}
          onChange={(e) => setFilters({ ...filters, username: e.target.value })}
        />
        <input
          type="text"
          placeholder="이름 검색"
          className="border border-gray-300 rounded px-2 py-1 text-xs sm:text-sm
                     bg-white placeholder-gray-400 text-gray-900
                     dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400"
          value={filters.name}
          onChange={(e) => setFilters({ ...filters, name: e.target.value })}
        />
        <button
          className="px-3 py-1 rounded text-xs sm:text-sm
                     bg-gray-700 text-white hover:bg-gray-600
                     dark:bg-blue-600 dark:hover:bg-blue-500"
          onClick={handleSearch}
        >
          검색
        </button>

        <select
          className="ml-auto border border-gray-300 rounded px-2 py-1 text-xs sm:text-sm
                     bg-white text-gray-900
                     dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
          value={limit}
          onChange={(e) => setLimit(e.target.value === 'all' ? 'all' : Number(e.target.value))}
        >
          <option value={10}>10개씩</option>
          <option value={25}>25개씩</option>
          <option value={50}>50개씩</option>
          <option value="all">전체보기</option>
        </select>

        <button
          className="ml-2 px-3 py-2 rounded text-xs sm:text-sm flex items-center
                     bg-blue-600 text-white hover:bg-blue-500"
          onClick={() => setShowModal(true)}
        >
          <PlusCircle className="inline-block mr-1" size={16} />
          코드 지급 등록
        </button>
      </div>

      {/* 테이블 (반응형) */}
      <div className="w-full overflow-x-auto">
        <table
          className="min-w-[600px] w-full border-collapse text-xs sm:text-sm text-center
                     border border-gray-200 dark:border-gray-700"
        >
          <thead className="bg-gray-100 dark:bg-gray-800">
            <tr>
              {['등록일','아이디','이름','금액','PV','상태','수정','삭제'].map((h) => (
                <th
                  key={h}
                  className="px-3 py-2 whitespace-nowrap border border-gray-200 dark:border-gray-700
                             text-gray-700 dark:text-gray-200"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {codes.map((row) => (
              <tr
                key={row.id}
                className="border-t border-gray-200 dark:border-gray-700
                           hover:bg-gray-50 dark:hover:bg-gray-700/60"
              >
                <td className="px-2 py-2">
                  {row.created_at
                    ? new Date(new Date(row.created_at).getTime() + 9 * 60 * 60 * 1000).toLocaleString('ko-KR')
                    : ''}
                </td>
                <td className="px-2 py-2">{row.username}</td>
                <td className="px-2 py-2">{row.name}</td>
                <td className="px-2 py-2">{row.amount.toLocaleString()}</td>
                <td className="px-2 py-2">{row.pv.toLocaleString()}</td>
                <td className="px-2 py-2">{row.active ? '활성' : '비활성'}</td>
                <td className="px-2 py-2">
                  <button onClick={() => handleToggleActive(row.id, row.active)} title="상태 변경">
                    <Pencil
                      size={16}
                      className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                    />
                  </button>
                </td>
                <td className="px-2 py-2">
                  <button onClick={() => handleDelete(row.id)} title="삭제">
                    <Trash2
                      size={16}
                      className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
                    />
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
              className={`px-3 py-1 rounded border
                         border-gray-300 dark:border-gray-600
                         ${page === i + 1 ? 'bg-blue-600 text-white' : 'dark:text-gray-100'}`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* 등록 모달 (반응형) */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div
            className="w-full max-w-xs sm:max-w-md rounded-xl shadow p-3 sm:p-6
                       bg-white text-gray-900
                       dark:bg-gray-800 dark:text-gray-100"
            style={{ maxHeight: '90vh', overflowY: 'auto' }}
          >
            <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3">코드 지급 등록</h3>

            <div className="flex flex-col gap-2">
              <input
                type="text"
                className="border border-gray-300 rounded w-full p-1 sm:p-2 text-xs sm:text-sm
                           bg-white placeholder-gray-400 text-gray-900
                           dark:bg-gray-900 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400"
                placeholder="아이디 입력"
                value={newCode.username}
                onChange={(e) => setNewCode({ ...newCode, username: e.target.value })}
              />
              <button
                className="px-2 py-1 sm:px-3 sm:py-1 rounded text-xs sm:text-sm
                           bg-gray-700 text-white hover:bg-gray-600
                           dark:bg-blue-600 dark:hover:bg-blue-500"
                onClick={handleCheckUsername}
              >
                아이디 확인
              </button>

              {usernameCheck.valid && (
                <p className="mb-1 text-green-600 dark:text-green-400 text-xs sm:text-sm">
                  이름: {usernameCheck.name}
                </p>
              )}

              <select
                className="border border-gray-300 rounded w-full p-1 sm:p-2 text-xs sm:text-sm
                           bg-white text-gray-900
                           dark:bg-gray-900 dark:border-gray-600 dark:text-gray-100"
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
                className="px-2 py-1 rounded text-xs sm:text-sm
                           bg-gray-300 hover:bg-gray-400
                           dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-100"
                onClick={() => setShowModal(false)}
              >
                취소
              </button>
              <button
                className="px-2 py-1 rounded text-xs sm:text-sm
                           bg-blue-600 text-white hover:bg-blue-500"
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
