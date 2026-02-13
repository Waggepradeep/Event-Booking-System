require('dotenv').config();
const app = require('./app');
const { sequelize, connectMongo } = require('./config/db');
const User = require('./models/userModel');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { releaseExpiredSeatLocks } = require('./utils/seatLock');

const PORT = process.env.PORT || 5000;
const SEAT_LOCK_CLEANUP_MINUTES = Number(process.env.SEAT_LOCK_CLEANUP_MINUTES || 1);

async function seedAdminFromEnv() {
  const shouldSeed = process.env.SEED_DEFAULT_ADMIN === 'true';
  if (!shouldSeed) return;

  const adminEmail = (process.env.ADMIN_EMAIL || '').trim();
  const adminPassword = process.env.ADMIN_PASSWORD || '';
  const adminName = (process.env.ADMIN_NAME || 'Admin').trim();

  if (!adminEmail || !adminPassword) {
    console.warn('SEED_DEFAULT_ADMIN=true but ADMIN_EMAIL/ADMIN_PASSWORD missing. Skipping admin seed.');
    return;
  }

  const [, created] = await User.findOrCreate({
    where: { email: adminEmail },
    defaults: {
      name: adminName,
      password: bcrypt.hashSync(adminPassword, 10),
      role: 'admin',
    },
  });

  if (created) {
    console.log(`Default admin created from env: ${adminEmail}`);
  } else {
    console.log(`Admin already exists for ${adminEmail}`);
  }
}

function startSeatLockCleanupWorker() {
  const intervalMinutes = Number.isFinite(SEAT_LOCK_CLEANUP_MINUTES) && SEAT_LOCK_CLEANUP_MINUTES > 0
    ? SEAT_LOCK_CLEANUP_MINUTES
    : 1;
  const intervalMs = intervalMinutes * 60 * 1000;
  let running = false;

  const runCleanup = async () => {
    if (running) return;
    running = true;
    try {
      const result = await releaseExpiredSeatLocks();
      if (result.releasedBookings > 0) {
        console.log(`Released ${result.releasedBookings} expired booking lock(s) and ${result.releasedSeats} seat(s)`);
      }
    } catch (err) {
      console.error('Seat lock cleanup failed:', err.message || err);
    } finally {
      running = false;
    }
  };

  runCleanup();
  const timer = setInterval(runCleanup, intervalMs);
  timer.unref();
  console.log(`Seat lock cleanup worker started (every ${intervalMinutes} minute(s))`);
}

async function startServer() {
  try {
    await sequelize.authenticate();
    console.log('MySQL connected');

    const shouldAlter = process.env.DB_SYNC_ALTER === 'true';
    await sequelize.sync(shouldAlter ? { alter: true } : {});
    console.log(`MySQL models synced${shouldAlter ? ' (alter mode)' : ''}`);

    let mongoConnected = false;
    try {
      await connectMongo();
      mongoConnected = true;
    } catch (e) {
      console.warn('Mongo connection failed or skipped');
    }

    await seedAdminFromEnv();

    if (mongoConnected) {
      const testSchema = new mongoose.Schema({ message: String }, { collection: 'tests' });
      mongoose.model('Test', testSchema);
    }

    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    startSeatLockCleanupWorker();
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
