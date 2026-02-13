import { useEffect, useMemo, useState } from 'react';
import { adminService } from '../services/authService';

function formatCurrency(amount) {
  const value = Number(amount || 0);
  return `\u20B9${value.toFixed(2)}`;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [occupancy, setOccupancy] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const [filters, setFilters] = useState({
    status: '',
    date: '',
    event: '',
    user: '',
  });

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const [statsData, occupancyData, bookingsData] = await Promise.all([
        adminService.getStats(),
        adminService.getOccupancy(),
        adminService.getBookings(filters),
      ]);
      setStats(statsData);
      setOccupancy(Array.isArray(occupancyData) ? occupancyData : []);
      setBookings(Array.isArray(bookingsData) ? bookingsData : []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load admin dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const occupancySummary = useMemo(() => {
    if (!occupancy.length) return { totalBooked: 0, totalSeats: 0, avgOccupancy: 0 };
    const totalBooked = occupancy.reduce((sum, evt) => sum + Number(evt.bookedSeats || 0), 0);
    const totalSeats = occupancy.reduce((sum, evt) => sum + Number(evt.totalSeats || 0), 0);
    const avgOccupancy = totalSeats > 0 ? ((totalBooked / totalSeats) * 100).toFixed(2) : 0;
    return { totalBooked, totalSeats, avgOccupancy };
  }, [occupancy]);

  const applyFilters = async (e) => {
    e.preventDefault();
    await loadDashboard();
  };

  const clearFilters = async () => {
    setFilters({ status: '', date: '', event: '', user: '' });
    try {
      setLoading(true);
      const bookingsData = await adminService.getBookings({});
      setBookings(Array.isArray(bookingsData) ? bookingsData : []);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to clear filters');
    } finally {
      setLoading(false);
    }
  };

  const handleResendTicket = async (bookingId) => {
    try {
      setActionLoadingId(`ticket-${bookingId}`);
      const result = await adminService.resendTicketEmail(bookingId);
      alert(result.message || 'Ticket email resent');
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Failed to resend ticket email');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleResendRefund = async (bookingId) => {
    try {
      setActionLoadingId(`refund-${bookingId}`);
      const result = await adminService.resendRefundEmail(bookingId);
      alert(result.message || 'Refund email resent');
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Failed to resend refund email');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 space-y-8">
      <h1 className="text-4xl font-bold">Admin Dashboard</h1>

      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded-lg">{error}</div>
      )}

      {loading && (
        <div className="text-gray-600">Loading admin data...</div>
      )}

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-gray-500 text-sm">Total Events</p>
            <p className="text-3xl font-bold mt-2">{stats.total_events}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-gray-500 text-sm">Total Booking Records</p>
            <p className="text-3xl font-bold mt-2">{stats.total_bookings}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-gray-500 text-sm">Paid Bookings</p>
            <p className="text-3xl font-bold mt-2">{stats.paid_booking_count}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-gray-500 text-sm">Total Seats Sold</p>
            <p className="text-3xl font-bold mt-2">{stats.total_seats_sold}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-gray-500 text-sm">Gross Revenue</p>
            <p className="text-3xl font-bold mt-2">{formatCurrency(stats.gross_revenue)}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-gray-500 text-sm">Refunded Amount</p>
            <p className="text-3xl font-bold mt-2">{formatCurrency(stats.refunded_amount)}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-5">
            <p className="text-gray-500 text-sm">Net Revenue</p>
            <p className="text-3xl font-bold mt-2">{formatCurrency(stats.net_revenue)}</p>
          </div>
        </div>
      )}

      <section className="bg-white rounded-lg shadow p-6 space-y-4">
        <h2 className="text-2xl font-bold">Event Occupancy</h2>
        <p className="text-sm text-gray-600">
          Booked Seats: {occupancySummary.totalBooked} / {occupancySummary.totalSeats} ({occupancySummary.avgOccupancy}% full)
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-4">Event</th>
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Booked</th>
                <th className="py-2 pr-4">Available</th>
                <th className="py-2 pr-4">% Full</th>
              </tr>
            </thead>
            <tbody>
              {occupancy.map((evt) => (
                <tr key={evt.id} className="border-b last:border-b-0">
                  <td className="py-2 pr-4">{evt.title}</td>
                  <td className="py-2 pr-4">{new Date(evt.date).toLocaleString()}</td>
                  <td className="py-2 pr-4">{evt.bookedSeats}</td>
                  <td className="py-2 pr-4">{evt.availableSeats}</td>
                  <td className="py-2 pr-4">{evt.occupancyPercent}%</td>
                </tr>
              ))}
              {!occupancy.length && (
                <tr>
                  <td className="py-3 text-gray-500" colSpan="5">No events found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white rounded-lg shadow p-6 space-y-4">
        <h2 className="text-2xl font-bold">Booking Filters</h2>
        <form onSubmit={applyFilters} className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <select
            className="px-3 py-2 border rounded-lg"
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="failed">Failed</option>
          </select>
          <input
            type="date"
            className="px-3 py-2 border rounded-lg"
            value={filters.date}
            onChange={(e) => setFilters((f) => ({ ...f, date: e.target.value }))}
          />
          <input
            type="text"
            placeholder="Event ID or title"
            className="px-3 py-2 border rounded-lg"
            value={filters.event}
            onChange={(e) => setFilters((f) => ({ ...f, event: e.target.value }))}
          />
          <input
            type="text"
            placeholder="User ID, name or email"
            className="px-3 py-2 border rounded-lg"
            value={filters.user}
            onChange={(e) => setFilters((f) => ({ ...f, user: e.target.value }))}
          />
          <div className="flex gap-2">
            <button type="submit" className="flex-1 bg-blue-600 text-white rounded-lg px-3 py-2 font-semibold hover:bg-blue-700">
              Apply
            </button>
            <button type="button" onClick={clearFilters} className="flex-1 bg-gray-200 text-gray-800 rounded-lg px-3 py-2 font-semibold hover:bg-gray-300">
              Clear
            </button>
          </div>
        </form>
      </section>

      <section className="bg-white rounded-lg shadow p-6 space-y-4">
        <h2 className="text-2xl font-bold">Bookings</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-3">Booking</th>
                <th className="py-2 pr-3">User</th>
                <th className="py-2 pr-3">Event</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Amount</th>
                <th className="py-2 pr-3">Refund</th>
                <th className="py-2 pr-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id} className="border-b last:border-b-0 align-top">
                  <td className="py-2 pr-3">
                    #{b.id}<br />
                    <span className="text-gray-500">{new Date(b.booked_at).toLocaleString()}</span>
                  </td>
                  <td className="py-2 pr-3">
                    {b.user?.name || 'N/A'}<br />
                    <span className="text-gray-500">{b.user?.email || 'N/A'}</span>
                  </td>
                  <td className="py-2 pr-3">
                    {b.event?.title || 'N/A'}<br />
                    <span className="text-gray-500">{b.event?.location || 'N/A'}</span>
                  </td>
                  <td className="py-2 pr-3">
                    {b.payment_status}<br />
                    <span className="text-gray-500">{b.payment?.status || 'no-tx (legacy)'}</span>
                  </td>
                  <td className="py-2 pr-3">{formatCurrency(b.amount)}</td>
                  <td className="py-2 pr-3">{b.payment?.refund_status || 'none'}</td>
                  <td className="py-2 pr-3">
                    <div className="flex flex-col gap-2">
                      {(() => {
                        const canResendTicket = b.payment_status === 'paid';
                        const canResendRefund = !!(b.payment?.refund_status && b.payment.refund_status !== 'none');
                        return (
                          <>
                      <button
                        onClick={() => handleResendTicket(b.id)}
                        disabled={!canResendTicket || actionLoadingId === `ticket-${b.id}`}
                        className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        {actionLoadingId === `ticket-${b.id}` ? 'Sending...' : 'Resend Ticket'}
                      </button>
                      <button
                        onClick={() => handleResendRefund(b.id)}
                        disabled={!canResendRefund || actionLoadingId === `refund-${b.id}`}
                        className="bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {actionLoadingId === `refund-${b.id}` ? 'Sending...' : 'Resend Refund Email'}
                      </button>
                          </>
                        );
                      })()}
                    </div>
                  </td>
                </tr>
              ))}
              {!bookings.length && (
                <tr>
                  <td className="py-3 text-gray-500" colSpan="7">No bookings match current filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
