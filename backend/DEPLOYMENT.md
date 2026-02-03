# Backend Deployment Guide

This guide explains how to deploy the Fluxo de Caixa Pessoal backend to Cloudflare Workers.

## Prerequisites

- Cloudflare account
- Wrangler CLI installed (`npm install -g wrangler`)
- Logged in to Wrangler (`wrangler login`)

## Configuration

The [`wrangler.toml`](wrangler.toml) is already configured with:
- Worker name: `fluxo-de-caixa-backend`
- Firebase Project ID: `fluxo-de-caixa-pessoal-d6d3f`
- Compatibility date: `2025-01-01`
- CORS headers configured for all routes

## Required Secrets

Before deploying, you need to set up the following secrets using `wrangler secret put`:

### 1. Firebase API Key

```bash
wrangler secret put FIREBASE_API_KEY
```

When prompted, enter your Firebase Web API Key (found in Firebase Console → Project Settings → General → Web API Key).

### 2. OpenAI API Key

```bash
wrangler secret put OPENAI_API_KEY
```

When prompted, enter your OpenAI API key (found at https://platform.openai.com/api-keys).

## Deployment

### Deploy to Production

```bash
npm run deploy
```

Or directly with wrangler:

```bash
wrangler deploy
```

### Deploy to Staging (optional)

```bash
wrangler deploy --env staging
```

## Verify Deployment

After deployment, your worker will be available at:

```
https://fluxo-de-caixa-backend.<your-subdomain>.workers.dev
```

You can test the API by making a request to:

```bash
curl https://fluxo-de-caixa-backend.<your-subdomain>.workers.dev/health
```

## Environment Variables

The following environment variables are configured:

| Variable | Type | Description |
|----------|------|-------------|
| `FIREBASE_PROJECT_ID` | Plain text | Firebase project identifier |
| `FIREBASE_API_KEY` | Secret | Firebase Web API key |
| `OPENAI_API_KEY` | Secret | OpenAI API key for voice processing |

## Troubleshooting

### CORS Errors

The CORS headers are configured in [`wrangler.toml`](wrangler.toml:15). If you encounter CORS issues:

1. Verify the headers are correctly set
2. Check that your frontend URL is allowed (currently set to `*` for development)

### Secret Not Found

If you get a "secret not found" error:

1. Verify secrets are set: `wrangler secret list`
2. Re-set the secret if needed: `wrangler secret put <SECRET_NAME>`

### Deployment Fails

1. Check wrangler is logged in: `wrangler whoami`
2. Verify your Cloudflare account has Workers enabled
3. Check the compatibility date is valid

## Local Development

To run the backend locally:

```bash
npm run dev
```

This will start a local development server with hot reloading.

## Updating Secrets

To update a secret:

```bash
wrangler secret put <SECRET_NAME>
```

To delete a secret:

```bash
wrangler secret delete <SECRET_NAME>
```

## Additional Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)
- [Hono Framework Documentation](https://hono.dev/)
