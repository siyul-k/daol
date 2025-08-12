// ✅ 파일 위치: frontend/pages/AdminSettingsPage.jsx

import React, { useEffect, useState } from 'react';
import axios from '../axiosConfig';

const dayLabels = ['월', '화', '수', '목', '금', '토', '일'];
const dayKeys   = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

/* ✅ 라벨맵에 새 키만 추가 (설명값이 없을 때 라벨 대체용) */
const labelMap = {
  daily_reward_percent: '데일리(%)',
  recommender_reward_percent: '추천(%)',
  center_fee_percent: '센터피(%)',
  center_recommender_percent: '센터추천피(%)',
  withdraw_fee_percent: '출금수수료(%)',
  withdraw_shopping_point_percent: '쇼핑포인트 적립(%)',
  withdraw_min_amount: '최소 출금금액(원)',

  /* ⬇️ 새로 바뀐 키 */
  site_block_start_hour: '접속불가 시작시간',
  site_block_end_hour:   '접속불가 종료시간',
};

export default function AdminSettingsPage() {
  const [settings, setSettings]   = useState({});
  const [activeTab, setActiveTab] = useState('percent');

  useEffect(() => {
    axios.get('/api/admin/settings')
      .then(res => setSettings(res.data))
      .catch(() => alert('설정 불러오기 실패'));
  }, []);

  const handleSave = () => {
    const payload = {};
    Object.keys(settings).forEach(key => {
      payload[key] = { value: settings[key].value };
    });
    axios.post('/api/admin/settings', payload)
      .then(() => alert('저장 완료'))
      .catch(() => alert('저장 실패'));
  };

  const updateValue = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: { ...prev[key], value }
    }));
  };

  const toggleDay = (key, dayKey) => {
    const current = settings[key].value?.split(',') || [];
    const updated = current.includes(dayKey)
      ? current.filter(d => d !== dayKey)
      : [...current, dayKey];
    updateValue(key, updated.join(','));
  };

  const renderHourOptions = () =>
    [...Array(24).keys()].map(h => <option key={h} value={h}>{h}</option>);

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">환경 설정</h2>

      {/* 탭 */}
      <div className="mb-4 flex space-x-4">
        <button
          className={`px-4 py-2 rounded ${activeTab === 'percent' ? 'bg-green-700 text-white' : 'bg-gray-200'}`}
          onClick={() => setActiveTab('percent')}
        >수당 퍼센트</button>

        <button
          className={`px-4 py-2 rounded ${activeTab === 'schedule' ? 'bg-green-700 text-white' : 'bg-gray-200'}`}
          onClick={() => setActiveTab('schedule')}
        >수당 지급일</button>
      </div>

      {/* 수당 퍼센트 */}
      {activeTab === 'percent' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(settings).map(([key, item]) => {
            if (
              item.type === 'percent' &&
              key !== 'rank_reward_percent' &&
              key !== 'sponsor_reward_percent'
            ) {
              return (
                <div key={key}>
                  <label className="block text-sm font-medium mb-1">
                    {labelMap[key] || key}
                  </label>
                  <input
                    type="number"
                    value={item.value}
                    onChange={e => updateValue(key, e.target.value)}
                    className="border p-2 w-32"
                  /> %
                </div>
              );
            }
            return null;
          })}

          {/* 최소 출금금액(원) */}
          {settings.withdraw_min_amount && (
            <div>
              <label className="block text-sm font-medium mb-1">
                {labelMap.withdraw_min_amount}
              </label>
              <input
                type="number"
                value={settings.withdraw_min_amount.value}
                onChange={e => updateValue('withdraw_min_amount', e.target.value)}
                className="border p-2 w-40"
              /> 원
            </div>
          )}
        </div>
      )}

      {/* 지급일/시간(접속불가 시간 포함) */}
      {activeTab === 'schedule' && (
        <div className="space-y-6">
          {Object.entries(settings).map(([key, item]) => {
            if (item.type === 'days') {
              const selected = (item.value || '').split(',');
              return (
                <div key={key}>
                  <div className="font-semibold mb-1">{item.description || key}</div>
                  <div className="flex space-x-2 flex-wrap">
                    {dayLabels.map((label, i) => {
                      const dayKey = dayKeys[i];
                      const checked = selected.includes(dayKey);
                      return (
                        <button
                          key={dayKey}
                          type="button"
                          onClick={() => toggleDay(key, dayKey)}
                          className={`px-3 py-1 rounded border ${checked ? 'bg-green-600 text-white' : 'bg-gray-100'}`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            }

            // ⬇️ int 타입(시간) 항목: 라벨을 labelMap > description > key 순으로 표시
            if (item.type === 'int' && key !== 'withdraw_min_amount') {
              return (
                <div key={key}>
                  <label className="block text-sm font-medium mb-1">
                    {labelMap[key] || item.description || key}
                  </label>
                  <select
                    value={item.value}
                    onChange={e => updateValue(key, e.target.value)}
                    className="border p-2 w-32"
                  >
                    {renderHourOptions()}
                  </select> 시
                </div>
              );
            }

            return null;
          })}
        </div>
      )}

      <div className="mt-6">
        <button
          onClick={handleSave}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          저장
        </button>
      </div>
    </div>
  );
}
