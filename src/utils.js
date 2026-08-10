import { readFile, writeFile, mkdir } from 'fs/promises';
import { dirname } from 'path';

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function readJsonFile(filePath) {
  let raw;

  try {
    raw = await readFile(filePath, 'utf-8');
  } catch (err) {
    throw new Error(`Could not read file at ${filePath}: ${err.message}`, { cause: err });
  }

  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`File at ${filePath} does not contain valid JSON: ${err.message}`, {
      cause: err,
    });
  }
}

export async function writeJsonFile(filePath, data) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export async function withRetry(fn, options = {}) {
  const { retries = 2, delayMs = 1000, shouldRetry = () => true } = options;

  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isLastAttempt = attempt === retries + 1;
      if (isLastAttempt || !shouldRetry(err)) {
        throw err;
      }
      await sleep(delayMs);
    }
  }
}
