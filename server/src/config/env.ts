export interface ValidatedEnv {
  PORT: number;
  HOST: string;
  NODE_ENV: 'production' | 'development' | 'test';
  MONGODB_URI: string;
  JWT_SECRET: string;
  CLIENT_URL: string;
  CLIENT_ORIGINS: string[];
}

export const validateEnv = (): ValidatedEnv => {
  const errors: string[] = [];

  // 1. NODE_ENV validation
  const rawNodeEnv = process.env.NODE_ENV;
  if (!rawNodeEnv) {
    errors.push('NODE_ENV is required (must be "production", "development", or "test").');
  } else if (!['production', 'development', 'test'].includes(rawNodeEnv)) {
    errors.push(`NODE_ENV must be "production", "development", or "test" (received: "${rawNodeEnv}").`);
  }
  const nodeEnv = (rawNodeEnv as 'production' | 'development' | 'test') || 'development';
  const isProduction = nodeEnv === 'production';

  // 2. MONGODB_URI validation
  const mongoUri = process.env.MONGODB_URI?.trim();
  if (!mongoUri) {
    errors.push('MONGODB_URI is required (e.g. mongodb+srv://<user>:<password>@cluster.mongodb.net/playnear_platform_db).');
  } else if (!mongoUri.startsWith('mongodb://') && !mongoUri.startsWith('mongodb+srv://')) {
    errors.push('MONGODB_URI must start with "mongodb://" or "mongodb+srv://".');
  }

  // 3. JWT_SECRET validation
  const jwtSecret = process.env.JWT_SECRET?.trim();
  if (!jwtSecret) {
    errors.push('JWT_SECRET is required for signing authentication tokens.');
  } else if (isProduction && jwtSecret.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters long in production for cryptographic safety.');
  } else if (isProduction && /replace_in_production|your_jwt_secret|changeme|default_key|placeholder/i.test(jwtSecret)) {
    errors.push('JWT_SECRET contains an insecure placeholder phrase. Please generate a strong random secret.');
  }

  // 4. CLIENT_URL validation & parsing
  const clientUrlRaw = process.env.CLIENT_URL?.trim();
  if (!clientUrlRaw) {
    errors.push('CLIENT_URL is required to configure CORS allowed origins (comma-separated for multiple origins).');
  }

  // Parse comma-separated client URLs
  const clientOrigins: string[] = [];
  if (clientUrlRaw) {
    const rawOrigins = clientUrlRaw.split(',').map(s => s.trim().replace(/\/+$/, '')).filter(Boolean);
    if (rawOrigins.length === 0) {
      errors.push('CLIENT_URL must contain at least one valid origin URL.');
    }
    for (const origin of rawOrigins) {
      try {
        const parsed = new URL(origin);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          errors.push(`CLIENT_URL origin "${origin}" must use http or https protocol.`);
        }
        clientOrigins.push(`${parsed.protocol}//${parsed.host}`);
      } catch {
        errors.push(`CLIENT_URL contains an invalid URL: "${origin}".`);
      }
    }
  }

  // If in development mode, automatically include localhost origins for developer convenience
  if (!isProduction) {
    if (!clientOrigins.includes('http://localhost:3000')) {
      clientOrigins.push('http://localhost:3000');
    }
    if (!clientOrigins.includes('http://127.0.0.1:3000')) {
      clientOrigins.push('http://127.0.0.1:3000');
    }
  }

  // Fail-fast with clear diagnostics if any required variables are invalid
  if (errors.length > 0) {
    console.error('');
    console.error('================================================================================');
    console.error('❌ FATAL CONFIGURATION ERROR: Invalid or Missing Environment Variables');
    console.error('================================================================================');
    console.error('The server cannot start due to the following configuration issues:');
    errors.forEach((err, idx) => {
      console.error(`  ${idx + 1}. ${err}`);
    });
    console.error('================================================================================');
    console.error('Please configure these environment variables in your Render Dashboard or .env file.');
    console.error('================================================================================');
    console.error('');
    process.exit(1);
  }

  const port = Number(process.env.PORT) || 5000;
  const host = '0.0.0.0';

  return {
    PORT: port,
    HOST: host,
    NODE_ENV: nodeEnv,
    MONGODB_URI: mongoUri!,
    JWT_SECRET: jwtSecret!,
    CLIENT_URL: clientUrlRaw!,
    CLIENT_ORIGINS: clientOrigins,
  };
};
