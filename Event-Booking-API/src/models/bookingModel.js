// src/models/bookingModel.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const User = require('./userModel');
const Event = require('./eventModel');

const Booking = sequelize.define('Booking', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  event_id: { type: DataTypes.INTEGER, allowNull: false },
  seats_booked: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  payment_status: { type: DataTypes.ENUM('pending', 'paid', 'failed'), defaultValue: 'pending' },
  payment_id: { type: DataTypes.STRING(255) }
}, {
  tableName: 'bookings',
  timestamps: true,
  createdAt: 'booked_at',
  updatedAt: false
});

Booking.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Booking.belongsTo(Event, { foreignKey: 'event_id', as: 'event' });

module.exports = Booking;