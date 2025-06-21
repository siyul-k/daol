// ✅ 파일 경로: src/axiosConfig.js

import axios from 'axios';

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_URL, // 이게 'localhost'였던 게 onrender로 바뀜
  withCredentials: true,
});

export default instance;
