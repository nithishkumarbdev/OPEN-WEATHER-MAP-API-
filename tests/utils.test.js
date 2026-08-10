import { describe, it, expect, vi, afterEach } from 'vitest';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { readJsonFile, writeJsonFile, withRetry, sleep } from '../src/utils.js';

describe('readJsonFile', () => {
  it('parses a valid JSON file', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'utils-test-'));
    const filePath = join(dir, 'data.json');
    await writeJsonFile(filePath, { hello: 'world' });

    const result = await readJsonFile(filePath);

    expect(result).toEqual({ hello: 'world' });
    await rm(dir, { recursive: true, force: true });
  });

  it('throws a clear error on malformed JSON', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'utils-test-'));
    const filePath = join(dir, 'broken.json');
    const { writeFile } = await import('fs/promises');
    await writeFile(filePath, '{ this is not valid json');

    await expect(readJsonFile(filePath)).rejects.toThrow(/valid JSON/);
    await rm(dir, { recursive: true, force: true });
  });

  it('throws a clear error when the file does not exist', async () => {
    await expect(readJsonFile('/tmp/definitely-does-not-exist-12345.json')).rejects.toThrow(
      /Could not read file/
    );
  });

  it('reads an empty array correctly', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'utils-test-'));
    const filePath = join(dir, 'empty.json');
    await writeJsonFile(filePath, []);

    const result = await readJsonFile(filePath);

    expect(result).toEqual([]);
    await rm(dir, { recursive: true, force: true });
  });
});

describe('writeJsonFile', () => {
  it('creates the output directory if it does not exist', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'utils-test-'));
    const filePath = join(dir, 'nested', 'deep', 'output.json');

    await writeJsonFile(filePath, { ok: true });
    const result = await readJsonFile(filePath);

    expect(result).toEqual({ ok: true });
    await rm(dir, { recursive: true, force: true });
  });
});

describe('withRetry', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the result immediately on success', async () => {
    const fn = vi.fn().mockResolvedValue('ok');

    const result = await withRetry(fn, { retries: 2, delayMs: 0 });

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on failure and succeeds within the retry budget', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValueOnce('recovered');

    const result = await withRetry(fn, { retries: 2, delayMs: 0 });

    expect(result).toBe('recovered');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('throws after exhausting all retries', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'));

    await expect(withRetry(fn, { retries: 2, delayMs: 0 })).rejects.toThrow('always fails');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('stops immediately when shouldRetry returns false, without wasting attempts', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('not found'));
    const shouldRetry = vi.fn().mockReturnValue(false);

    await expect(withRetry(fn, { retries: 2, delayMs: 0, shouldRetry })).rejects.toThrow(
      'not found'
    );
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('sleep', () => {
  it('resolves after roughly the requested delay', async () => {
    const start = Date.now();
    await sleep(20);
    expect(Date.now() - start).toBeGreaterThanOrEqual(15);
  });
});
