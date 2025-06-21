// ✅ 4. frontend/src/components/MemberFilterForm.jsx
import React, { useState } from 'react';

export default function MemberFilterForm({ onSearch }) {
  const [filters, setFilters] = useState({
    username: '',
    name: '',
    recommender: '',
    center: '',
    date: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(filters);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '10px', margin: '20px 0' }}>
      <input name="username" value={filters.username} onChange={handleChange} placeholder="아이디" />
      <input name="name" value={filters.name} onChange={handleChange} placeholder="이름" />
      <input name="recommender" value={filters.recommender} onChange={handleChange} placeholder="추천인" />
      <select name="center" value={filters.center} onChange={handleChange}>
        <option value="">전체 센터</option>
        <option value="본사">본사</option>
        <option value="지점A">지점A</option>
        <option value="지점B">지점B</option>
        <option value="지점C">지점C</option>
      </select>
      <input name="date" type="date" value={filters.date} onChange={handleChange} />
      <button type="submit">검색</button>
      <button type="button" onClick={() => onSearch(filters, true)} style={{ backgroundColor: 'green', color: '#fff' }}>
        📥 엑셀 다운로드
      </button>
    </form>
  );
}
