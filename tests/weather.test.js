import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { fetchWeatherForCity, fetchWeatherForOrders } from '../src/weather.js';

vi.mock('axios');

const ORIGINAL_ENV = process.env.OPENWEATHER_API_KEY;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.OPENWEATHER_API_KEY = 'test-key';
});

afterEach(() => {
  process.env.OPENWEATHER_API_KEY = ORIGINAL_ENV;
  vi.restoreAllMocks();
});

describe('fetchWeatherForCity', () => {
  it('returns parsed weather data on success', async () => {
    axios.get.mockResolvedValue({
      data: { weather: [{ main: 'Rain', description: 'light rain' }], main: { temp: 15 } },
    });

    const result = await fetchWeatherForCity('New York');

    expect(result).toEqual({
      city: 'New York',
      condition: 'Rain',
      description: 'light rain',
      temperature: 15,
    });
  });

  it('throws immediately on a 404 without retrying', async () => {
    const notFoundError = new Error('Request failed with status code 404');
    notFoundError.response = { status: 404 };
    axios.get.mockRejectedValue(notFoundError);

    await expect(fetchWeatherForCity('InvalidCity123')).rejects.toThrow(
      'City "InvalidCity123" not found'
    );
    expect(axios.get).toHaveBeenCalledTimes(1);
  });

  it('retries on a timeout and succeeds on a later attempt', async () => {
    const timeoutError = new Error('timeout of 8000ms exceeded');
    timeoutError.code = 'ECONNABORTED';

    axios.get.mockRejectedValueOnce(timeoutError).mockResolvedValueOnce({
      data: { weather: [{ main: 'Clear', description: 'clear sky' }], main: { temp: 20 } },
    });

    const result = await fetchWeatherForCity('London');

    expect(result.condition).toBe('Clear');
    expect(axios.get).toHaveBeenCalledTimes(2);
  });

  it('throws a clear error when every retry times out', async () => {
    const timeoutError = new Error('timeout of 8000ms exceeded');
    timeoutError.code = 'ECONNABORTED';
    axios.get.mockRejectedValue(timeoutError);

    await expect(fetchWeatherForCity('Nowhere')).rejects.toThrow(/timed out/);
  });

  it('throws when the response is missing weather data', async () => {
    axios.get.mockResolvedValue({ data: { weather: [{}] } });

    await expect(fetchWeatherForCity('Mumbai')).rejects.toThrow(/Unexpected response shape/);
  });

  it('throws when OPENWEATHER_API_KEY is missing', async () => {
    delete process.env.OPENWEATHER_API_KEY;

    await expect(fetchWeatherForCity('New York')).rejects.toThrow('OPENWEATHER_API_KEY is not set');
  });
});

describe('fetchWeatherForOrders', () => {
  it('fetches all cities concurrently, not sequentially', async () => {
    let inFlight = 0;
    let maxInFlight = 0;

    axios.get.mockImplementation(async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 20));
      inFlight -= 1;
      return { data: { weather: [{ main: 'Clear', description: 'clear' }], main: { temp: 20 } } };
    });

    const orders = [
      { order_id: '1', city: 'New York' },
      { order_id: '2', city: 'Mumbai' },
      { order_id: '3', city: 'London' },
    ];

    await fetchWeatherForOrders(orders);

    expect(maxInFlight).toBeGreaterThan(1);
  });

  it('keeps processing remaining cities when one fails', async () => {
    axios.get.mockImplementation(async (url, config) => {
      if (config.params.q === 'InvalidCity123') {
        const err = new Error('Request failed with status code 404');
        err.response = { status: 404 };
        throw err;
      }
      return { data: { weather: [{ main: 'Rain', description: 'rain' }], main: { temp: 10 } } };
    });

    const orders = [
      { order_id: '1', city: 'New York' },
      { order_id: '2', city: 'InvalidCity123' },
      { order_id: '3', city: 'London' },
    ];

    const results = await fetchWeatherForOrders(orders);

    expect(results).toHaveLength(3);
    expect(results[0].error).toBeNull();
    expect(results[1].error).toMatch(/not found/);
    expect(results[2].error).toBeNull();
  });

  it('returns an empty array for an empty order list', async () => {
    const results = await fetchWeatherForOrders([]);
    expect(results).toEqual([]);
  });
});
