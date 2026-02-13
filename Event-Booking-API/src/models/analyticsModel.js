// src/models/analyticsModel.js
const mongoose = require('mongoose');

const AnalyticsSchema = new mongoose.Schema({
  date: { type: String, required: true },
  totalBookings: { type: Number, default: 0 },
  totalRevenue: { type: Number, default: 0.0 }
}, { collection: 'analytics' });

module.exports = mongoose.model('Analytics', AnalyticsSchema);