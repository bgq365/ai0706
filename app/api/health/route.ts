import { getStoreMode } from "@/lib/data-store";
import { env, isProductionEnvironment } from "@/lib/env";
import { ok } from "@/lib/response";

export async function GET() {
  const deploymentMode = getStoreMode();

  return ok({
    status: "ok",
    environment: {
      nodeEnv: env.nodeEnv,
      vercelEnv: env.vercelEnv || null,
      production: isProductionEnvironment(),
    },
    features: {
      enableSupabase: env.enableSupabase,
      enableV2Live: env.enableV2Live,
      deploymentMode,
    },
    checks: {
      jwtConfigured: env.jwtSecret !== "dev-only-secret-change-me",
      supabaseConfigured: Boolean(env.supabaseUrl && env.supabaseServiceRoleKey),
      v2Configured: Boolean(env.v2ApiBaseUrl && env.v2ApiToken),
    },
    warnings: deploymentMode === "mock-store"
      ? ["Data is currently served from the in-memory mock store and is not durable across server restarts."]
      : [],
  });
}
