import 'dotenv/config';
import logger from './logger.js';
import { readJsonFile, writeJsonFile } from './utils.js';
import { fetchWeatherForOrders } from './weather.js';
import { applyWeatherToOrders, generateApologyMessages } from './orderService.js';
import {
  ORDERS_INPUT_PATH,
  UPDATED_ORDERS_OUTPUT_PATH,
  APOLOGY_MESSAGES_OUTPUT_PATH,
} from './constants.js';

async function run() {
  logger.info('Starting delivery weather check');

  if (!process.env.OPENWEATHER_API_KEY) {
    logger.error('OPENWEATHER_API_KEY is missing - add it to your .env file');
    process.exit(1);
  }

  const orders = await readJsonFile(ORDERS_INPUT_PATH);
  logger.info(`Loaded ${orders.length} orders from ${ORDERS_INPUT_PATH}`);

  const weatherResults = await fetchWeatherForOrders(orders);
  const updatedOrders = applyWeatherToOrders(orders, weatherResults);

  await writeJsonFile(UPDATED_ORDERS_OUTPUT_PATH, updatedOrders);
  logger.success(`Updated orders written to ${UPDATED_ORDERS_OUTPUT_PATH}`);

  const apologyMessages = await generateApologyMessages(updatedOrders);
  await writeJsonFile(APOLOGY_MESSAGES_OUTPUT_PATH, apologyMessages);
  logger.success(`Apology messages written to ${APOLOGY_MESSAGES_OUTPUT_PATH}`);

  const delayedCount = updatedOrders.filter((order) => order.status === 'Delayed').length;
  const failedCount = weatherResults.filter((result) => result.error).length;

  logger.success(
    `Finished: ${orders.length} orders processed, ${delayedCount} delayed, ${failedCount} lookups failed`
  );
}

run().catch((err) => {
  logger.error(`Fatal error: ${err.message}`);
  process.exit(1);
});
