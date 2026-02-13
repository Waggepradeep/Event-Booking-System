// src/models/logModel.js
const mongoose = require('mongoose');

const LogSchema = new mongoose.Schema({
  action: { type: String, required: true },
  userId: { type: Number },
  details: { type: String },
  timestamp: { type: Date, default: Date.now }
}, {
  collection: 'logs'
});

module.exports = mongoose.model('Log', LogSchema);
