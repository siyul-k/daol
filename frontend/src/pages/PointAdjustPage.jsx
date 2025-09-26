// ✅ 파일 경로: frontend/src/pages/PointAdjustPage.jsx
import React, { useEffect, useState } from 'react';
import axios from '../axiosConfig';
import { PlusCircle, Trash2 } from 'lucide-react';

export default function PointAdjustPage() {
  const [showModal, setShowModal] = useState(false);
  const [inputUsername, setInputUsername] = useState('');
  const [userInfo, setUserInfo] = useState({ id: null, name: '', valid: false });
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [adjustList, setAdjustList] = useState([]);
  const [message, setMessage] = useState('');

  // ✅ 보정 목록 조회
  const fetchAdjustments = async () => {
    try {
      const res = await axios.get('/api/point-adjust');
      setAdjustList(res.data);
    } catch (err) {
      console.error('보정 목록 조회 실패:', err);
    }
  };

  useEffect(() => {
    fetchAdjustments();
  }, []);

  // ✅ 아이디 확인
  const handleCheckUsername = async () => {
    if (!inputUsername) return;
    try {
      const res = await axios.get(`/api/ad-da/code-give/check-username/${inputUsername}`);
      setUserInfo({ id: res.data.member_id, name: res.data.name, valid: true });
    } catch {
      alert('존재하지 않는 아이디입니다.');
      setUserInfo({ id: null, name: '', valid: false });
    }
  };

  // ✅ 지급 등록
  const handleCreate = async () => {
    if (!userInfo.valid) return alert('아이디 확인을 먼저 해주세요');
    if (!amount || isNaN(amount)) return alert('금액을 입력해주세요');

    try {
      const payload = {
        member_id: userInfo.id,
        point: parseInt(amount, 10),
        type: 'adjustment',
        description: memo || '관리자 보정',
      };
      await axios.post('/api/point-adjust', payload);
      alert('포인트 지급 완료');
      setShowModal(false);
      setInputUsername('');
      setUserInfo({ id: null, name: '', valid: false });
      setAmount('');
      setMemo('');
      fetchAdjustments();
    } catch (err) {
      alert('지급 실패');
    }
  };

  // ✅ 삭제
  const handleDelete = async (id) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;
    try {
      await axios.delete(`/api/point-adjust/${id}`);
      fetchAdjustments();
    } catch (err) {
      alert('삭제 실패');
    }
  };

  // ✅ 엑셀 내보내기
  const handleExport = () => {
    window.open('/api/point-adjust/export', '_blank');
  };

  return (
    <div className="p-2 sm:p-6 w-full text-gray-900 dark:text-gray-100">
      <h2 className="text-base sm:text-2xl font-bold mb-4 sm:mb-6">포인트지급</h2>

      {/* 버튼 영역 */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          className="flex items-center px-4 py-2 rounded text-sm
                     bg-blue-600 text-white hover:bg-blue-700"
          onClick={() => setShowModal(true)}
        >
          <PlusCircle size={18} className="mr-2" /> 포인트 지급
        </button>
        <button
          className="px-4 py-2 rounded text-sm
                     bg-green-600 text-white hover:bg-green-700"
          onClick={handleExport}
        >
          내보내기
        </button>
      </div>

      {/* 테이블 */}
      <div className="w-full overflow-x-auto">
        <table
          className="min-w-[720px] w-full border-collapse text-xs sm:text-sm text-center
                     border border-gray-200 dark:border-gray-700"
        >
          <thead className="bg-gray-100 dark:bg-gray-800">
            <tr>
              {['ID','아이디','이름','포인트','비고','일시','삭제'].map((h) => (
                <th
                  key={h}
                  className="p-2 whitespace-nowrap border border-gray-200 dark:border-gray-700
                             text-gray-700 dark:text-gray-200"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {adjustList.map((row) => (
              <tr
                key={row.id}
                className="border-t border-gray-200 dark:border-gray-700
                           hover:bg-gray-50 dark:hover:bg-gray-700/60"
              >
                <td className="px-2 py-2">{row.id}</td>
                <td className="px-2 py-2">{row.username}</td>
                <td className="px-2 py-2">{row.name}</td>
                <td className="px-2 py-2 text-right">{row.point?.toLocaleString()}</td>
                <td className="px-2 py-2">{row.description}</td>
                <td className="px-2 py-2">
                  {row.created_at?.slice(0, 19).replace('T', ' ')}
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

      {/* 등록 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div
            className="w-full max-w-xs sm:max-w-md rounded-lg shadow p-4 sm:p-6
                       bg-white text-gray-900
                       dark:bg-gray-800 dark:text-gray-100"
            style={{ maxHeight: '90vh', overflowY: 'auto' }}
          >
            <h3 className="text-lg font-semibold mb-3 flex items-center">
              <PlusCircle className="mr-2 text-blue-600" /> 포인트 지급 등록
            </h3>

            <input
              type="text"
              className="border w-full p-2 mb-2 rounded
                         border-gray-300 bg-white text-gray-900
                         dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100
                         placeholder-gray-400 dark:placeholder-gray-400"
              placeholder="아이디 입력"
              value={inputUsername}
              onChange={(e) => setInputUsername(e.target.value)}
            />
            <button
              className="px-3 py-1 mb-2 rounded
                         bg-gray-700 text-white hover:bg-gray-600
                         dark:bg-blue-600 dark:hover:bg-blue-500"
              onClick={handleCheckUsername}
            >
              아이디 확인
            </button>

            {userInfo.valid && (
              <p className="mb-2 text-green-600 dark:text-green-400">이름: {userInfo.name}</p>
            )}

            <input
              type="number"
              className="border w-full p-2 mb-2 rounded
                         border-gray-300 bg-white text-gray-900
                         dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
              placeholder="지급 포인트"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <input
              type="text"
              className="border w-full p-2 mb-4 rounded
                         border-gray-300 bg-white text-gray-900
                         dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
              placeholder="비고"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
            />

            <div className="flex justify-end gap-2">
              <button
                className="px-3 py-1 rounded
                           bg-gray-300 hover:bg-gray-400
                           dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-100"
                onClick={() => setShowModal(false)}
              >
                취소
              </button>
              <button
                className="px-3 py-1 rounded
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
