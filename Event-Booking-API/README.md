# Event Booking API

Backend for the Event Booking project.

## Stack
- Node.js + Express
- MySQL (Sequelize)
- MongoDB (Mongoose) for logs/analytics (optional)
- Nodemailer (email)
- PDFKit (ticket generation)
- Stripe (payment intent + webhook flow)

## Implemented Features
- JWT auth (`register`, `login`, protected routes)
- Event CRUD
- Booking with seat-lock timeout
- Seat lock auto-release worker
- Payment flows:
  - Mock pay (`/api/payments/pay`)
  - Stripe PaymentIntent (`/api/payments/intent`) + webhook confirmation
- Payment transaction persistence (`payment_transactions`)
- Refund tracking (`initiated`, `processing`, `refunded`, `failed`)
- Ticket PDF generation + email delivery
- Cancellation flow with refund initiation for paid bookings
- Admin APIs for occupancy, booking filters, and manual resend actions

## Key API Routes

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Events
- `GET /api/events`
- `GET /api/events/:id`
- `POST /api/events` (admin)
- `PUT /api/events/:id` (admin)
- `DELETE /api/events/:id` (admin)

### Bookings
- `POST /api/bookings`
- `GET /api/bookings`
- `DELETE /api/bookings/:id`

### Payments
- `POST /api/payments/pay` (mock flow)
- `POST /api/payments/intent` (Stripe intent)
- `POST /api/payments/webhook` (Stripe webhook)
- `GET /api/payments/status/:bookingId`
- `POST /api/payments/refund/:bookingId`

### Admin
- `GET /api/admin/stats`
- `GET /api/admin/occupancy`
- `GET /api/admin/bookings`
- `POST /api/admin/bookings/:bookingId/resend-ticket`
- `POST /api/admin/bookings/:bookingId/resend-refund-email`
- `GET /api/admin/logs`

## Environment
Create `Event-Booking-API/.env`:

```env
PORT=5000

MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_mysql_password
MYSQL_DB=event_booking

DB_SYNC_ALTER=false
BOOKING_LOCK_MINUTES=10
SEAT_LOCK_CLEANUP_MINUTES=1

MONGO_URI=mongodb://127.0.0.1:27017/eventlogs

JWT_SECRET=replace_with_a_strong_secret
JWT_EXPIRES_IN=7d

EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password

STRIPE_SECRET_KEY=sk_test_your_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

## Run
```bash
cd Event-Booking-API
npm install
npm run dev
```

API base URL: `http://localhost:5000/api`
Swagger: `http://localhost:5000/api-docs`

## Stripe Local Webhook
```bash
stripe listen --forward-to localhost:5000/api/payments/webhook
```

## Notes
- `sequelize.sync({ alter: true })` is controlled by `DB_SYNC_ALTER`.
- Seat locks expire automatically and release seats.
- Legacy paid bookings may not have transaction rows (`no-tx (legacy)` in admin UI).

## Default Admin
- Email: `admin@example.com`
- Password: `admin123`

Change this immediately outside local development.
