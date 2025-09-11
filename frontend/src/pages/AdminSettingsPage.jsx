// ✅ 파일 위치: frontend/pages/AdminSettingsPage.jsx

import React, { useEffect, useState } from 'react';
import axios from '../axiosConfig';

const dayLabels = ['월', '화', '수', '목', '금', '토', '일'];
const dayKeys   = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

const labelMap = {
  daily_reward_percent: '데일리(%)',
  recommender_reward_percent: '추천(%)',
  center_fee_percent: '센터피(%)',
  center_recommender_percent: '센터추천피(%)',
  withdraw_fee_percent: '출금수수료(%)',
  withdraw_shopping_point_percent: '쇼핑포인트 적립(%)',
  withdraw_min_amount: '최소 출금금액(원)',
  // ⬇️ 접속 가능 시간 키로 교체
  access_start_hour: '접속가능 시작시간',
  access_end_hour:   '접속가능 종료시간',
  // access_days는 UI에서 숨김 (전 요일 허용)
};

export default function AdminSettingsPage() {
  const [settings, setSettings]   = useState({});
  const [activeTab, setActiveTab] = useState('percent');

  useEffect(() => {
    axios.get('/api/ad-da/settings')
      .then(res => setSettings(res.data))
      .catch(() => alert('설정 불러오기 실패'));
  }, []);

  const handleSave = () => {
    const payload = {};
    Object.keys(settings).forEach(key => {
      payload[key] = { value: settings[key].value };
    });
    axios.post('/api/ad-da/settings', payload)
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
    <div className="p-6 dark:bg-gray-900 dark:text-gray-100 min-h-screen">
      <h2 className="text-xl font-bold mb-4">환경 설정</h2>

      {/* 탭 */}
      <div className="mb-4 flex space-x-4">
        <button
          className={`px-4 py-2 rounded ${
            activeTab === 'percent'
              ? 'bg-green-700 text-white'
              : 'bg-gray-200 dark:bg-gray-700 dark:text-gray-100'
          }`}
          onClick={() => setActiveTab('percent')}
        >수당 퍼센트</button>

        <button
          className={`px-4 py-2 rounded ${
            activeTab === 'schedule'
              ? 'bg-green-700 text-white'
              : 'bg-gray-200 dark:bg-gray-700 dark:text-gray-100'
          }`}
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
                    className="border p-2 w-32
                               dark:bg-gray-800 dark:border-white/10 dark:text-gray-100"
                  /> %
                </div>
              );
            }
            return null;
          })}

          {settings.withdraw_min_amount && (
            <div>
              <label className="block text-sm font-medium mb-1">
                {labelMap.withdraw_min_amount}
              </label>
              <input
                type="number"
                value={settings.withdraw_min_amount.value}
                onChange={e => updateValue('withdraw_min_amount', e.target.value)}
                className="border p-2 w-40
                           dark:bg-gray-800 dark:border-white/10 dark:text-gray-100"
              /> 원
            </div>
          )}
        </div>
      )}

      {/* 지급일/시간 */}
      {activeTab === 'schedule' && (
        <div className="space-y-6">
          {Object.entries(settings).map(([key, item]) => {
            // ⛔ access_days는 UI 숨김 (전 요일 허용)
            if (key === 'access_days') return null;

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
                          className={`px-3 py-1 rounded border ${
                            checked
                              ? 'bg-green-600 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 dark:text-gray-100 dark:border-white/10'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            }

            if (item.type === 'int' && key !== 'withdraw_min_amount') {
              return (
                <div key={key}>
                  <label className="block text-sm font-medium mb-1">
                    {labelMap[key] || item.description || key}
                  </label>
                  <select
                    value={item.value}
                    onChange={e => updateValue(key, e.target.value)}
                    className="border p-2 w-32
                               dark:bg-gray-800 dark:border-white/10 dark:text-gray-100"
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
