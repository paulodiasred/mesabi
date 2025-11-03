export default () => ({
  port: parseInt(process.env.PORT, 10) || 3001,
  environment: process.env.NODE_ENV || 'development',
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'mesabi-jwt-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || '',
  },
  cache: {
    ttl: parseInt(process.env.CACHE_TTL, 10) || 3600,
    max: parseInt(process.env.CACHE_MAX, 10) || 10000,
  },
  api: {
    prefix: process.env.API_PREFIX || 'api/v1',
  },
  query: {
    timeout: parseInt(process.env.QUERY_TIMEOUT, 10) || 30000,
    maxLimit: parseInt(process.env.QUERY_MAX_LIMIT, 10) || 10000,
  },
});

