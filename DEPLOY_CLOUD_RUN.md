# Deploy TASKA Backend to Google Cloud Run

This guide prepares the backend for Google Cloud Run with Docker. Do not commit real `.env` files or secrets.

## Local Docker Build

Run from `Capstone_Backend`:

```bash
docker build -t taska-backend .
```

## Local Container Run

Create a local env file from `.env.example`, fill it with local or test values, then run:

```bash
docker run --rm -p 8080:8080 --env-file .env taska-backend
```

Health check:

```bash
curl http://localhost:8080/api/health
```

Expected response:

```json
{ "EC": 0, "EM": "TASKA backend is running" }
```

## Cloud Run Deploy

Run from `Capstone_Backend` when you are ready to deploy:

```bash
gcloud run deploy taska-backend \
  --source . \
  --region asia-southeast1 \
  --allow-unauthenticated
```

This is a real deploy command. Run it yourself only after Cloud Run environment variables and secrets are ready.

## Required Environment Variables

Set these on Cloud Run. Prefer Secret Manager for passwords, API keys, and tokens.

```text
NODE_ENV=production
PORT=8080
HOST=0.0.0.0
MONGODB_URI=<your_mongodb_uri>
CLIENT_URL=https://taska.id.vn
SERVER_URL=https://api.taska.id.vn
JWT_SECRET=<your_jwt_secret>
JWT_REFRESH_SECRET=<your_jwt_refresh_secret>
JWT_EXPIRES_IN=1d
MAIL_HOST=<your_smtp_host>
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=noreply@taska.id.vn
MAIL_PASS=<your_mail_password>
MAIL_FROM=TASKA <noreply@taska.id.vn>
MAIL_REPLY_TO=admin@taska.id.vn
```

Optional variables:

```text
CORS_ALLOWED_ORIGINS=
GOOGLE_CLIENT_ID=<your_google_client_id>
GOOGLE_CLIENT_SECRET=<your_google_client_secret>
GITHUB_CLIENT_ID=<your_github_client_id>
GITHUB_CLIENT_SECRET=<your_github_client_secret>
CLOUDINARY_CLOUD_NAME=<your_cloudinary_cloud_name>
CLOUDINARY_API_KEY=<your_cloudinary_api_key>
CLOUDINARY_API_SECRET=<your_cloudinary_api_secret>
GEMINI_API_KEY=<your_gemini_api_key>
GROQ_API_KEY=<your_groq_api_key>
SYSTEM_HEALTH_REQUEST_TARGET=50
SYSTEM_HEALTH_WEBSOCKET_TARGET=100
SYSTEM_HEALTH_DATABASE_TARGET=50
SYSTEM_HEALTH_FRONTEND_TARGET=100
```

For SMTP:

- Use `MAIL_SECURE=false` with port `587`.
- Use `MAIL_SECURE=true` with port `465`.
- `MAIL_REPLY_TO` is only used when the recipient clicks Reply. The actual recipient is still the mail `to` field in code.

## Test After Deploy

Cloud Run first gives you a temporary `.run.app` URL. Test:

```bash
curl https://<cloud-run-url>/api/health
```

After mapping the custom domain, the desired API domain is:

```text
https://api.taska.id.vn
```

Then test:

```bash
curl https://api.taska.id.vn/api/health
```

## Notes

- Do not upload `.env` into Docker images.
- Do not commit `.env`, `.env.production`, MongoDB URIs, SMTP passwords, JWT secrets, OAuth secrets, or API keys.
- Cloud Run provides `PORT`; this app reads `process.env.PORT || 8080`.
- The backend binds to `HOST || 0.0.0.0`, which is required for container platforms.
- CORS allows `CLIENT_URL` in production. Add comma-separated extra origins to `CORS_ALLOWED_ORIGINS` only when needed.
