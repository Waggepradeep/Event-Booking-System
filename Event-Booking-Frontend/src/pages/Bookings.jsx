import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { bookingService } from '../services/authService';
import Checkout from '../components/Checkout';

function getRemainingSeconds(lockExpiresAt) {
  if (!lockExpiresAt) return null;
  const expiresAtMs = new Date(lockExpiresAt).getTime();
  if (Number.isNaN(expiresAtMs)) return null;
  return Math.max(0, Math.ceil((expiresAtMs - Date.now()) / 1000));
}

function formatRemaining(seconds) {
  if (seconds === null) return 'N/A';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export default function Bookings() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [, setTicker] = useState(0);

  useEffect(() => {
    fetchBookings();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setTicker((v) => v + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const refresh = setInterval(() => {
      fetchBookings();
    }, 30000);
    return () => clearInterval(refresh);
  }, []);

  const fetchBookings = async () => {
    try {
      const data = await bookingService.getMyBookings();
      const bookingsList = Array.isArray(data) ? data : (data.data || []);
      setBookings(bookingsList);
      setError(null);
    } catch (err) {
      setError('Failed to load bookings');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentComplete = () => {
    setSelectedBooking(null);
    fetchBookings();
  };

  const handleCancel = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) {
      return;
    }

    try {
      await bookingService.cancelBooking(bookingId);
      setBookings(bookings.filter((b) => b.id !== bookingId));
      alert('Booking cancelled successfully');
    } catch (err) {
      alert('Failed to cancel booking: ' + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-8">My Bookings</h1>

      {selectedBooking && (
        <Checkout
          bookingId={selectedBooking.id}
          eventTitle={selectedBooking.event?.title}
          amount={parseFloat(selectedBooking.event?.price || 0) * selectedBooking.seats_booked}
          lockExpiresAt={selectedBooking.lock_expires_at}
          onPaymentComplete={handlePaymentComplete}
          onClose={() => setSelectedBooking(null)}
          onRebook={() => {
            const targetEventId = selectedBooking?.event?.id;
            setSelectedBooking(null);
            if (targetEventId) {
              navigate(`/events/${targetEventId}`);
            } else {
              navigate('/events');
            }
          }}
        />
      )}

      {loading ? (
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : bookings.length > 0 ? (
        <div className="space-y-4">
          {bookings.map((booking) => {
            const remainingSeconds = getRemainingSeconds(booking.lock_expires_at);
            const lockExpired = booking.payment_status === 'pending' && (booking.lock_expired || remainingSeconds === 0);

            return (
              <div
                key={booking.id}
                className="bg-white rounded-lg shadow-lg p-6 flex justify-between items-center"
              >
                <div className="flex-1">
                  <h3 className="text-2xl font-bold mb-2">{booking.event?.title || 'Event'}</h3>
                  <p className="text-gray-600">Location: {booking.event?.location || 'N/A'}</p>
                  <p className="text-gray-600">Date: {booking.event?.date ? new Date(booking.event.date).toLocaleDateString() : 'N/A'}</p>
                  <p className="text-gray-600">Tickets: {booking.seats_booked}</p>
                  <p className="text-gray-600">
                    Total: &#8377;{(parseFloat(booking.event?.price || 0) * booking.seats_booked).toFixed(2)}
                  </p>
                  <p className="text-gray-600">
                    Booked: {booking.booked_at ? new Date(booking.booked_at).toLocaleDateString() : 'N/A'}
                  </p>
                  {booking.payment?.status && (
                    <p className="text-gray-600 text-sm mt-1">
                      Transaction: {booking.payment.status} ({booking.payment.provider || 'unknown'})
                    </p>
                  )}
                  {booking.payment?.refund_status && booking.payment.refund_status !== 'none' && (
                    <p className="text-gray-600 text-sm">
                      Refund: {booking.payment.refund_status}
                    </p>
                  )}
                  {booking.payment?.failure_reason && (
                    <p className="text-red-600 text-sm">
                      Reason: {booking.payment.failure_reason}
                    </p>
                  )}
                  {booking.payment_status === 'pending' && remainingSeconds !== null && (
                    <p className={`text-sm mt-1 ${lockExpired ? 'text-red-600' : 'text-yellow-700'}`}>
                      {lockExpired ? 'Seat lock expired' : `Seat lock expires in ${formatRemaining(remainingSeconds)}`}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2 items-end">
                  <span
                    className={`px-4 py-2 rounded-lg text-center font-semibold whitespace-nowrap ${
                      booking.payment_status === 'paid'
                        ? 'bg-green-100 text-green-800'
                        : booking.payment_status === 'pending' && !lockExpired
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {booking.payment_status === 'paid' && 'PAID'}
                    {booking.payment_status === 'pending' && !lockExpired && 'PENDING PAYMENT'}
                    {((booking.payment_status === 'pending' && lockExpired) || booking.payment_status === 'failed') && 'FAILED'}
                  </span>

                  {booking.payment_status === 'pending' && !lockExpired && (
                    <button
                      onClick={() => setSelectedBooking(booking)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold text-sm"
                    >
                      Pay Now
                    </button>
                  )}

                  <button
                    onClick={() => handleCancel(booking.id)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-center text-gray-600 text-lg">No bookings yet</p>
      )}
    </div>
  );
}

