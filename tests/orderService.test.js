import { describe, it, expect, vi } from 'vitest';
import { applyWeatherToOrders, generateApologyMessages } from '../src/orderService.js';

vi.mock('../src/ai.js', () => ({
  generateApologyMessage: vi.fn(
    async ({ customer, city }) => `Sorry ${customer}, ${city} is delayed.`
  ),
}));

describe('applyWeatherToOrders', () => {
  it('marks an order Delayed when the condition is Rain, Snow, or Extreme', () => {
    const orders = [
      { order_id: '1', customer: 'A', city: 'CityA', status: 'Pending' },
      { order_id: '2', customer: 'B', city: 'CityB', status: 'Pending' },
      { order_id: '3', customer: 'C', city: 'CityC', status: 'Pending' },
    ];
    const weatherResults = [
      { weather: { condition: 'Rain' }, error: null },
      { weather: { condition: 'Snow' }, error: null },
      { weather: { condition: 'Extreme' }, error: null },
    ];

    const result = applyWeatherToOrders(orders, weatherResults);

    expect(result.every((order) => order.status === 'Delayed')).toBe(true);
  });

  it('leaves an order unchanged when the condition is not a delay trigger', () => {
    const orders = [{ order_id: '1', customer: 'A', city: 'CityA', status: 'Pending' }];
    const weatherResults = [{ weather: { condition: 'Clear' }, error: null }];

    const result = applyWeatherToOrders(orders, weatherResults);

    expect(result[0].status).toBe('Pending');
    expect(result[0].weatherCondition).toBe('Clear');
  });

  it('leaves the order unchanged and records the error when the lookup failed', () => {
    const orders = [
      { order_id: '4', customer: 'InvalidCity123', city: 'InvalidCity123', status: 'Pending' },
    ];
    const weatherResults = [{ weather: null, error: 'City "InvalidCity123" not found' }];

    const result = applyWeatherToOrders(orders, weatherResults);

    expect(result[0].status).toBe('Pending');
    expect(result[0].weatherError).toBe('City "InvalidCity123" not found');
  });

  it('correlates results by position, not by order_id, so duplicate IDs do not cross-contaminate', () => {
    const orders = [
      { order_id: '1', customer: 'A', city: 'CityA', status: 'Pending' },
      { order_id: '1', customer: 'B', city: 'CityB', status: 'Pending' },
    ];
    const weatherResults = [
      { weather: { condition: 'Rain' }, error: null },
      { weather: { condition: 'Clear' }, error: null },
    ];

    const result = applyWeatherToOrders(orders, weatherResults);

    expect(result[0].status).toBe('Delayed');
    expect(result[0].city).toBe('CityA');
    expect(result[1].status).toBe('Pending');
    expect(result[1].city).toBe('CityB');
  });

  it('handles an all-delayed batch', () => {
    const orders = [
      { order_id: '1', customer: 'A', city: 'CityA', status: 'Pending' },
      { order_id: '2', customer: 'B', city: 'CityB', status: 'Pending' },
    ];
    const weatherResults = [
      { weather: { condition: 'Rain' }, error: null },
      { weather: { condition: 'Snow' }, error: null },
    ];

    const result = applyWeatherToOrders(orders, weatherResults);

    expect(result.filter((o) => o.status === 'Delayed')).toHaveLength(2);
  });

  it('handles a none-delayed batch', () => {
    const orders = [
      { order_id: '1', customer: 'A', city: 'CityA', status: 'Pending' },
      { order_id: '2', customer: 'B', city: 'CityB', status: 'Pending' },
    ];
    const weatherResults = [
      { weather: { condition: 'Clear' }, error: null },
      { weather: { condition: 'Clouds' }, error: null },
    ];

    const result = applyWeatherToOrders(orders, weatherResults);

    expect(result.filter((o) => o.status === 'Delayed')).toHaveLength(0);
  });

  it('returns an empty array for an empty order list', () => {
    expect(applyWeatherToOrders([], [])).toEqual([]);
  });
});

describe('generateApologyMessages', () => {
  it('generates a message only for delayed orders', async () => {
    const updatedOrders = [
      {
        order_id: '1',
        customer: 'Alice',
        city: 'New York',
        status: 'Delayed',
        weatherCondition: 'Rain',
      },
      {
        order_id: '2',
        customer: 'Bob',
        city: 'Mumbai',
        status: 'Pending',
        weatherCondition: 'Clear',
      },
    ];

    const messages = await generateApologyMessages(updatedOrders);

    expect(messages).toHaveLength(1);
    expect(messages[0].order_id).toBe('1');
    expect(messages[0].message).toContain('Alice');
  });

  it('returns an empty array when nothing is delayed', async () => {
    const updatedOrders = [
      {
        order_id: '1',
        customer: 'Alice',
        city: 'New York',
        status: 'Pending',
        weatherCondition: 'Clear',
      },
    ];

    const messages = await generateApologyMessages(updatedOrders);

    expect(messages).toEqual([]);
  });
});
