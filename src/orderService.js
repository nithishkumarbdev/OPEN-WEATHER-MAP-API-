import logger from './logger.js';
import { generateApologyMessage } from './ai.js';
import { DELAY_TRIGGER_CONDITIONS } from './constants.js';

// order and result arrays line up by index, not order_id
export function applyWeatherToOrders(orders, weatherResults) {
  return orders.map((order, index) => {
    const result = weatherResults[index];

    if (!result || result.error) {
      logger.warn(`Order ${order.order_id} (${order.city}) left unchanged - weather lookup failed`);
      return {
        ...order,
        weatherError: result?.error ?? 'No weather data returned',
      };
    }

    const isDelayCondition = DELAY_TRIGGER_CONDITIONS.includes(result.weather.condition);

    if (isDelayCondition) {
      logger.info(`Order ${order.order_id} delayed - ${result.weather.condition} in ${order.city}`);
      return {
        ...order,
        status: 'Delayed',
        weatherCondition: result.weather.condition,
        temperature: result.weather.temperature,
      };
    }

    logger.info(`Order ${order.order_id} unchanged - ${result.weather.condition} in ${order.city}`);
    return {
      ...order,
      weatherCondition: result.weather.condition,
      temperature: result.weather.temperature,
    };
  });
}

export async function generateApologyMessages(updatedOrders) {
  const delayedOrders = updatedOrders.filter((order) => order.status === 'Delayed');

  const messages = await Promise.all(
    delayedOrders.map(async (order) => {
      const message = await generateApologyMessage({
        customer: order.customer,
        city: order.city,
        condition: order.weatherCondition || 'severe',
      });

      return {
        order_id: order.order_id,
        customer: order.customer,
        city: order.city,
        message,
      };
    })
  );

  return messages;
}
