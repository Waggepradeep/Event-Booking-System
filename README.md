# Event Booking (Full Stack)

Event Booking is a full-stack web application for event discovery, ticket booking, payment handling, ticket generation, and admin operations.

## Projects
- `Event-Booking-API` - Backend API (Express + MySQL + MongoDB optional)
- `Event-Booking-Frontend` - Frontend UI (React + Vite + Tailwind)

## Core Features
- User auth and protected routes
- Event create/browse/update/delete
- Booking flow with seat-lock timeout
- Payment flow (mock + Stripe-ready intent/webhook path)
- Ticket PDF generation and email delivery
- Cancellation + refund status tracking
- Admin dashboard:
  - occupancy metrics
  - booking filters
  - resend ticket/refund emails

## Quick Start
See `SETUP.md` for complete setup.

```bash
# Backend
cd Event-Booking-API
npm install
npm run dev

# Frontend (new terminal)
cd Event-Booking-Frontend
npm install
npm run dev
```

## Documentation
- Backend details: `Event-Booking-API/README.md`
- Frontend details: `Event-Booking-Frontend/README.md`
- Setup guide: `SETUP.md`

## Security Note
Do not commit `.env` files or real secrets. Use `.env.example` files with placeholders.

## Troubleshooting (Railway DNS / NXDOMAIN)
If your deployed Railway URL shows DNS errors like `DNS_PROBE_FINISHED_NXDOMAIN` (especially for `*.up.railway.app`), your local/ISP DNS may be blocking the domain.

On Windows, switch DNS to Cloudflare and flush cache:

```powershell
netsh interface ip set dns name="Wi-Fi" static 1.1.1.1
netsh interface ip add dns name="Wi-Fi" 1.0.0.1 index=2
ipconfig /flushdns
nslookup pleasing-comfort-production.up.railway.app
```

Expected `nslookup` result should resolve to an IP (not `Query refused` / `Non-existent domain`).
