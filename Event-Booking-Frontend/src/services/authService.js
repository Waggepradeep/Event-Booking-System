import api from './api';

export const authService = {
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    if (response.data.token) {
      localStorage.setItem('authToken', response.data.token);
    }
    return response.data;
  },

  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    if (response.data.token) {
      localStorage.setItem('authToken', response.data.token);
    }
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('authToken');
  },

  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

export const eventService = {
  getAllEvents: async (params = {}) => {
    const response = await api.get('/events', { params });
    return response.data;
  },

  getEventById: async (id) => {
    const response = await api.get(`/events/${id}`);
    return response.data;
  },

  createEvent: async (eventData) => {
    const response = await api.post('/events', eventData);
    return response.data;
  },

  updateEvent: async (id, eventData) => {
    const response = await api.put(`/events/${id}`, eventData);
    return response.data;
  },

  deleteEvent: async (id) => {
    const response = await api.delete(`/events/${id}`);
    return response.data;
  },
};

export const bookingService = {
  getMyBookings: async () => {
    const response = await api.get('/bookings');
    return response.data;
  },

  getBookingById: async (id) => {
    const response = await api.get(`/bookings/${id}`);
    return response.data;
  },

  createBooking: async (bookingData) => {
    const response = await api.post('/bookings', bookingData);
    return response.data;
  },

  cancelBooking: async (id) => {
    const response = await api.delete(`/bookings/${id}`);
    return response.data;
  },
};

export const paymentService = {
  processPayment: async (paymentData) => {
    const response = await api.post('/payments/pay', paymentData);
    return response.data;
  },

  createPaymentIntent: async (paymentData) => {
    const response = await api.post('/payments/intent', paymentData);
    return response.data;
  },

  getPaymentStatus: async (bookingId) => {
    const response = await api.get(`/payments/status/${bookingId}`);
    return response.data;
  },

  requestRefund: async (bookingId, reason) => {
    const response = await api.post(`/payments/refund/${bookingId}`, { reason });
    return response.data;
  },
};

export const adminService = {
  getStats: async () => {
    const response = await api.get('/admin/stats');
    return response.data;
  },

  getOccupancy: async () => {
    const response = await api.get('/admin/occupancy');
    return response.data;
  },

  getBookings: async (params = {}) => {
    const response = await api.get('/admin/bookings', { params });
    return response.data;
  },

  resendTicketEmail: async (bookingId) => {
    const response = await api.post(`/admin/bookings/${bookingId}/resend-ticket`);
    return response.data;
  },

  resendRefundEmail: async (bookingId) => {
    const response = await api.post(`/admin/bookings/${bookingId}/resend-refund-email`);
    return response.data;
  },
};
