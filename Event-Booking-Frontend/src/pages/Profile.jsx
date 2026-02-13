import { useAuth } from '../utils/hooks';

export default function Profile() {
  const { user } = useAuth();

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-4xl font-bold mb-8">My Profile</h1>

        <div className="space-y-6">
          <div>
            <label className="block text-sm text-gray-600 mb-2">Email</label>
            <p className="text-xl font-semibold">{user?.email}</p>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-2">Name</label>
            <p className="text-xl font-semibold">{user?.name || 'N/A'}</p>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-2">Account Role</label>
            <p className={`inline-block px-4 py-2 rounded-lg font-semibold ${
              user?.role === 'admin' 
                ? 'bg-purple-100 text-purple-800' 
                : 'bg-blue-100 text-blue-800'
            }`}>
              {user?.role === 'admin' ? '👑 Admin' : '👤 User'}
            </p>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-2">Member Since</label>
            <p className="text-xl font-semibold">
              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
            </p>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-2">Account Status</label>
            <p className="px-4 py-2 bg-green-100 text-green-800 rounded-lg font-semibold inline-block">
              ✓ Active
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
