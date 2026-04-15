import { useQuery } from '@tanstack/react-query';
import { analyticsService, aiService } from '../services';

export const useAnalyticsSummary = (params) =>
  useQuery({
    queryKey: ['analytics', 'summary', params],
    queryFn:  () => analyticsService.getSummary(params).then((r) => r.data.data),
  });

export const useAnalyticsTrends = (params = { months: 6 }) =>
  useQuery({
    queryKey: ['analytics', 'trends', params],
    queryFn:  () => analyticsService.getTrends(params).then((r) => r.data.data),
  });

export const useTopExpenses = (params = { k: 10 }) =>
  useQuery({
    queryKey: ['analytics', 'top', params],
    queryFn:  () => analyticsService.getTopExpenses(params).then((r) => r.data.data),
  });

export const useSavingsSuggestions = (params) =>
  useQuery({
    queryKey: ['analytics', 'suggestions', params],
    queryFn:  () => analyticsService.getSuggestions(params).then((r) => r.data.data),
    enabled:  !!params,
  });

export const useAIInsights = () =>
  useQuery({
    queryKey: ['ai', 'insights'],
    queryFn:  () => aiService.getInsights().then((r) => r.data.data),
    staleTime: 1000 * 30, // 30s – Allow faster recovery from cold-start timeouts
  });

export const useAnomalies = (params) =>
  useQuery({
    queryKey: ['ai', 'anomalies', params],
    queryFn:  () => aiService.getAnomalies(params).then((r) => r.data.data),
  });

export const useAIPrediction = () =>
  useQuery({
    queryKey: ['ai', 'predict'],
    queryFn:  () => aiService.predict().then((r) => r.data.data),
    staleTime: 1000 * 60 * 10,
    retry: false, // prediction endpoint may 503 if AI engine is cold
  });

export const useGeminiReport = () =>
  useQuery({
    queryKey: ['ai', 'gemini'],
    queryFn:  () => aiService.getGeminiReport().then((r) => r.data.data),
    staleTime: 1000 * 60 * 60, // 1 hour since LLM calls are heavy
    enabled: false, // Fetched strictly on-demand
  });
