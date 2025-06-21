// ✅ 파일 위치: src/pages/AdminDashboardPage.jsx
import React from 'react';

const AdminDashboardPage = () => {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">관리자 대시보드</h2>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded shadow">전체회원<br/><strong>300</strong></div>
        <div className="bg-white p-4 rounded shadow">Today<br/><strong>0</strong></div>
        <div className="bg-white p-4 rounded shadow">BlackList<br/><strong>10</strong></div>
        <div className="bg-white p-4 rounded shadow">Center<br/><strong>2</strong></div>
      </div>

      {/* 회원 목록 테이블 */}
      <div className="overflow-x-auto">
        <table className="min-w-[900px] bg-white border rounded shadow">
          <thead className="bg-gray-100 text-sm">
            <tr>
              <th className="px-4 py-2 text-left">아이디</th>
              <th className="px-4 py-2 text-left">이름</th>
              <th className="px-4 py-2 text-left">핸드폰</th>
              <th className="px-4 py-2 text-left">센터</th>
              <th className="px-4 py-2 text-left">추천인</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="px-4 py-2">ktc004</td>
              <td className="px-4 py-2">김도경</td>
              <td className="px-4 py-2">01000000000</td>
              <td className="px-4 py-2">김포</td>
              <td className="px-4 py-2">추천자1</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminDashboardPage;