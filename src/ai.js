import axios from 'axios';
import logger from './logger.js';
import { REQUEST_TIMEOUT_MS, AI_PROVIDER_PRIORITY } from './constants.js';

function buildApologyPrompt({ customer, city, condition }) {
  return `Write one short, friendly customer apology message for a delivery delay.

Customer name: ${customer}
Delivery city: ${city}
Reason for delay: ${condition.toLowerCase()} weather

Rules:
- Output only the message itself, nothing else.
- No markdown, no bullet points, no headings, no explanations.
- One or two sentences, warm and professional tone.
- Follow this style: "Hi Alice, your order to New York has been delayed due to heavy rain. We appreciate your patience."`;
}

function requireApiKey(envVar) {
  const apiKey = process.env[envVar];
  if (!apiKey) throw new Error(`${envVar} is missing`);
  return apiKey;
}

async function callOpenRouter(prompt) {
  const apiKey = requireApiKey('OPENROUTER_API_KEY');

  const { data } = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      model: 'meta-llama/llama-3.1-8b-instruct:free',
      messages: [{ role: 'user', content: prompt }],
    },
    {
      headers: { Authorization: `Bearer ${apiKey}` },
      timeout: REQUEST_TIMEOUT_MS,
    }
  );

  return data?.choices?.[0]?.message?.content?.trim();
}

async function callGroq(prompt) {
  const apiKey = requireApiKey('GROQ_API_KEY');

  const { data } = await axios.post(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
    },
    {
      headers: { Authorization: `Bearer ${apiKey}` },
      timeout: REQUEST_TIMEOUT_MS,
    }
  );

  return data?.choices?.[0]?.message?.content?.trim();
}

async function callGemini(prompt) {
  const apiKey = requireApiKey('GEMINI_API_KEY');

  const { data } = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    { contents: [{ parts: [{ text: prompt }] }] },
    { timeout: REQUEST_TIMEOUT_MS }
  );

  return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
}

async function callOllama(prompt) {
  const model = process.env.OLLAMA_MODEL || 'llama3';
  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

  const { data } = await axios.post(
    `${baseUrl}/api/generate`,
    { model, prompt, stream: false },
    { timeout: REQUEST_TIMEOUT_MS }
  );

  return data?.response?.trim();
}

async function callClaude(prompt) {
  const apiKey = requireApiKey('CLAUDE_API_KEY');

  const { data } = await axios.post(
    'https://api.anthropic.com/v1/messages',
    {
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 150,
      messages: [{ role: 'user', content: prompt }],
    },
    {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      timeout: REQUEST_TIMEOUT_MS,
    }
  );

  return data?.content?.[0]?.text?.trim();
}

const PROVIDER_HANDLERS = {
  openrouter: callOpenRouter,
  groq: callGroq,
  gemini: callGemini,
  ollama: callOllama,
  claude: callClaude,
};

function buildFallbackMessage({ customer, city, condition }) {
  const firstName = customer.split(' ')[0];
  return `Hi ${firstName}, your order to ${city} has been delayed due to ${condition.toLowerCase()} conditions. We appreciate your patience.`;
}

export async function generateApologyMessage(order) {
  const prompt = buildApologyPrompt(order);
  const preferredProvider = process.env.MODEL;

  const providersToTry = preferredProvider
    ? [preferredProvider, ...AI_PROVIDER_PRIORITY.filter((name) => name !== preferredProvider)]
    : AI_PROVIDER_PRIORITY;

  for (const providerName of providersToTry) {
    const callProvider = PROVIDER_HANDLERS[providerName];
    if (!callProvider) continue;

    try {
      const message = await callProvider(prompt);
      if (message) {
        logger.info(`AI message generated via ${providerName} for ${order.customer}`);
        return message;
      }
    } catch (err) {
      logger.warn(`${providerName} provider failed: ${err.message}`);
    }
  }

  logger.warn(`All AI providers unavailable for ${order.customer}, using fallback message`);
  return buildFallbackMessage(order);
}
