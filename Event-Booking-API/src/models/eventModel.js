// src/models/eventModel.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const User = require('./userModel');

const Event = sequelize.define('Event', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title: { type: DataTypes.STRING(200), allowNull: false },
  description: { type: DataTypes.TEXT },
  location: { type: DataTypes.STRING(200), allowNull: false },
  date: { type: DataTypes.DATE, allowNull: false },
  price: { type: DataTypes.DECIMAL(10,2), allowNull: false, defaultValue: 0.0 },
  total_seats: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  available_seats: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  created_by: { type: DataTypes.INTEGER, allowNull: false }
}, {
  tableName: 'events',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

Event.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

module.exports = Event;