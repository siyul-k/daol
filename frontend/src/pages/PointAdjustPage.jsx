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

  const fetchAdjustments = async () => {
    try {
      const res = await axios.get('/api/points');
      setAdjustList(res.data);
    } catch (err) {
      console.error('보정 목록 조회 실패:', err);
    }
  };

  useEffect(() => {
    fetchAdjustments();
  }, []);

  const handleCheckUsername = async () => {
    if (!inputUsername) return;
    try {
      const res = await axios.get(`/api/admin/code-give/check-username/${inputUsername}`);
      setUserInfo({ id: res.data.member_id, name: res.data.name, valid: true });
    } catch {
      alert('존재하지 않는 아이디입니다.');
      setUserInfo({ id: null, name: '', valid: false });
    }
  };

  const handleCreate = async () => {
    if (!userInfo.valid) return alert('아이디 확인을 먼저 해주세요');
    if (!amount || isNaN(amount)) return alert('금액을 입력해주세요');

    try {
      const payload = {
        member_id: userInfo.id,
        point: parseInt(amount),
        type: 'adjustment',
        description: memo || '관리자 보정',
      };
      await axios.post('/api/points/adjust', payload);
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

  const handleDelete = async (id) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return;
    try {
      await axios.delete(`/api/points/delete/${id}`);
      fetchAdjustments();
    } catch (err) {
      alert('삭제 실패');
    }
  };

  const handleExport = () => {
    window.open('/api/points/export', '_blank');
  };

  return (
    <div className="p-2 sm:p-6 w-full">
      <h2 className="text-base sm:text-2xl font-bold mb-4 sm:mb-6">포인트지급</h2>

      {/* 버튼 영역 (반응형) */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-all text-sm"
          onClick={() => setShowModal(true)}
        >
          <PlusCircle size={18} className="mr-2" /> 포인트 지급
        </button>
        <button
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition-all text-sm"
          onClick={handleExport}
        >
          내보내기
        </button>
      </div>

      <div className="w-full overflow-x-auto">
        <table className="min-w-[720px] w-full border text-xs sm:text-sm text-center">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 whitespace-nowrap">ID</th>
              <th className="whitespace-nowrap">아이디</th>
              <th className="whitespace-nowrap">이름</th>
              <th className="whitespace-nowrap">포인트</th>
              <th className="whitespace-nowrap">비고</th>
              <th className="whitespace-nowrap">일시</th>
              <th className="whitespace-nowrap">삭제</th>
            </tr>
          </thead>
          <tbody>
            {adjustList.map((row) => (
              <tr key={row.id} className="border-t">
                <td>{row.id}</td>
                <td>{row.username}</td>
                <td>{row.name}</td>
                <td className="text-right">{row.point?.toLocaleString()}</td>
                <td>{row.description}</td>
                <td>{row.created_at?.slice(0, 19).replace('T', ' ')}</td>
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

      {/* 등록 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow w-full max-w-xs sm:max-w-md">
            <h3 className="text-lg font-semibold mb-3 flex items-center">
              <PlusCircle className="mr-2 text-blue-600" /> 포인트 지급 등록
            </h3>
            <input
              type="text"
              className="border w-full p-2 mb-2 rounded"
              placeholder="아이디 입력"
              value={inputUsername}
              onChange={(e) => setInputUsername(e.target.value)}
            />
            <button
              className="bg-gray-700 text-white px-3 py-1 mb-2 rounded"
              onClick={handleCheckUsername}
            >
              아이디 확인
            </button>
            {userInfo.valid && <p className="mb-2 text-green-600">이름: {userInfo.name}</p>}
            <input
              type="number"
              className="border w-full p-2 mb-2 rounded"
              placeholder="지급 포인트"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <input
              type="text"
              className="border w-full p-2 mb-4 rounded"
              placeholder="비고"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
            />

            <div className="flex justify-end gap-2">
              <button
                className="px-3 py-1 bg-gray-300 rounded"
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
