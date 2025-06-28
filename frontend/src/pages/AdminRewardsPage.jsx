import React, { useEffect, useState } from 'react';
import axios from '../axiosConfig';

export default function AdminRewardsPage() {
  const [rewards, setRewards] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [searchId, setSearchId] = useState('');
  const [type, setType] = useState('');
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRewards();
  }, [page, searchId, type, date]);

  const fetchRewards = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/admin/rewards', {
        params: { page, limit, searchId, type, date }
      });

      if (res.data && Array.isArray(res.data.data)) {
        setRewards(res.data.data);
        setTotal(res.data.total);
      } else {
        setRewards([]);
        setTotal(0);
      }
    } catch {
      setRewards([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const res = await axios.get('/api/admin/rewards/export', {
        params: { searchId, type, date },
        responseType: 'blob'
      });
      const url = URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'rewards_export.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      // handle error
    }
  };

  // 필터 변경 시 page 초기화하는 예
  const onSearchIdChange = (val) => {
    setSearchId(val);
    setPage(1);
  };
  const onTypeChange = (val) => {
    setType(val);
    setPage(1);
  };
  const onDateChange = (val) => {
    setDate(val);
    setPage(1);
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">수당관리</h2>

      <div className="flex gap-2 items-center mb-4">
        <input
          type="text"
          placeholder="검색할 아이디"
          value={searchId}
          onChange={e => onSearchIdChange(e.target.value)}
          className="border px-3 py-2 rounded"
        />
        <select
          value={type}
          onChange={e => onTypeChange(e.target.value)}
          className="border px-3 py-2 rounded"
        >
          <option value="">전체 종류</option>
          <option value="daily">데일리</option>
          <option value="daily_matching">데일리매칭</option>
          <option value="referral">추천수당</option>
          <option value="adjust">포인트가감</option>
          <option value="center">센터피</option>
          <option value="center_recommend">센터추천피</option>
        </select>
        <input
          type="date"
          value={date}
          onChange={e => onDateChange(e.target.value)}
          className="border px-3 py-2 rounded"
        />
        <button
          onClick={fetchRewards}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          검색
        </button>
        <button
          onClick={handleExport}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          내보내기
        </button>
      </div>

      {loading ? (
        <p>불러오는 중...</p>
      ) : (
        <table className="w-full border text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-3 py-2 text-center">등록일</th>
              <th className="border px-3 py-2 text-center">종류</th>
              <th className="border px-3 py-2 text-center">아이디</th>
              <th className="border px-3 py-2 text-center">포인트</th>
              <th className="border px-3 py-2 text-center">수당원천</th>
              <th className="border px-3 py-2 text-center">상세내용</th>
            </tr>
          </thead>
          <tbody>
            {rewards.length > 0 ? (
              rewards.map((item, idx) => (
                <tr key={idx}>
                  <td className="border px-3 py-2 text-center">
                    {new Date(item.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
                  </td>
                  <td className="border px-3 py-2 text-center">{item.type}</td>
                  <td className="border px-3 py-2 text-center">{item.member_username}</td>
                  <td className="border px-3 py-2 text-right">{item.amount.toLocaleString()}</td>
                  <td className="border px-3 py-2 text-center">{item.source_username || '-'}</td>
                  <td className="border px-3 py-2 text-center">{item.memo || '-'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="text-center py-4 text-gray-500">데이터가 없습니다.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      <div className="mt-4 space-x-2">
        {Array.from({ length: Math.ceil(total / limit) }, (_, i) => (
          <button
            key={i}
            onClick={() => setPage(i + 1)}
            className={`px-3 py-1 rounded border ${page === i + 1 ? 'bg-blue-600 text-white' : 'bg-white'}`}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}
