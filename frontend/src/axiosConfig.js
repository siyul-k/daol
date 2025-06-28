// ✅ 파일: frontend/src/axiosConfig.js
import axios from 'axios';

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_URL, // http://localhost:3001
  withCredentials: true,
});

// frontend/src/axiosConfig.js
instance.interceptors.request.use(config => {
  // 이미 /api 또는 http(s)로 시작하면 그대로
  if (!config.url.startsWith('/api') && !config.url.startsWith('http')) {
    config.url = `/api${config.url}`;
  }
  return config;
});


export default instance;
