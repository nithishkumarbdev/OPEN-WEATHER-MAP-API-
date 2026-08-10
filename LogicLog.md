# Logic Log

Design decisions and trade-offs that aren't obvious from reading the code
on its own.

## Matching orders to weather results by index, not order_id

`applyWeatherToOrders` (in `orderService.js`) lines up `orders` and
`weatherResults` by array position rather than looking up each result by
`order_id`. This wasn't the first approach: the original version used a
`Map` keyed by `order_id`, which broke if two orders shared the same ID:
the second entry silently overwrote the first in the map, so both orders
ended up with the same weather data. Since `fetchWeatherForOrders` builds
its result array with `Promise.all(orders.map(...))`, the output is
already guaranteed to be in the same order as the input, so indexing into
it directly is both simpler and correct regardless of whether `order_id`
values are unique.

## Delay rule

An order becomes `Delayed` when OpenWeatherMap's `weather[0].main` is
exactly `Rain`, `Snow`, or `Extreme`. Any other
condition (`Clear`, `Clouds`, etc.) leaves `status` as-is, but the order
still gets a `weatherCondition` field so it's clear a lookup happened.

## Retry logic

`withRetry` retries up to twice with a fixed delay between attempts. It
takes an optional `shouldRetry` predicate, used in `weather.js` to skip
retries on a 404, since a city that doesn't exist won't exist on the next
attempt either and retrying just adds latency for no benefit. Timeouts,
network errors, and 5xx responses do get retried, since those are the
failure modes retries actually help with.

No exponential backoff: a fixed delay is enough for two retries on a
free-tier weather API, and backoff would be more complexity than this
scale of retrying needs.

## Error handling for weather lookups

Each city lookup is wrapped in its own try/catch inside
`fetchWeatherForOrders`, so `Promise.all` always resolves with a result
per order (success or error) instead of rejecting on the first failure.
This is what makes one bad city (like `InvalidCity123`) not take down the
rest of the batch. Errors are categorized where it's useful (404 → not
found, `ECONNABORTED` → timeout, missing `weather[0].main` → malformed
response) so the logged message says something specific instead of just
"request failed."

## AI provider fallback

`generateApologyMessage` tries providers in this order unless `MODEL`
overrides it: OpenRouter, Groq, Gemini, Ollama, Claude. Each provider
function throws if its API key is missing or the request fails; the loop
in `generateApologyMessage` catches that, logs a warning, and moves to
the next provider. If every provider fails (or none are configured), it
falls back to a template message rather than leaving the order without
an apology message. This means the pipeline finishes even with zero AI
keys configured, which is useful for testing without paying for API calls.

## Validation approach

Input validation is intentionally light. `readJsonFile` throws a clear
error on missing files or invalid JSON, and a missing
`OPENWEATHER_API_KEY` stops the script before any requests go out. Beyond
that, malformed or missing fields on individual orders are allowed to
fail at the point of use (e.g., a missing `city` fails the weather
lookup for that order specifically) rather than being validated upfront,
since the failure is already isolated per-order and a separate validation
pass would just duplicate that same error handling.

## Testing strategy

All HTTP calls (OpenWeatherMap and every AI provider) are mocked in
tests, since the goal is to verify this project's own logic (retry
rules, the delay rule, provider fallback order, duplicate-ID handling),
not to depend on live third-party APIs during a test run. Manual runs
against the real APIs were also done during development to confirm the
request/response shapes the mocks are based on are accurate.
