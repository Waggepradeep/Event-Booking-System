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
