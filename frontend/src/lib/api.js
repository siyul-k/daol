// src/lib/api.js

import axios from 'axios';

const API = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: API,
  withCredentials: false,
});

console.log('✅ API BASE URL =', import.meta.env.VITE_API_URL);

export default api;
