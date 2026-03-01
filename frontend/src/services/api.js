import axios from 'axios';

const API_BASE = 'https://notification-engine-mern.onrender.com';

const api = axios.create({ baseURL: API_BASE, timeout: 15000 });

api.interceptors.response.use(
  response => response.data,
  error => Promise.reject(error.response?.data || error)
);

export const evaluateNotification = (event) => api.post('/v1/notifications/evaluate', event);
export const batchEvaluate = (events) => api.post('/v1/notifications/batch-evaluate', { events });
export const getDecision = (id) => api.get(`/v1/notifications/decisions/${id}`);
export const getDecisions = (params) => api.get('/v1/notifications/decisions', { params });
export const getUserHistory = (userId) => api.get(`/v1/notifications/users/${userId}/history`);
export const getStats = () => api.get('/v1/notifications/stats');
export const getRules = () => api.get('/v1/rules');
export const createRule = (rule) => api.post('/v1/rules', rule);
export const updateRule = (id, rule) => api.put(`/v1/rules/${id}`, rule);
export const deleteRule = (id) => api.delete(`/v1/rules/${id}`);
export const healthCheck = () => api.get('/health');
