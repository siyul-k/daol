import React, { useEffect, useState } from 'react';
import './SummaryCards.css';

export default function SummaryCards() {
  const [stats, setStats] = useState({
    total: 300,
    today: 0,
    blackList: 10,
    centerCount: 2,
  });

  return (
    <div className="summary-cards">
      {Object.entries(stats).map(([key, value]) => (
        <div className="card" key={key}>
          <div className="card__title">{key}</div>
          <div className="card__value">{value}</div>
          <div className="card__subtitle">통계 설명</div>
        </div>
      ))}
    </div>
  );
}
