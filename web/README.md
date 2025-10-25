# AI Phone Assistant — Voice Call Automation

Next.js dashboard and API server for handling autonomous phone calls with Twilio voice, OpenAI speech intelligence, and Prisma-backed conversation memory.

## Features

- **Outbound & inbound calls** orchestrated through Twilio Programmable Voice webhooks with automated agent responses.
- **Natural dialogue engine** powered by OpenAI Responses API, including JSON-formatted instructions for call flow control and summary generation.
- **Conversation memory** persisted in Postgres via Prisma models for contacts, logs, summaries, intents, and scheduling.
- **Custom instruction system** for global or contact-specific guidance that shapes agent tone and behaviour.
- **Secure dashboard** with passphrase gate, real-time call monitoring, contact management, and instruction authoring.
- **Automatic call summaries** capturing next steps, follow-up scheduling, and detected intents after every conversation.

## Project Structure

```
web/
├── prisma/             # Prisma schema and generated client
├── src/
│   ├── app/            # Next.js app router (pages + API routes + middleware)
│   ├── components/     # Reusable UI components and dashboard UI
│   ├── hooks/          # SWR data hooks
│   └── server/         # Call orchestration and AI agent logic
└── package.json
```

## Environment Variables

Create a `.env` file (see `.env.example`) with:

- `DATABASE_URL` — Postgres connection string (Neon, Supabase, etc.)
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
- `TWILIO_STATUS_CALLBACK_URL` — HTTPS endpoint for Twilio status webhooks
- `OPENAI_API_KEY` — for OpenAI Responses API
- `CALL_AGENT_MODEL`, `CALL_SUMMARY_MODEL` — optional model overrides
- `CALLBACK_BASE_URL` — public base URL for Twilio to reach your deployment
- `DASHBOARD_ACCESS_KEY` — secret used to unlock the dashboard

## Database

Prisma is configured for PostgreSQL. After updating `.env`, generate artifacts and push the schema:

```bash
npm run db:generate
npm run db:push
```

## Development

```bash
npm install
npm run dev
```

The dashboard runs at `http://localhost:3000` and will prompt for the dashboard access key.

## Production Build

```bash
npm run build
npm run start
```

Before deploying ensure the public callback URL is reachable over HTTPS so Twilio can deliver voice webhooks.

## Running Linting

```bash
npm run lint
```

## Twilio Configuration

1. Point your Twilio voice webhook to `https://<your-app>/api/twilio/voice`.
2. Set the status callback to `https://<your-app>/api/twilio/status` (or configure `TWILIO_STATUS_CALLBACK_URL`).
3. Allow your Twilio number to initiate outbound calls from the configured Caller ID.

## Memory & Call Summaries

Call logs are stored in `CallLog`, summaries in `CallSummary`, and detected intents in `CallIntent`. The dashboard surfaces the latest context when a contact is called again, enabling the agent to reference previous outcomes automatically.

## Deployment

The app is optimized for Vercel. After setting environment variables in your project, deploy with:

```bash
vercel deploy --prod --yes --token $VERCEL_TOKEN --name agentic-a2ba3f62
```

Remember to seed the database and configure Twilio environment variables in the Vercel dashboard before going live.
