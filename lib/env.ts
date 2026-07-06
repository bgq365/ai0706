const toBoolean = (value: string | undefined) => value === "true";

export const env = {
  appBaseUrl: process.env.APP_BASE_URL || "http://localhost:3000",
  jwtSecret: process.env.JWT_SECRET || "dev-only-secret-change-me",
  v2ApiBaseUrl: process.env.V2_API_BASE_URL || "",
  v2ApiToken: process.env.V2_API_TOKEN || "",
  supabaseUrl: process.env.SUPABASE_URL || "",
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  enableSupabase: toBoolean(process.env.ENABLE_SUPABASE),
  enableV2Live: toBoolean(process.env.ENABLE_V2_LIVE),
};
