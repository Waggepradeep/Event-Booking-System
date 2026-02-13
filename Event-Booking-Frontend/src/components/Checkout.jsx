import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CardElement, Elements, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { paymentService } from '../services/authService';

const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';
const stripePromise = STRIPE_PUBLISHABLE_KEY ? loadStripe(STRIPE_PUBLISHABLE_KEY) : null;

function getRemainingSeconds(lockExpiresAt) {
  if (!lockExpiresAt) return null;
  const expiresAtMs = new Date(lockExpiresAt).getTime();
  if (Number.isNaN(expiresAtMs)) return null;
  return Math.max(0, Math.ceil((expiresAtMs - Date.now()) / 1000));
}

function formatRemaining(seconds) {
  if (seconds === null) return null;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function CheckoutContent({
  bookingId,
  eventTitle,
  amount,
  lockExpiresAt,
  onPaymentComplete,
  onClose,
  onRebook,
  stripeEnabled,
}) {
  const navigate = useNavigate();
  const stripe = useStripe();
  const elements = useElements();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [remainingSeconds, setRemainingSeconds] = useState(getRemainingSeconds(lockExpiresAt));
  const [autoCloseCountdown, setAutoCloseCountdown] = useState(null);

  const autoCloseTimerRef = useRef(null);
  const autoCloseTickRef = useRef(null);
  const hasExpiredRef = useRef(false);

  const displayAmount = typeof amount === 'number' ? amount : (parseFloat(amount) || 0);
  const lockExpired = remainingSeconds === 0;
  const lockExpiresAtLabel = lockExpiresAt ? new Date(lockExpiresAt).toLocaleString() : null;
  const showOneMinuteWarning = remainingSeconds !== null && remainingSeconds > 0 && remainingSeconds <= 60;

  useEffect(() => {
    setRemainingSeconds(getRemainingSeconds(lockExpiresAt));
    if (!lockExpiresAt) return undefined;

    const timer = setInterval(() => {
      setRemainingSeconds(getRemainingSeconds(lockExpiresAt));
    }, 1000);

    return () => clearInterval(timer);
  }, [lockExpiresAt]);

  useEffect(() => {
    if (lockExpired && !hasExpiredRef.current) {
      hasExpiredRef.current = true;
      setError('Seat lock expired. Please rebook.');
      setAutoCloseCountdown(5);

      autoCloseTickRef.current = setInterval(() => {
        setAutoCloseCountdown((v) => (v === null ? null : Math.max(0, v - 1)));
      }, 1000);

      autoCloseTimerRef.current = setTimeout(() => {
        if (onClose) onClose();
      }, 5000);
    }

    return () => {
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
      if (autoCloseTickRef.current) clearInterval(autoCloseTickRef.current);
    };
  }, [lockExpired, onClose]);

  const handleClose = () => {
    if (onClose) onClose();
  };

  const handleRebook = () => {
    if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
    if (autoCloseTickRef.current) clearInterval(autoCloseTickRef.current);
    if (onClose) onClose();
    if (onRebook) {
      onRebook();
    } else {
      navigate('/events');
    }
  };

  const handleSuccessfulPayment = (message) => {
    setSuccess(true);
    alert(message);
    if (onPaymentComplete) {
      setTimeout(() => onPaymentComplete(), 1000);
    } else {
      setTimeout(() => navigate('/bookings'), 2000);
    }
  };

  const handleMockPayment = async () => {
    const response = await paymentService.processPayment({ bookingId });
    const emailFailed = !!response?.emailError;
    handleSuccessfulPayment(
      emailFailed
        ? 'Payment successful, but ticket email failed. Please contact support or retry with a valid email setup.'
        : 'Payment successful! Ticket sent to your email.'
    );
  };

  const handleStripeCardPayment = async () => {
    if (!stripe || !elements) {
      throw new Error('Payment form is still loading. Please wait a moment and retry.');
    }

    const intent = await paymentService.createPaymentIntent({ bookingId });
    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      throw new Error('Card details are missing.');
    }

    const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(intent.clientSecret, {
      payment_method: {
        card: cardElement,
        billing_details: {
          name: eventTitle || 'Event Booking Customer',
        },
      },
    });

    if (stripeError) {
      throw new Error(stripeError.message || 'Card payment failed');
    }

    if (!paymentIntent || paymentIntent.status !== 'succeeded') {
      throw new Error(`Payment not completed. Current status: ${paymentIntent?.status || 'unknown'}`);
    }

    handleSuccessfulPayment('Payment confirmed. Ticket email will be sent shortly.');
  };

  const handlePayment = async () => {
    if (!bookingId) {
      setError('Invalid booking ID');
      return;
    }
    if (lockExpired) {
      setError('Seat lock expired. Please book again.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (stripeEnabled && paymentMethod === 'card') {
        await handleStripeCardPayment();
      } else {
        await handleMockPayment();
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message;
      setError(errorMessage);
      console.error('Payment error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">OK</div>
          <h2 className="text-2xl font-bold text-green-600 mb-2">Payment Successful!</h2>
          <p className="text-gray-600 mb-6">Your ticket has been sent to your email.</p>
          <button
            onClick={() => {
              if (onPaymentComplete) onPaymentComplete();
            }}
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700"
          >
            Go to My Bookings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Checkout</h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold leading-none"
            title="Close"
          >
            x
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {remainingSeconds !== null && (
          <div className={`mb-6 p-3 rounded-lg border ${lockExpired ? 'bg-red-50 border-red-200 text-red-700' : 'bg-yellow-50 border-yellow-200 text-yellow-800'}`}>
            {lockExpired ? 'Seat lock expired.' : `Seat lock expires in ${formatRemaining(remainingSeconds)}`}
            {lockExpiresAtLabel && <p className="text-sm mt-1">Expires at: {lockExpiresAtLabel}</p>}
            {showOneMinuteWarning && <p className="text-sm mt-1 font-semibold">Hurry up: less than 60 seconds left.</p>}
            {lockExpired && (
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={handleRebook}
                  className="px-3 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700"
                >
                  Rebook
                </button>
                {autoCloseCountdown !== null && <span className="text-sm">Closing in {autoCloseCountdown}s</span>}
              </div>
            )}
          </div>
        )}

        <div className="mb-6 pb-6 border-b">
          <h3 className="font-semibold mb-2">Order Summary</h3>
          <div className="flex justify-between text-gray-600 mb-2">
            <span>{eventTitle || 'Event Ticket'}</span>
            <span>&#8377;{displayAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-lg pt-2">
            <span>Total:</span>
            <span className="text-blue-600">&#8377;{displayAmount.toFixed(2)}</span>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="font-semibold mb-3">Payment Method</h3>
          <div className="space-y-2">
            {['card', 'upi', 'netbanking'].map((method) => (
              <label key={method} className="flex items-center">
                <input
                  type="radio"
                  name="payment"
                  value={method}
                  checked={paymentMethod === method}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="mr-3"
                />
                <span className="capitalize">
                  {method === 'upi' ? 'UPI' : method === 'netbanking' ? 'Net Banking' : 'Credit/Debit Card'}
                </span>
              </label>
            ))}
          </div>
          {stripeEnabled && paymentMethod === 'card' && (
            <div className="mt-4 p-3 border rounded-lg bg-gray-50">
              <CardElement
                options={{
                  style: {
                    base: {
                      fontSize: '16px',
                      color: '#1f2937',
                      '::placeholder': { color: '#9ca3af' },
                    },
                    invalid: { color: '#dc2626' },
                  },
                }}
              />
              <p className="text-xs text-gray-500 mt-2">Use Stripe test card: 4242 4242 4242 4242</p>
            </div>
          )}
        </div>

        <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700">
            <strong>{stripeEnabled ? 'Stripe Mode:' : 'Demo Mode:'}</strong>{' '}
            {stripeEnabled
              ? 'Card payments are processed through Stripe. UPI/Net Banking use demo mode in this build.'
              : 'This is a simulated payment. Configure VITE_STRIPE_PUBLISHABLE_KEY for real card payment.'}
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={handlePayment}
            disabled={loading || lockExpired}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {loading ? 'Processing...' : lockExpired ? 'Lock Expired' : 'Pay Now'}
          </button>
          <button
            onClick={handleClose}
            disabled={loading}
            className="w-full bg-gray-200 text-gray-800 py-3 rounded-lg font-bold hover:bg-gray-300 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-4 text-center">
          Ticket email is sent after payment confirmation.
        </p>
      </div>
    </div>
  );
}

export default function Checkout(props) {
  return (
    <Elements stripe={stripePromise || null}>
      <CheckoutContent {...props} stripeEnabled={!!STRIPE_PUBLISHABLE_KEY && !!stripePromise} />
    </Elements>
  );
}
