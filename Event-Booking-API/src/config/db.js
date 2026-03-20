// src/config/db.js
require('dotenv').config();
const { Sequelize } = require('sequelize');
const mongoose = require('mongoose');

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  logging: false,
  pool: { max: 10, min: 0, acquire: 30000, idle: 10000 }
});

sequelize.authenticate()
  .then(() => console.log("✅ PostgreSQL connected successfully"))
  .catch(err => console.error("❌ PostgreSQL connection error:", err));

async function connectMongo() {
  if (!process.env.MONGO_URI) {
    console.warn('MONGO_URI not set; skipping Mongo connection.');
    return;
  }
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    throw err;
  }
}

module.exports = { sequelize, connectMongo };
