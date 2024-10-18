// src/services/api.js
import axios from 'axios';

const API_URL = 'http://localhost:3000'; // Replace with your actual API URL

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const login = async (credentials) => {
  const response = await api.post('/login', credentials);
  return response.data;
};

export const fetchDashboardData = async () => {
  const response = await api.get('/dashboard');
  return response.data;
};

export default api;