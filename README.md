# RiffOff

> Music event ticketing platform — discover events, buy tickets, scan at the door.

---

## Quick Start

```bash
npm install
cp .env.example .env.local    # Fill in your credentials
npm run dev                    # http://localhost:3000
```

---

## Tech Stack

- **Next.js 15** — App Router, React 19, Server Components
- **TypeScript** — strict mode
- **Tailwind CSS 4** + **shadcn/ui**
- **Appwrite** — Auth, Database, Storage
- **Stripe** + **PayPal** + **TNG eWallet** — payments
- **html5-qrcode** — QR camera scanning
- **Vitest** — 189 tests

---

## Features

- Event discovery with genre/date filtering
- Stripe + PayPal + TNG eWallet checkout
- E-tickets with signed QR codes
- Organiser dashboard (events, tiers, applications, attendees)
- Artist tools (profile, apply to events, portfolio)
- QR scanner PWA for door check-in
- Role-based auth (attendee / artist / organiser / admin)
- Dark theme UI inspired by DICE and Shotgun

---

## Environment Variables

Copy `.env.example` and fill in:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_APPWRITE_ENDPOINT` | Appwrite API endpoint |
| `NEXT_PUBLIC_APPWRITE_PROJECT` | Appwrite project ID |
| `NEXT_APPWRITE_KEY` | Server API key |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `PAYPAL_CLIENT_ID` | PayPal client ID |
| `PAYPAL_CLIENT_SECRET` | PayPal client secret |
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | PayPal client ID (JS SDK) |
| `TNG_CLIENT_ID` | TNG Digital client ID |
| `TNG_PRIVATE_KEY` | TNG RSA private key |
| `TICKET_SIGNING_SECRET` | HMAC secret for QR codes |

---

## Routes (28)

```
/                              Homepage
/events                        Event discovery
/events/[id]                   Event detail
/events/[id]/checkout          Buy tickets
/events/[id]/apply             Artist application
/login                         Login
/register                      Register
/dashboard                     Dashboard home
/dashboard/tickets             My tickets
/dashboard/tickets/[id]        Ticket + QR code
/dashboard/events              Organiser events
/dashboard/events/new          Create event
/dashboard/events/[id]         Manage event
/dashboard/events/[id]/tiers   Ticket tiers
/dashboard/events/[id]/applications   Artist applications
/dashboard/events/[id]/attendees      Attendee list
/dashboard/scanner             QR scanner
/dashboard/applications        My applications (artist)
/dashboard/profile             Profile settings
/dashboard/admin               Admin panel
/payment/success               Payment confirmation
/payment/cancel                Payment cancelled
```

---

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

---

## Commands

```bash
npm run dev       # Dev server
npm run build     # Production build
npm run lint      # Lint
npm test          # Run tests (189)
npx tsc --noEmit  # Type check
```
