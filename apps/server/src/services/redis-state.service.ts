import Redis from 'ioredis';

let client: Redis | null | undefined;
let subscriber: Redis | null | undefined;

function redisUrl() {
  return process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}`;
}

function getRedis(): Redis | null {
  if (process.env.REDIS_DISABLED === 'true') return null;
  if (client !== undefined) return client;

  client = new Redis(redisUrl(), {
    lazyConnect: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    retryStrategy: (times) => (times > 3 ? null : Math.min(times * 100, 500)),
  });

  client.on('error', (err) => {
    console.warn('[redis] state persistence unavailable:', err.message);
  });

  return client;
}

async function withRedis<T>(operation: (redis: Redis) => Promise<T>): Promise<T | null> {
  const redis = getRedis();
  if (!redis) return null;

  try {
    if (redis.status === 'wait') {
      await redis.connect();
    }
    return await operation(redis);
  } catch (err) {
    console.warn('[redis] state operation failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

export async function setJsonState(key: string, value: unknown, ttlSeconds?: number): Promise<boolean> {
  const result = await withRedis(async (redis) => {
    const payload = JSON.stringify(value);
    if (ttlSeconds) {
      await redis.set(key, payload, 'EX', ttlSeconds);
    } else {
      await redis.set(key, payload);
    }
    return true;
  });
  return result === true;
}

export async function getJsonState<T>(key: string): Promise<T | null> {
  return withRedis(async (redis) => {
    const value = await redis.get(key);
    return value ? JSON.parse(value) as T : null;
  });
}

export async function deleteJsonState(key: string): Promise<boolean> {
  const result = await withRedis(async (redis) => {
    await redis.del(key);
    return true;
  });
  return result === true;
}

export async function listJsonState<T>(pattern: string): Promise<T[] | null> {
  return withRedis(async (redis) => {
    const values: T[] = [];
    let cursor = '0';

    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      if (keys.length > 0) {
        const payloads = await redis.mget(...keys);
        for (const payload of payloads) {
          if (payload) values.push(JSON.parse(payload) as T);
        }
      }
    } while (cursor !== '0');

    return values;
  });
}

export async function publishJsonMessage(channel: string, payload: unknown): Promise<boolean> {
  const result = await withRedis(async (redis) => {
    await redis.publish(channel, JSON.stringify(payload));
    return true;
  });
  return result === true;
}

export async function subscribeJsonMessages<T>(
  channel: string,
  handler: (payload: T) => void | Promise<void>,
): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;

  try {
    if (!subscriber) {
      subscriber = redis.duplicate({
        lazyConnect: true,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 1,
        retryStrategy: (times) => (times > 3 ? null : Math.min(times * 100, 500)),
      });
      subscriber.on('error', (err) => {
        console.warn('[redis] state subscription unavailable:', err.message);
      });
    }

    if (subscriber.status === 'wait') {
      await subscriber.connect();
    }

    subscriber.on('message', (receivedChannel, message) => {
      if (receivedChannel !== channel) return;
      try {
        void handler(JSON.parse(message) as T);
      } catch (err) {
        console.warn('[redis] invalid realtime bridge message:', err instanceof Error ? err.message : err);
      }
    });
    await subscriber.subscribe(channel);
    return true;
  } catch (err) {
    console.warn('[redis] state subscription failed:', err instanceof Error ? err.message : err);
    return false;
  }
}
