// src/controllers/bookingController.js
const Event = require('../models/eventModel');
const Booking = require('../models/bookingModel');
const PaymentTransaction = require('../models/paymentTransactionModel');
const Log = require('../models/logModel');
const Analytics = require('../models/analyticsModel');
const { sequelize } = require('../config/db');
const sendEmail = require('../utils/emailSender');
const { initiateRefundForBooking } = require('./paymentController');
const {
  getSeatLockExpiresAt,
  isSeatLockExpired,
  releaseExpiredSeatLocks,
} = require('../utils/seatLock');

const createBooking = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const user_id = req.user.id;
    const { event_id, seats_booked } = req.body || {};
    const eventId = Number(event_id);
    const seatsRequested = Number(seats_booked);
    if (!eventId || !seatsRequested || seatsRequested <= 0 || !Number.isInteger(seatsRequested)) {
      await t.rollback();
      return res.status(400).json({ error: 'Invalid payload' });
    }

    await releaseExpiredSeatLocks({ transaction: t, eventId });

    const evt = await Event.findByPk(eventId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!evt) { await t.rollback(); return res.status(404).json({ error: 'Event not found' }); }
    if (evt.available_seats < seatsRequested) { await t.rollback(); return res.status(400).json({ error: 'Not enough seats available' }); }

    const existingPendingBooking = await Booking.findOne({
      where: { user_id, event_id: eventId, payment_status: 'pending' },
      order: [['booked_at', 'DESC']],
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (existingPendingBooking && !isSeatLockExpired(existingPendingBooking)) {
      const amount = parseFloat(evt.price) * Number(existingPendingBooking.seats_booked || 1);
      const lockExpiresAt = getSeatLockExpiresAt(existingPendingBooking.booked_at);
      await t.commit();
      return res.status(200).json({
        message: 'You already have a pending booking lock for this event. Complete payment before it expires.',
        bookingId: existingPendingBooking.id,
        amount,
        currency: 'INR',
        lockExpiresAt: lockExpiresAt ? lockExpiresAt.toISOString() : null,
      });
    }

    evt.available_seats = evt.available_seats - seatsRequested;
    await evt.save({ transaction: t });

    const booking = await Booking.create(
      { user_id, event_id: eventId, seats_booked: seatsRequested, payment_status: 'pending' },
      { transaction: t }
    );

    // Mongo log (if Mongo connected)
    try { await Log.create({ action: 'BOOK_EVENT', userId: user_id, details: `User booked ${seats_booked} seats for event ${event_id}` }); } catch (e) {}

    // update analytics
    try {
      const dateKey = (new Date()).toISOString().slice(0,10);
      await Analytics.findOneAndUpdate(
        { date: dateKey },
        { $inc: { totalBookings: seatsRequested, totalRevenue: (parseFloat(evt.price) * seatsRequested) } },
        { upsert: true, new: true }
      );
    } catch (e) {}

    await t.commit();

    res.json({
      message: 'Booking created. Complete payment before seat lock expires.',
      bookingId: booking.id,
      amount: parseFloat(evt.price) * seatsRequested,
      currency: 'INR',
      lockExpiresAt: getSeatLockExpiresAt(booking.booked_at)?.toISOString() || null,
    });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ error: err.message });
  }
};

const listUserBookings = async (req, res) => {
  try {
    const user_id = req.user.id;
    await releaseExpiredSeatLocks();
    const bookings = await Booking.findAll({
      where: { user_id },
      include: [{ association: 'event', attributes: ['id','title','location','date','price'] }],
      attributes: ['id','seats_booked','payment_status','booked_at']
    });

    const bookingIds = bookings.map((b) => b.id);
    const txRows = bookingIds.length
      ? await PaymentTransaction.findAll({
          where: { booking_id: bookingIds },
          attributes: ['booking_id', 'provider', 'status', 'refund_status', 'failure_reason', 'updated_at'],
          order: [['updated_at', 'DESC']],
        })
      : [];

    const latestTxByBookingId = new Map();
    for (const tx of txRows) {
      if (!latestTxByBookingId.has(tx.booking_id)) {
        latestTxByBookingId.set(tx.booking_id, tx);
      }
    }

    const now = new Date();
    const bookingPayload = bookings.map((booking) => {
      const row = booking.toJSON();
      if (row.payment_status === 'pending') {
        const lockExpiresAt = getSeatLockExpiresAt(row.booked_at);
        row.lock_expires_at = lockExpiresAt ? lockExpiresAt.toISOString() : null;
        row.lock_expired = lockExpiresAt ? lockExpiresAt <= now : false;
      }
      const latestTx = latestTxByBookingId.get(row.id);
      if (latestTx) {
        row.payment = {
          provider: latestTx.provider,
          status: latestTx.status,
          refund_status: latestTx.refund_status,
          failure_reason: latestTx.failure_reason,
          updated_at: latestTx.updated_at,
        };
      }
      return row;
    });
    res.json(bookingPayload);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const cancelBooking = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const id = req.params.id;
    const booking = await Booking.findByPk(id, {
      transaction: t,
      include: [{ association: 'user', attributes: ['id', 'name', 'email'] }, { association: 'event', attributes: ['title'] }]
    });
    if (!booking) { await t.rollback(); return res.status(404).json({ error: 'Booking not found' }); }
    if (booking.user_id !== req.user.id && req.user.role !== 'admin') { await t.rollback(); return res.status(403).json({ error: 'Forbidden' }); }

    const evt = await Event.findByPk(booking.event_id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!evt) { await t.rollback(); return res.status(404).json({ error: 'Event not found' }); }

    // Do not release seats again for already-expired/failed bookings.
    const wasPaid = booking.payment_status === 'paid';

    if (booking.payment_status !== 'failed') {
      const nextSeats = Number(evt.available_seats || 0) + Number(booking.seats_booked || 0);
      const maxSeats = Number(evt.total_seats || nextSeats);
      evt.available_seats = Math.min(nextSeats, maxSeats);
      await evt.save({ transaction: t });
    }

    // Keep paid booking rows for refund tracking; remove unpaid/failed booking rows.
    if (wasPaid) {
      booking.payment_status = 'failed';
      await booking.save({ transaction: t });
    } else {
      await booking.destroy({ transaction: t });
    }

    try { await Log.create({ action: 'CANCEL_BOOKING', userId: req.user.id, details: `Booking ${id} cancelled` }); } catch (e) {}

    await t.commit();

    let refundResult = null;
    if (wasPaid) {
      try {
        refundResult = await initiateRefundForBooking(booking, 'requested_by_customer');
      } catch (refundErr) {
        console.error('Refund initiation failed:', refundErr);
      }
    }

    // If booking was already paid, notify user about refund timeline.
    if (wasPaid && booking.user?.email) {
      try {
        const refundLine = refundResult?.refundStatus === 'failed'
          ? 'We could not initiate your refund automatically. Our support team will contact you shortly.'
          : 'Your refund has been initiated and the amount will be credited in 3-5 working days.';
        await sendEmail(
          booking.user.email,
          'Cancellation Confirmed - Refund Initiated',
          `Hello ${booking.user.name || 'Customer'}, we have received your cancellation request for "${booking.event?.title || 'the event'}". As requested, your ticket is cancelled. ${refundLine}`
        );
      } catch (emailErr) {
        console.error('Refund notification email failed:', emailErr);
      }
    }

    res.json({
      message: 'Booking cancelled and seats released',
      refund: wasPaid ? (refundResult || { refundStatus: 'failed', message: 'Refund initiation failed' }) : null
    });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ error: err.message });
  }
};

module.exports = { createBooking, listUserBookings, cancelBooking };
