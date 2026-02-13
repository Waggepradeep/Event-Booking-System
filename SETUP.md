# Event Booking - Setup Guide

This repo contains:
- `Event-Booking-API` (backend)
- `Event-Booking-Frontend` (frontend)

## 1) Prerequisites
- Node.js 18+
- npm
- MySQL 8+
- MongoDB (optional)
- Stripe CLI (optional, only for local Stripe webhook testing)

## 2) Backend Setup
```bash
cd Event-Booking-API
npm install
```

Create `Event-Booking-API/.env` from `.env.example` and configure values.

Minimum required for local run:
```env
PORT=5000
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_mysql_password
MYSQL_DB=event_booking
JWT_SECRET=replace_with_a_strong_secret
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password
BOOKING_LOCK_MINUTES=10
SEAT_LOCK_CLEANUP_MINUTES=1
```

Optional for Stripe real card flow:
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

Start backend:
```bash
npm run dev
```

Backend URLs:
- API: `http://localhost:5000/api`
- Swagger: `http://localhost:5000/api-docs`

## 3) Frontend Setup
```bash
cd Event-Booking-Frontend
npm install
```

Create `Event-Booking-Frontend/.env`:
```env
VITE_API_URL=http://localhost:5000/api
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

If `VITE_STRIPE_PUBLISHABLE_KEY` is omitted, checkout uses demo/mock payment.

Start frontend:
```bash
npm run dev
```

## 4) Stripe Webhook (Optional, Real Card Flow)
After backend is running:
```bash
stripe listen --forward-to localhost:5000/api/payments/webhook
```
Copy the webhook signing secret from Stripe CLI and set `STRIPE_WEBHOOK_SECRET` in backend `.env`.

## 5) Default Admin Account
Created on server start if missing:
- Email: `admin@example.com`
- Password: `admin123`

Change credentials after first login in non-local environments.

## 6) What to Verify Quickly
1. Register/Login works.
2. Create event (admin).
3. Book event and open checkout.
4. Seat lock countdown appears and expires correctly.
5. Payment updates booking status.
6. Admin dashboard shows occupancy, filters, and resend actions.

## 7) Troubleshooting
- Frontend blank screen:
  - restart frontend and hard-refresh browser.
- Email failing:
  - verify Gmail app password and run `node emailtester.js` in API folder.
- MySQL sync issues:
  - keep `DB_SYNC_ALTER=false` unless intentionally migrating.
- Stripe webhook not updating bookings:
  - ensure Stripe CLI forwarding and correct webhook secret.

## 8) Run Both Services
Terminal A:
```bash
cd Event-Booking-API
npm run dev
```

Terminal B:
```bash
cd Event-Booking-Frontend
npm run dev
```
