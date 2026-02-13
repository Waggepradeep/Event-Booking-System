import { Link } from 'react-router-dom';
import { useAuth } from '../utils/hooks';

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <nav className="bg-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center">
            <span className="text-2xl font-bold text-blue-600">EventBooking</span>
          </Link>

          <div className="flex items-center space-x-6">
            <Link to="/events" className="text-gray-700 hover:text-blue-600">
              Events
            </Link>

            {isAuthenticated ? (
              <>
                {user?.role === 'admin' && (
                  <>
                    <Link to="/admin" className="text-gray-700 hover:text-blue-600 font-semibold">
                      Admin Dashboard
                    </Link>
                    <Link to="/create-event" className="text-gray-700 hover:text-blue-600 font-semibold">
                      + Create Event
                    </Link>
                  </>
                )}
                <Link to="/bookings" className="text-gray-700 hover:text-blue-600">
                  My Bookings
                </Link>
                <Link to="/profile" className="text-gray-700 hover:text-blue-600">
                  Profile
                </Link>
                <span className="text-sm text-gray-600">
                  {user?.email}{' '}
                  {user?.role === 'admin' && (
                    <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">Admin</span>
                  )}
                </span>
                <button
                  onClick={logout}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-gray-700 hover:text-blue-600">
                  Login
                </Link>
                <Link to="/register" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
