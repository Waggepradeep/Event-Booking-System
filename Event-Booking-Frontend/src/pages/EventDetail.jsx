import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { eventService, bookingService } from '../services/authService';
import { useAuth } from '../utils/hooks';
import Checkout from '../components/Checkout';

export default function EventDetail() {
  const { id } = useParams();
  const { isAuthenticated } = useAuth();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [bookingData, setBookingData] = useState(null);

  const toNumber = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  };

  useEffect(() => {
    fetchEvent();
  }, [id]);

  const fetchEvent = async () => {
    try {
      const data = await eventService.getEventById(id);
      setEvent(data.data || data);
      setError(null);
    } catch (err) {
      setError('Failed to load event');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBooking = async () => {
    if (!isAuthenticated) {
      // Redirect to login
      window.location.href = '/login';
      return;
    }

    setBookingLoading(true);
    try {
      const response = await bookingService.createBooking({
        event_id: parseInt(id),
        seats_booked: quantity,
      });

      // Accept multiple backend shapes and always fall back to event price * quantity
      const amountCandidates = [
        response?.amount,
        response?.data?.amount,
        response?.booking?.amount,
        response?.data?.booking?.amount,
      ];
      const amountFromResponse = amountCandidates
        .map(toNumber)
        .find((v) => v !== null && v > 0);

      const fallbackAmount = (toNumber(event?.price) || 0) * (toNumber(quantity) || 1);
      const finalAmount = amountFromResponse ?? fallbackAmount;

      setBookingData({
        id: response.bookingId || response.data?.bookingId,
        amount: finalAmount,
        message: response.message || response.data?.message,
        lockExpiresAt: response.lockExpiresAt || response.data?.lockExpiresAt || null,
      });
      
      setQuantity(1);
      fetchEvent(); // Refresh to see updated available seats
    } catch (err) {
      alert('Failed to book event: ' + (err.response?.data?.error || err.message));
    } finally {
      setBookingLoading(false);
    }
  };

  const handleCheckoutComplete = () => {
    setBookingData(null);
    alert('✓ Booking completed! Check your email for ticket.');
  };

  const handleCheckoutClose = () => {
    setBookingData(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600 text-center">{error || 'Event not found'}</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {bookingData && (
        <Checkout
          bookingId={bookingData.id}
          eventTitle={event?.title}
          amount={bookingData.amount}
          lockExpiresAt={bookingData.lockExpiresAt}
          onPaymentComplete={handleCheckoutComplete}
          onClose={handleCheckoutClose}
          onRebook={() => setBookingData(null)}
        />
      )}

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="bg-blue-400 h-64 flex items-center justify-center text-white text-7xl">
          📅
        </div>

        <div className="p-8">
          <h1 className="text-4xl font-bold mb-4">{event.title}</h1>

          <div className="grid grid-cols-2 gap-4 mb-6 text-lg">
            <div>
              <p className="text-gray-600">📍 Location</p>
              <p className="font-semibold">{event.location}</p>
            </div>
            <div>
              <p className="text-gray-600">📅 Date</p>
              <p className="font-semibold">
                {new Date(event.date).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-gray-600">💰 Price</p>
              <p className="font-semibold text-blue-600 text-2xl">&#8377;{event.price}</p>
            </div>
            <div>
              <p className="text-gray-600">👥 Available Seats</p>
              <p className="font-semibold">{event.available_seats || 0}</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Description</h2>
            <p className="text-gray-700 text-lg leading-relaxed">
              {event.description}
            </p>
          </div>

          <div className="border-t pt-8">
            <div className="flex items-center gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Quantity</label>
                <input
                  type="number"
                  min="1"
                  max={event.available_seats}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="px-4 py-2 border rounded-lg w-24"
                />
              </div>
              <button
                onClick={handleBooking}
                disabled={bookingLoading}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 ml-4 mt-6"
              >
                {bookingLoading ? 'Booking...' : 'Book Now'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


