# AI0706 V3 Exception Waybill Approval

This is a Next.js App Router prototype for the V3 exception-waybill approval flow. It is ready to deploy on Vercel for validation, with a clear boundary between demo-mode behavior and future production integrations.

## Current deployment state

- The app builds successfully with `next build`.
- The automated test suite is currently green.
- Authentication works with demo accounts stored in the in-memory mock store.
- V2 API integration is optional and controlled by environment variables.
- Supabase is not yet wired as the active persistence layer, so the deployed app currently runs in demo mode unless that integration is completed later.

## Vercel deployment

### 1. Import the GitHub repository into Vercel

- Create a new Vercel project from this repository.
- Framework preset: `Next.js`
- Build command: leave default
- Output directory: leave default

### 2. Configure environment variables

Set these in Vercel Project Settings -> Environment Variables:

```bash
JWT_SECRET=replace-with-a-long-random-secret
APP_BASE_URL=https://your-vercel-domain.vercel.app
V2_API_BASE_URL=https://example-v2.test
V2_API_TOKEN=replace-with-v2-token
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ENABLE_SUPABASE=false
ENABLE_V2_LIVE=false
```

### 3. First validation after deploy

- Open `/api/health`
- Confirm the JSON response is `status: "ok"`
- If `deploymentMode` is `mock-store`, the deployment is running in demo mode
- If `jwtConfigured` is `false`, production login will fail until `JWT_SECRET` is configured

## Important production note

When deployed with `ENABLE_SUPABASE=false`, the app uses the in-memory mock store. That means data is not durable and should be treated as demo-only behavior for walkthroughs and interface validation.

## Local verification

```bash
npm run check
npm test
```
