import { useState, useEffect } from 'react';
import { eventService } from '../services/authService';
import { Link } from 'react-router-dom';

export default function Home() {
  const [featuredEvents, setFeaturedEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchFeaturedEvents();
  }, []);

  const fetchFeaturedEvents = async () => {
    try {
      const data = await eventService.getAllEvents({ limit: 6 });
      setFeaturedEvents(data.data || []);
      setError(null);
    } catch (err) {
      setError('Failed to load events');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold mb-6">Welcome to EventBooking</h1>
          <p className="text-xl mb-8">Discover and book amazing events near you</p>
          <Link
            to="/events"
            className="inline-block px-8 py-3 bg-white text-blue-600 font-bold rounded-lg hover:bg-gray-100"
          >
            Explore Events
          </Link>
        </div>
      </section>

      {/* Featured Events */}
      <section className="py-16 max-w-7xl mx-auto px-4">
        <h2 className="text-4xl font-bold mb-12">Featured Events</h2>

        {loading ? (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="text-red-600 text-center">{error}</div>
        ) : featuredEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredEvents.map((event) => (
              <Link
                key={event.id}
                to={`/events/${event.id}`}
                className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition"
              >
                <div className="bg-blue-400 h-48 flex items-center justify-center text-white text-4xl">
                  📅
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-2">{event.title}</h3>
                  <p className="text-gray-600 mb-4">{event.description?.substring(0, 100)}...</p>
                  <div className="text-sm text-gray-500">
                    <p>📍 {event.location}</p>
                    <p>📅 {new Date(event.date).toLocaleDateString()}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-600">No events available</p>
        )}
      </section>
    </div>
  );
}
