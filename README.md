# RiffOff

A modern, full-stack ticketing platform for live music events — discovery, checkout, artist applications, gate-scanner integration, and admin moderation.

[![Next.js 16](https://img.shields.io/badge/Next.js-16-000?logo=nextdotjs)](https://nextjs.org)
[![React 19](https://img.shields.io/badge/React-19-149eca?logo=react)](https://react.dev)
[![TypeScript Strict](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript)](https://www.typescriptlang.org)
[![Tailwind CSS 4](https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss)](https://tailwindcss.com)
[![Vitest](https://img.shields.io/badge/Vitest-passing-6e9f18?logo=vitest)](https://vitest.dev)

## Overview

RiffOff connects three audiences around live music:

- **Attendees** — discover events, buy tickets, manage QR-coded tickets
- **Artists** — apply to perform, message organisers, track decisions in real time
- **Organisers** — review applications, manage tier inventory, monitor attendance

The platform pairs with a separate scanner application — see [`riffoff-gate`](../riffoff-gate) — for offline-tolerant check-in at the venue door.

## Features

### Discovery & Ticketing
- Public event listing with genre / date / city filters
- Cinematic event detail pages with cover art, lineup, and lineup ratings
- Multi-tier ticket inventory (early bird, standard, VIP, etc.)
- 4-step checkout with 15-minute reservation timer
- HMAC-signed QR tickets, dynamic refresh (anti-screenshot)

### Payments
- **Stripe** — international cards via Checkout
- **PayPal** — Orders v2 capture flow with sandbox support
- **TNG eWallet** — RSA-SHA256 signed Malaysian wallet
- All payment results processed via signed, idempotent webhooks

### Artist Applications
- Public "Apply to Perform" CTA on every event page (artists only)
- Reversible organiser decisions — Shortlist / Accept / Reject / Reset, can change mind any time
- Real-time status updates via Appwrite Realtime (no manual refresh)
- Internal organiser notes (per-application, organiser-only)
- Quick-reply message templates that pre-fill the conversation
- Application stats — queue position, lead time, acceptance rate, trust score
- Conversation thread between artist and organiser with file attachments (private, authenticated proxy)

### Door Operations (via [`riffoff-gate`](../riffoff-gate))
- QR ticket scanner over PWA
- Bloom-filter offline dedup, IndexedDB queue, replay on reconnect
- Per-gate access via signed QR or PIN
- Realtime check-in feed via Server-Sent Events

### Admin & Moderation
- Trust-score driven moderation queue
- Force-cancel events with refund + notification flow
- Immutable audit log
- User warnings, bans, and appeal handling

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router, React 19, RSC) |
| Language | TypeScript strict |
| UI | shadcn/ui · Radix UI · Tailwind CSS 4 |
| Backend | Self-hosted Appwrite (Auth · DB · Storage · Realtime) on DigitalOcean |
| Data fetching | TanStack Query for client-side polling |
| Payments | Stripe · PayPal · TNG eWallet |
| Validation | Zod (v4) |
| Email | Resend (with PDF attachments via `pdf-lib`) |
| Testing | Vitest · Playwright · @testing-library/react |
| Deployment | Vercel (auto-deploys on push to `main`) |

## Getting Started

### Prerequisites

- Node.js 20+ (LTS recommended)
- npm 10+
- Self-hosted Appwrite instance (or Appwrite Cloud) with the schema applied
- Optional: Stripe / PayPal sandbox accounts for payment flows
- Optional: Resend account for transactional email

### Installation

```bash
# Clone the repo
git clone https://github.com/yashiel/riffoff.git
cd riffoff/src/musicticketing

# Install dependencies
npm install

# Copy the env template and fill in your credentials
cp ../../.env.example .env.local
# Edit .env.local — see the "Environment variables" section below

# Run the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

Required (the app refuses to start without these):

```bash
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://your-appwrite.example.com/v1
NEXT_PUBLIC_APPWRITE_PROJECT=your-project-id
NEXT_APPWRITE_KEY=server-side-admin-key
```

Recommended for full functionality:

```bash
# Payments — at least one provider
STRIPE_SECRET_KEY=sk_test_…
STRIPE_WEBHOOK_SECRET=whsec_…
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_…

PAYPAL_CLIENT_ID=…
PAYPAL_CLIENT_SECRET=…
PAYPAL_API_URL=https://api-m.sandbox.paypal.com   # or live
NEXT_PUBLIC_PAYPAL_CLIENT_ID=…

# Email
RESEND_API_KEY=re_…
FROM_EMAIL=hello@yourdomain.com

# Security secrets — generate with `openssl rand -hex 32`
TICKET_SIGNING_SECRET=…
CSRF_SECRET=…

# Local dev
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

See `../../.env.example` for the full list including TNG, Twilio, and wallet-pass configuration.

## Available Scripts

```bash
npm run dev          # Dev server with hot reload
npm run build        # Production build
npm run start        # Run the production build
npm run lint         # ESLint
npm test             # Vitest unit + integration tests (one-shot)
npm run test:watch   # Vitest in watch mode
npm run test:e2e     # Playwright end-to-end tests
npm run test:e2e:ui  # Playwright UI mode
npm run demo:seed    # Populate the database with realistic demo data
```

## Project Structure

```
src/musicticketing/
├── app/                      # Next.js App Router routes
│   ├── (public)/             # Unauth-accessible pages (events, login, register)
│   ├── api/                  # Route handlers (webhooks, payment, attachments)
│   └── dashboard/            # Authenticated dashboard (attendee, artist, organiser, admin)
├── actions/                  # Server actions (form submissions, mutations)
├── components/
│   ├── features/             # Feature-scoped UI (events, applications, tickets, …)
│   └── ui/                   # Generic shadcn-derived primitives
├── hooks/                    # Custom React hooks (realtime, gate-stream, …)
├── lib/
│   ├── appwrite/             # Appwrite client + types + collection IDs
│   ├── applications/         # Status metadata, transition rules
│   ├── crypto/               # HMAC, Ed25519, fingerprints
│   ├── email/                # Templated transactional emails
│   ├── payments/             # Stripe, PayPal, TNG provider abstractions
│   ├── tickets/              # Issuance, validation, QR signing
│   └── …
├── providers/                # React context providers
├── public/                   # Static assets
├── scripts/                  # Operational scripts (seeds, migrations)
└── types/                    # Shared TypeScript types
```

## Testing

Unit and integration tests live next to the code in `__tests__/` directories. End-to-end tests live in `e2e/`.

```bash
# Run a single test file
npx vitest run lib/applications/__tests__/status-meta.test.ts

# Run with coverage
npx vitest run --coverage

# Headed E2E
npx playwright test --headed
```

Current suite: **880 tests across 56 files**.

## Deployment

The app deploys to Vercel from the `riffoff-app` companion repository, which is a deploy-only mirror containing just the Next.js application files. Vercel auto-deploys on every push to `main`.

Configure these environment variables in your Vercel project (Settings → Environment Variables):

- All `NEXT_PUBLIC_*` and server-side keys listed above
- Set `NODE_ENV=production` for production
- Set `NEXT_PUBLIC_APP_URL` to your production domain

## Companion Apps

- **[`riffoff-gate`](../riffoff-gate)** — offline-tolerant scanner app for venue staff. Installed as a PWA on phones, talks only to this app's API.

## License

Private. © RiffOff.
