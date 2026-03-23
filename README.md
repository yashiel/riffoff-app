# RiffOff — Music Ticketing Platform

Next.js 15 + Appwrite music event ticketing platform.

## Quick Start

```bash
npm install
cp .env.example .env.local
# Fill in your Appwrite + payment credentials
npm run dev
```

## Environment Variables

See `.env.example` for all required variables. Key services:
- **Appwrite** — Auth, Database, Storage
- **Stripe** — Card payments
- **PayPal** — PayPal checkout
- **TNG Digital** — Malaysian eWallet

## Deploy

### Vercel
```bash
npx vercel
```

### Docker
```bash
docker build -t riffoff .
docker run -p 3000:3000 --env-file .env.local riffoff
```

## Stack
- Next.js 15 (App Router, React 19)
- TypeScript (strict)
- Tailwind CSS 4 + shadcn/ui
- Appwrite Cloud/Self-hosted
- Stripe + PayPal + TNG eWallet
