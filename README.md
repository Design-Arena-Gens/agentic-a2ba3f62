# AI Phone Assistant — Voice Call Automation Agent

This repository contains a full-stack Next.js application (`web/`) that powers an autonomous phone assistant capable of making and receiving calls, handling natural conversations, and summarizing outcomes.

Key capabilities include:

- Twilio Programmable Voice integration with webhooks for outbound and inbound calls
- AI dialogue orchestration via OpenAI Responses API with JSON-governed replies
- Prisma/PostgreSQL persistence for contacts, call logs, summaries, intents, and schedules
- Secure admin dashboard to launch calls, manage contacts, and configure instructions
- Automatic call summaries and memory recall for recurring contacts

For full setup instructions, environment variables, and deployment details, see [`web/README.md`](web/README.md).

## Quick Start

```bash
cd web
npm install
npm run dev
```

Ensure you configure the required environment variables (see `.env.example`) and apply the Prisma schema before running in production.
