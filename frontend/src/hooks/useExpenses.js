import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { expenseService } from '../services/expenseService';
import toast from 'react-hot-toast';

export const expenseKeys = {
  all:     ['expenses'],
  list:    (params) => ['expenses', 'list', params],
  detail:  (id)     => ['expenses', 'detail', id],
  summary: (params) => ['expenses', 'summary', params],
  trends:  (params) => ['expenses', 'trends', params],
};

export const useExpenses = (params = {}) =>
  useQuery({
    queryKey: expenseKeys.list(params),
    queryFn:  () => expenseService.getAll(params).then((r) => r.data),
  });

export const useExpense = (id) =>
  useQuery({
    queryKey: expenseKeys.detail(id),
    queryFn:  () => expenseService.getOne(id).then((r) => r.data),
    enabled:  !!id,
  });

export const useExpenseSummary = (params) =>
  useQuery({
    queryKey: expenseKeys.summary(params),
    queryFn:  () => expenseService.getSummary(params).then((r) => r.data),
  });

export const useExpenseTrends = (params = { months: 6 }) =>
  useQuery({
    queryKey: expenseKeys.trends(params),
    queryFn:  () => expenseService.getTrends(params).then((r) => r.data),
  });

export const useCreateExpense = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => expenseService.create(data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: expenseKeys.all });
      toast.success('Expense added');
    },
    onError: (err) => toast.error(err.response?.data?.error?.message ?? 'Failed to add expense'),
  });
};

export const useUpdateExpense = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => expenseService.update(id, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: expenseKeys.all });
      toast.success('Expense updated');
    },
    onError: (err) => toast.error(err.response?.data?.error?.message ?? 'Update failed'),
  });
};

export const useDeleteExpense = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => expenseService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: expenseKeys.all });
      toast.success('Expense deleted');
    },
    onError: () => toast.error('Delete failed'),
  });
};
