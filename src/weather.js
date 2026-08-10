import axios from 'axios';
import logger from './logger.js';
import { withRetry } from './utils.js';
import { WEATHER_API_URL, REQUEST_TIMEOUT_MS, MAX_RETRIES, RETRY_DELAY_MS } from './constants.js';

export async function fetchWeatherForCity(city) {
  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (!apiKey) {
    throw new Error('OPENWEATHER_API_KEY is not set');
  }

  const makeRequest = () =>
    axios.get(WEATHER_API_URL, {
      params: {
        q: city,
        appid: apiKey,
        units: 'metric',
      },
      timeout: REQUEST_TIMEOUT_MS,
    });

  let response;

  try {
    response = await withRetry(makeRequest, {
      retries: MAX_RETRIES,
      delayMs: RETRY_DELAY_MS,
      shouldRetry: (err) => err.response?.status !== 404,
    });
  } catch (err) {
    if (err.response?.status === 404) {
      throw new Error(`City "${city}" not found`, { cause: err });
    }
    if (err.code === 'ECONNABORTED') {
      throw new Error(`Request to weather API timed out for "${city}"`, { cause: err });
    }
    throw new Error(`Weather API request failed for "${city}": ${err.message}`, { cause: err });
  }

  const conditionData = response.data?.weather?.[0];

  if (!conditionData?.main) {
    throw new Error(`Unexpected response shape from weather API for "${city}"`);
  }

  return {
    city,
    condition: conditionData.main,
    description: conditionData.description,
    temperature: response.data.main?.temp ?? null,
  };
}

export async function fetchWeatherForOrders(orders) {
  const lookups = orders.map(async (order) => {
    logger.info(`Processing city: ${order.city} (order ${order.order_id})`);

    try {
      const weather = await fetchWeatherForCity(order.city);
      logger.info(`Weather fetched for ${order.city}: ${weather.condition}`);
      return { orderId: order.order_id, weather, error: null };
    } catch (err) {
      logger.error(`Weather lookup failed for ${order.city}: ${err.message}`);
      return { orderId: order.order_id, weather: null, error: err.message };
    }
  });

  return Promise.all(lookups);
}
