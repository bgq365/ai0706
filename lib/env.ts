const toBoolean = (value: string | undefined) => value === "true";

const DEFAULT_JWT_SECRET = "dev-only-secret-change-me";

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  vercelEnv: process.env.VERCEL_ENV || "",
  appBaseUrl: process.env.APP_BASE_URL || "http://localhost:3000",
  jwtSecret: process.env.JWT_SECRET || DEFAULT_JWT_SECRET,
  v2ApiBaseUrl: process.env.V2_API_BASE_URL || "",
  v2ApiToken: process.env.V2_API_TOKEN || "",
  supabaseUrl: process.env.SUPABASE_URL || "",
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  enableSupabase: toBoolean(process.env.ENABLE_SUPABASE),
  enableV2Live: toBoolean(process.env.ENABLE_V2_LIVE),
};

export function isProductionEnvironment() {
  return env.nodeEnv === "production";
}

export function getSessionCookieSecureFlag() {
  return isProductionEnvironment();
}

export function getJwtSecret() {
  if (isProductionEnvironment() && env.jwtSecret === DEFAULT_JWT_SECRET) {
    throw new Error("JWT_SECRET must be set in production deployments.");
  }

  return env.jwtSecret;
}
