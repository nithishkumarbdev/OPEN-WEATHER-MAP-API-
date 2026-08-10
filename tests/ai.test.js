import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { generateApologyMessage } from '../src/ai.js';

vi.mock('axios');

const ENV_KEYS = [
  'MODEL',
  'OPENROUTER_API_KEY',
  'GROQ_API_KEY',
  'GEMINI_API_KEY',
  'CLAUDE_API_KEY',
  'OLLAMA_BASE_URL',
];
const originalEnv = {};

beforeEach(() => {
  vi.clearAllMocks();
  for (const key of ENV_KEYS) {
    originalEnv[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
  vi.restoreAllMocks();
});

const sampleOrder = { customer: 'Alice Smith', city: 'New York', condition: 'Rain' };

describe('generateApologyMessage', () => {
  it('uses the provider set in MODEL when it succeeds', async () => {
    process.env.MODEL = 'groq';
    process.env.GROQ_API_KEY = 'test-key';
    axios.post.mockResolvedValue({
      data: { choices: [{ message: { content: 'Sorry Alice, delayed by rain.' } }] },
    });

    const message = await generateApologyMessage(sampleOrder);

    expect(message).toBe('Sorry Alice, delayed by rain.');
    expect(axios.post).toHaveBeenCalledTimes(1);
    expect(axios.post.mock.calls[0][0]).toContain('groq.com');
  });

  it('falls through to the next provider when the preferred one fails', async () => {
    process.env.MODEL = 'openrouter';
    process.env.OPENROUTER_API_KEY = 'bad-key';
    process.env.GROQ_API_KEY = 'good-key';

    axios.post.mockImplementation((url) => {
      if (url.includes('openrouter')) {
        return Promise.reject(new Error('rate limited'));
      }
      if (url.includes('groq')) {
        return Promise.resolve({
          data: { choices: [{ message: { content: 'Sorry, delayed.' } }] },
        });
      }
      return Promise.reject(new Error('not mocked'));
    });

    const message = await generateApologyMessage(sampleOrder);

    expect(message).toBe('Sorry, delayed.');
  });

  it('falls back to the template message when every provider fails or has no key', async () => {
    axios.post.mockRejectedValue(new Error('network error'));

    const message = await generateApologyMessage(sampleOrder);

    expect(message).toBe(
      'Hi Alice, your order to New York has been delayed due to rain conditions. We appreciate your patience.'
    );
  });

  it('tries Ollama without requiring an API key', async () => {
    process.env.MODEL = 'ollama';
    axios.post.mockImplementation((url) => {
      if (url.includes('11434')) {
        return Promise.resolve({ data: { response: 'Sorry about that.' } });
      }
      return Promise.reject(new Error('not mocked'));
    });

    const message = await generateApologyMessage(sampleOrder);

    expect(message).toBe('Sorry about that.');
  });

  it('falls back when a provider returns a malformed response with no content', async () => {
    process.env.MODEL = 'ollama';
    axios.post.mockResolvedValue({ data: {} });

    const message = await generateApologyMessage(sampleOrder);

    expect(message).toContain('Alice');
    expect(message).toContain('New York');
  });
});
