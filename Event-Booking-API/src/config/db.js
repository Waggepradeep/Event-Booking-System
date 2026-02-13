// src/config/db.js
require('dotenv').config();
const { Sequelize } = require('sequelize');
const mongoose = require('mongoose');

const {
  MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DB, MONGO_URI
} = process.env;

// const mysqlUri = `mysql://${MYSQL_USER}:${MYSQL_PASSWORD}@${MYSQL_HOST}:${MYSQL_PORT}/${MYSQL_DB}`;

const sequelize = new Sequelize(MYSQL_DB, MYSQL_USER, MYSQL_PASSWORD, {
  host: MYSQL_HOST,
  port: MYSQL_PORT,
  dialect: 'mysql',
  logging: false,
  pool: { max: 10, min: 0, acquire: 30000, idle: 10000 }
});

// ✅ Test MySQL connection immediately
sequelize.authenticate()
  .then(() => console.log("✅ MySQL connected successfully"))
  .catch(err => console.error("❌ MySQL connection error:", err));

async function connectMongo() {
  if (!MONGO_URI) {
    console.warn('MONGO_URI not set; skipping Mongo connection.');
    return;
  }
  try {
    await mongoose.connect(MONGO_URI, { });
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    throw err;
  }
}

module.exports = { sequelize, connectMongo };