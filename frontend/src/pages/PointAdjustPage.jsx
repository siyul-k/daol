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
      console.log('✅ 사용자 확인 응답:', res.data);
      setUserInfo({ id: res.data.member_id, name: res.data.name, valid: true }); // ✅ 중요!
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
      console.log('📥 포인트 지급 요청:', payload);
      await axios.post('/api/points/adjust', payload);
      alert('포인트 지급 완료');
      setShowModal(false);
      setInputUsername('');
      setUserInfo({ id: null, name: '', valid: false });
      setAmount('');
      setMemo('');
      fetchAdjustments();
    } catch (err) {
      console.error('포인트 지급 실패:', err);
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
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">포인트지급</h2>

      <div className="flex gap-2 mb-4">
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={() => setShowModal(true)}
        >
          ➕ 포인트 지급 등록
        </button>
        <button
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          onClick={handleExport}
        >
          엑셀 다운로드
        </button>
      </div>

      <table className="w-full border text-sm text-center">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2">ID</th>
            <th>아이디</th>
            <th>이름</th>
            <th>포인트</th>
            <th>비고</th>
            <th>일시</th>
            <th>삭제</th>
          </tr>
        </thead>
        <tbody>
          {adjustList.map((row) => (
            <tr key={row.id} className="border-t">
              <td>{row.id}</td>
              <td>{row.username}</td>
              <td>{row.name}</td>
              <td className="text-right">{row.point.toLocaleString()}</td>
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

      {/* 등록 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-10">
          <div className="bg-white p-6 rounded shadow w-96">
            <h3 className="text-lg font-semibold mb-3">포인트 지급 등록</h3>

            <input
              type="text"
              className="border w-full p-2 mb-2"
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
              className="border w-full p-2 mb-2"
              placeholder="지급 포인트"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <input
              type="text"
              className="border w-full p-2 mb-4"
              placeholder="비고"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
            />

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
