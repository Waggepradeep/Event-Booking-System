const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const PaymentTransaction = sequelize.define('PaymentTransaction', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  booking_id: { type: DataTypes.INTEGER, allowNull: false },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  event_id: { type: DataTypes.INTEGER, allowNull: false },
  provider: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'mock' },
  provider_payment_id: { type: DataTypes.STRING(255), allowNull: true },
  provider_refund_id: { type: DataTypes.STRING(255), allowNull: true },
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  currency: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'USD' },
  status: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'created' },
  refund_status: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'none' },
  failure_reason: { type: DataTypes.TEXT, allowNull: true },
  raw_payload: { type: DataTypes.JSON, allowNull: true }
}, {
  tableName: 'payment_transactions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = PaymentTransaction;
