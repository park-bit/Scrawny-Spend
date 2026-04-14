import api from './api';

export const expenseService = {
  getAll:     (params) => api.get('/expenses', { params }),
  create:     (data)   => api.post('/expenses', data),
  getOne:     (id)     => api.get(`/expenses/${id}`),
  update:     (id, data) => api.put(`/expenses/${id}`, data),
  remove:     (id)     => api.delete(`/expenses/${id}`),
  getSummary: (params) => api.get('/expenses/summary', { params }),
  getTrends:  (params) => api.get('/expenses/trends',  { params }),
};
