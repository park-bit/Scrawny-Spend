'use strict';

const { GoogleGenerativeAI } = require('@google/generative-ai');
const AppError = require('../utils/AppError');

function getModelName() {
  return process.env.GEMINI_MODEL || 'gemini-2.5-flash';
}

function normalizeError(err) {
  const message = String(err?.message || err || 'Gemini request failed');

  if (
    /API key|API_KEY|authentication|unauthorized|permission/i.test(message) ||
    /401|403/.test(message)
  ) {
    return new AppError('Gemini API key is missing, invalid, or unauthorized.', 401, 'GEMINI_AUTH_ERROR');
  }

  if (/quota|rate limit|429/i.test(message)) {
    return new AppError('Gemini quota or rate limit reached.', 429, 'GEMINI_RATE_LIMIT');
  }

  return new AppError(`Gemini request failed: ${message}`, 502, 'GEMINI_ERROR');
}

function ensureApiKey(apiKey) {
  const key = (apiKey || process.env.GEMINI_API_KEY || '').trim();
  if (!key) {
    throw new AppError('Gemini API key is required.', 400, 'GEMINI_KEY_REQUIRED');
  }
  return key;
}

function createClient(apiKey) {
  const key = ensureApiKey(apiKey);
  return new GoogleGenerativeAI(key);
}

function buildFinancePrompt(payload = {}) {
  const {
    summary = {},
    monthComparison = {},
    trends = [],
    budgets = [],
    anomalies = [],
    topCategories = [],
    savingsSuggestions = [],
    userQuestion = '',
  } = payload;

  return [
    'You are a concise, practical personal finance advisor.',
    'Write in natural language, with clear bullet points and short paragraphs.',
    'Focus on overspending, savings opportunities, budget cuts, and actionable advice.',
    'Do not mention that you are an AI model.',
    '',
    'User finance data:',
    JSON.stringify(
      {
        summary,
        monthComparison,
        trends,
        budgets,
        anomalies,
        topCategories,
        savingsSuggestions,
        userQuestion,
      },
      null,
      2
    ),
    '',
    'Return a helpful response addressing exactly these points:',
    '1) overspending categories',
    '2) where money goes most',
    '3) save suggestions',
    '4) next month prediction',
    '5) monthly summary text',
  ].join('\n');
}

async function generateText({ apiKey, prompt, systemPrompt = '', modelName, temperature = 0.5, maxOutputTokens = 700 }) {
  try {
    const client = createClient(apiKey);
    const model = client.getGenerativeModel({
      model: modelName || getModelName(),
      generationConfig: {
        temperature,
      },
      systemInstruction: systemPrompt || undefined,
    });

    const result = await model.generateContent(prompt);
    const response = result?.response;
    const text = response?.text?.() || '';

    if (!text.trim()) {
      throw new Error('Gemini returned an empty response.');
    }

    return text.trim();
  } catch (err) {
    const message = String(err?.message || err);
    if (message.includes('404')) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await res.json();
        const available = (data.models || [])
          .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
          .map(m => m.name.replace('models/', ''))
          .join(', ');
        
        if (available) {
          throw new AppError(`Model not mapped to this key. Available models for your key: ${available}. Please set GEMINI_MODEL in .env to one of these.`, 502, 'GEMINI_ERROR');
        }
      } catch (fetchErr) {
        if (fetchErr instanceof AppError) throw fetchErr; // Pass through our custom error
      }
    }
    throw normalizeError(err);
  }
}

async function generateAdviceReport(payload = {}) {
  const prompt = buildFinancePrompt(payload);
  const systemPrompt =
    'You are a finance coach for a personal expense tracker. Be concise, specific, and practical.';

  const text = await generateText({
    apiKey: payload.apiKey,
    prompt,
    systemPrompt,
    modelName: payload.modelName,
    temperature: payload.temperature ?? 0.45,
    maxOutputTokens: payload.maxOutputTokens ?? 800,
  });

  return {
    text,
    model: payload.modelName || getModelName(),
  };
}

async function generateSummary(payload = {}) {
  return generateAdviceReport(payload);
}

async function generateSuggestionReport(payload = {}) {
  return generateAdviceReport(payload);
}

async function generateReport(apiKey, payload = {}) {
  return generateText({
    apiKey,
    prompt: buildFinancePrompt(payload),
    systemPrompt: 'You are a finance coach for a personal expense tracker. Be concise, specific, and practical.',
    modelName: getModelName(),
    temperature: 0.45,
    maxOutputTokens: 800,
  });
}

module.exports = {
  generateText,
  generateAdviceReport,
  generateSummary,
  generateSuggestionReport,
  generateReport,
  buildFinancePrompt,
};