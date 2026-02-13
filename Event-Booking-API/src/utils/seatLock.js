const { Op } = require('sequelize');
const Booking = require('../models/bookingModel');
const Event = require('../models/eventModel');
const { sequelize } = require('../config/db');

function getSeatLockMinutes() {
  const configured = Number(process.env.BOOKING_LOCK_MINUTES || 10);
  return Number.isFinite(configured) && configured > 0 ? configured : 10;
}

function getSeatLockExpiresAt(bookedAt) {
  if (!bookedAt) return null;
  const base = new Date(bookedAt);
  return new Date(base.getTime() + getSeatLockMinutes() * 60 * 1000);
}

function isSeatLockExpired(booking, now = new Date()) {
  if (!booking || booking.payment_status !== 'pending' || !booking.booked_at) return false;
  const expiresAt = getSeatLockExpiresAt(booking.booked_at);
  return expiresAt ? expiresAt <= now : false;
}

async function releaseExpiredSeatLocks(options = {}) {
  const { transaction, eventId } = options;
  if (transaction) {
    return releaseExpiredSeatLocksInTransaction(transaction, eventId);
  }
  return sequelize.transaction(async (t) => releaseExpiredSeatLocksInTransaction(t, eventId));
}

async function releaseExpiredSeatLocksInTransaction(transaction, eventId) {
  const cutoff = new Date(Date.now() - getSeatLockMinutes() * 60 * 1000);
  const where = {
    payment_status: 'pending',
    booked_at: { [Op.lte]: cutoff },
  };
  if (eventId) where.event_id = eventId;

  const expiredBookings = await Booking.findAll({
    where,
    attributes: ['id', 'event_id', 'seats_booked', 'booked_at'],
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  if (!expiredBookings.length) {
    return { releasedBookings: 0, releasedSeats: 0 };
  }

  const seatsByEvent = new Map();
  for (const booking of expiredBookings) {
    seatsByEvent.set(
      booking.event_id,
      (seatsByEvent.get(booking.event_id) || 0) + Number(booking.seats_booked || 0)
    );
  }

  for (const [expiredEventId, seats] of seatsByEvent.entries()) {
    const evt = await Event.findByPk(expiredEventId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!evt) continue;
    const nextSeats = Number(evt.available_seats || 0) + seats;
    const maxSeats = Number(evt.total_seats || nextSeats);
    evt.available_seats = Math.min(nextSeats, maxSeats);
    await evt.save({ transaction });
  }

  const ids = expiredBookings.map((b) => b.id);
  await Booking.update(
    { payment_status: 'failed' },
    {
      where: { id: { [Op.in]: ids } },
      transaction,
    }
  );

  return {
    releasedBookings: expiredBookings.length,
    releasedSeats: expiredBookings.reduce((sum, b) => sum + Number(b.seats_booked || 0), 0),
  };
}

module.exports = {
  getSeatLockMinutes,
  getSeatLockExpiresAt,
  isSeatLockExpired,
  releaseExpiredSeatLocks,
};
