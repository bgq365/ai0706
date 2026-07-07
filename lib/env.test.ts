import { env, getJwtSecret, getSessionCookieSecureFlag, isProductionEnvironment } from "@/lib/env";

describe("env helpers", () => {
  const original = {
    nodeEnv: env.nodeEnv,
    jwtSecret: env.jwtSecret,
  };

  afterEach(() => {
    env.nodeEnv = original.nodeEnv;
    env.jwtSecret = original.jwtSecret;
  });

  it("detects non-production mode by default", () => {
    env.nodeEnv = "development";

    expect(isProductionEnvironment()).toBe(false);
    expect(getSessionCookieSecureFlag()).toBe(false);
    expect(getJwtSecret()).toBe(env.jwtSecret);
  });

  it("requires a configured JWT secret in production", () => {
    env.nodeEnv = "production";
    env.jwtSecret = "dev-only-secret-change-me";

    expect(isProductionEnvironment()).toBe(true);
    expect(getSessionCookieSecureFlag()).toBe(true);
    expect(() => getJwtSecret()).toThrow("JWT_SECRET must be set in production deployments.");
  });

  it("accepts a real JWT secret in production", () => {
    env.nodeEnv = "production";
    env.jwtSecret = "super-secret-for-prod";

    expect(getJwtSecret()).toBe("super-secret-for-prod");
  });
});
