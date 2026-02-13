# Event Booking Frontend

Frontend for the Event Booking project.

## Stack
- React 18
- Vite
- React Router v6
- Axios
- Tailwind CSS
- Stripe React SDK (`@stripe/react-stripe-js`, `@stripe/stripe-js`)

## Implemented Features
- Auth flows (login/register/logout)
- Protected routes
- Event list + details
- Booking flow with quantity
- Checkout modal with:
  - seat-lock countdown
  - lock expiry warning + auto-close
  - rebook action
  - Stripe card flow (when key is configured)
  - mock fallback payment flow
- My Bookings with payment/refund status display
- Admin Dashboard with:
  - KPI cards (gross/refund/net)
  - occupancy table
  - booking filters
  - resend ticket/refund email actions

## Environment
Create `Event-Booking-Frontend/.env`:

```env
VITE_API_URL=http://localhost:5000/api
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key
```

If `VITE_STRIPE_PUBLISHABLE_KEY` is missing, checkout runs in demo/mock mode.

## Run
```bash
cd Event-Booking-Frontend
npm install
npm run dev
```

Default local URL is usually `http://localhost:5173`.

## Build
```bash
npm run build
npm run preview
```

## Pages
- `/` Home
- `/events` Events
- `/events/:id` Event detail + booking
- `/bookings` My bookings
- `/profile` User profile
- `/admin` Admin dashboard (admin only)
- `/create-event` Create event (admin only)

## API Service Modules
- `authService`
- `eventService`
- `bookingService`
- `paymentService`
- `adminService`

## Notes
- Currency display uses INR.
- Some older bookings may show `no-tx (legacy)` until backfilled.
