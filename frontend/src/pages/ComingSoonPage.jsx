import React from 'react';

const ComingSoonPage = ({ title = '준비 중입니다' }) => {
  return (
    <div className="p-10 text-center">
      <h1 className="text-2xl font-bold mb-4">{title}</h1>
      <p className="text-gray-600">이 페이지는 현재 개발 중입니다. 곧 업데이트될 예정입니다.</p>
    </div>
  );
};

export default ComingSoonPage;
