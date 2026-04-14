import api from './api';

export const authService = {
  register: (data) => api.post('/auth/register', data),
  login:    (data) => api.post('/auth/login', data),
  verifyOtp:(data) => api.post('/auth/verify-otp', data),
  refresh:  (data) => api.post('/auth/refresh', data),
  logout:   ()     => api.post('/auth/logout'),
  getMe:    ()     => api.get('/auth/me'),
  updateMe: (data) => api.patch('/auth/me', data),
  changePassword: (data) => api.post('/auth/change-password', data),
};

export const analyticsService = {
  getSummary:     (params) => api.get('/analytics/summary',     { params }),
  getTrends:      (params) => api.get('/analytics/trends',      { params }),
  getTopExpenses: (params) => api.get('/analytics/top-expenses',{ params }),
  getSuggestions: (params) => api.get('/analytics/suggestions', { params }),
  getSavingsPlan: (params) => api.get('/analytics/savings-plan',{ params }),
};

export const aiService = {
  classify:     (data)   => api.post('/ai/classify', data),
  predict:      ()       => api.get('/ai/predict'),
  getAnomalies: (params) => api.get('/ai/anomalies', { params }),
  getInsights:  ()       => api.get('/ai/insights'),
  getGeminiReport: (params) => api.get('/ai/gemini-report', { params }),
};

export const reportService = {
  getMonthly: (year, month) => api.get(`/reports/monthly/${year}/${month}`),
  exportCsv:  (params) => api.get('/reports/export/csv', { params, responseType: 'blob' }),
};
