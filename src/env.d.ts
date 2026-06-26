interface Hyperdrive {
  host: string;
  user: string;
  password: string;
  database: string;
  port: number;
}

interface RateLimit {
  limit(input: { key: string }): Promise<{ success: boolean }>;
}

interface Env {
  PHOTOS_PUBLIC_URL?: string;
  PHOTOS_LOCAL_DIR?: string;
  S3_ENDPOINT?: string;
  S3_REGION?: string;
  S3_BUCKET?: string;
  S3_ACCESS_KEY_ID?: string;
  S3_SECRET_ACCESS_KEY?: string;
  S3_PUBLIC_URL?: string;
  HYPERDRIVE: Hyperdrive;
  AUTH_RATE_LIMITER: RateLimit;
  GOOGLE_CLIENT_ID: string;
  INITIAL_ADMIN_EMAIL: string;
  DEV_BYPASS_AUTH: string;
  JWT_SECRET: string;
  TRUST_PROXY?: string;
}
