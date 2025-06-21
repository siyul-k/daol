// ✅ 5. frontend/src/components/MemberTable.jsx
import React from 'react';

export default function MemberTable({ data }) {
  return (
    <table border="1" cellPadding="8" style={{ width: '100%', marginTop: '20px' }}>
      <thead>
        <tr>
          <th>등록일</th>
          <th>아이디</th>
          <th>이름</th>
          <th>핸드폰</th>
          <th>센터</th>
          <th>추천인</th>
          <th>후원인</th>
          <th>은행이름</th>
          <th>예금주</th>
          <th>계좌번호</th>
        </tr>
      </thead>
      <tbody>
        {data.length === 0 ? (
          <tr>
            <td colSpan="10" style={{ textAlign: 'center' }}>회원이 없습니다.</td>
          </tr>
        ) : (
          data.map((member, idx) => (
            <tr key={member.id}>
              <td>{new Date(member.created_at).toLocaleDateString()}</td>
              <td>{member.username}</td>
              <td>{member.name}</td>
              <td>{member.phone}</td>
              <td>{member.center}</td>
              <td>{member.recommender}</td>
              <td>{member.sponsor}</td>
              <td>{member.bank_name}</td>
              <td>{member.account_holder}</td>
              <td>{member.account_number}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}