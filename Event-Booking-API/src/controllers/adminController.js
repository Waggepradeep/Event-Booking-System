const { Op, QueryTypes } = require('sequelize');
const Booking = require('../models/bookingModel');
const Event = require('../models/eventModel');
const User = require('../models/userModel');
const Log = require('../models/logModel');
const Analytics = require('../models/analyticsModel');
const PaymentTransaction = require('../models/paymentTransactionModel');
const { sequelize } = require('../config/db');
const generateTicketPDF = require('../utils/pdfGenerator');
const sendEmail = require('../utils/emailSender');

const stats = async (req, res) => {
  try {
    const total_events = await Event.count();
    const total_bookings = await Booking.count();

    const [grossResult] = await sequelize.query(
      `SELECT
         COALESCE(SUM(e.price * b.seats_booked), 0) AS gross_revenue,
         COALESCE(COUNT(*), 0) AS paid_booking_count,
         COALESCE(SUM(b.seats_booked), 0) AS total_seats_sold
       FROM bookings b
       JOIN events e ON b.event_id = e.id
       WHERE b.payment_status='paid'`,
      { type: QueryTypes.SELECT }
    );

    const [refundResult] = await sequelize.query(
      `SELECT COALESCE(SUM(amount), 0) AS refunded_amount
       FROM payment_transactions
       WHERE refund_status='refunded'`,
      { type: QueryTypes.SELECT }
    );

    const gross_revenue = Number(grossResult?.gross_revenue || 0);
    const refunded_amount = Number(refundResult?.refunded_amount || 0);
    const net_revenue = gross_revenue - refunded_amount;
    const paid_booking_count = Number(grossResult?.paid_booking_count || 0);
    const total_seats_sold = Number(grossResult?.total_seats_sold || 0);

    res.json({
      total_events,
      total_bookings,
      paid_booking_count,
      total_seats_sold,
      gross_revenue,
      refunded_amount,
      net_revenue,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const popularEvents = async (req, res) => {
  try {
    const rows = await sequelize.query(
      `SELECT e.title as event_title, SUM(b.seats_booked) as bookings
       FROM bookings b JOIN events e ON b.event_id = e.id
       GROUP BY e.id ORDER BY bookings DESC LIMIT 10`,
      { type: QueryTypes.SELECT }
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getLogs = async (req, res) => {
  try {
    const logs = await Log.find().sort({ timestamp: -1 }).limit(100);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getOccupancyDashboard = async (req, res) => {
  try {
    const events = await Event.findAll({
      attributes: ['id', 'title', 'date', 'total_seats', 'available_seats'],
      order: [['date', 'ASC']],
    });

    const payload = events.map((evt) => {
      const totalSeats = Number(evt.total_seats || 0);
      const availableSeats = Number(evt.available_seats || 0);
      const bookedSeats = Math.max(0, totalSeats - availableSeats);
      const occupancyPercent = totalSeats > 0 ? Number(((bookedSeats / totalSeats) * 100).toFixed(2)) : 0;
      return {
        id: evt.id,
        title: evt.title,
        date: evt.date,
        totalSeats,
        availableSeats,
        bookedSeats,
        occupancyPercent,
      };
    });

    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getFilteredBookings = async (req, res) => {
  try {
    const { status, date, event, user } = req.query || {};

    const where = {};
    if (status) {
      where.payment_status = status;
    }

    if (date) {
      const start = new Date(date);
      const end = new Date(date);
      end.setDate(end.getDate() + 1);
      where.booked_at = { [Op.gte]: start, [Op.lt]: end };
    }

    const eventWhere = {};
    if (event) {
      const eventId = Number(event);
      if (Number.isInteger(eventId) && eventId > 0) {
        eventWhere.id = eventId;
      } else {
        eventWhere.title = { [Op.like]: `%${event}%` };
      }
    }

    const userWhere = {};
    if (user) {
      const userId = Number(user);
      if (Number.isInteger(userId) && userId > 0) {
        userWhere.id = userId;
      } else {
        userWhere[Op.or] = [
          { name: { [Op.like]: `%${user}%` } },
          { email: { [Op.like]: `%${user}%` } },
        ];
      }
    }

    const bookings = await Booking.findAll({
      where,
      include: [
        {
          association: 'event',
          attributes: ['id', 'title', 'date', 'price', 'location'],
          where: Object.keys(eventWhere).length ? eventWhere : undefined,
          required: !!Object.keys(eventWhere).length,
        },
        {
          association: 'user',
          attributes: ['id', 'name', 'email'],
          where: Object.keys(userWhere).length ? userWhere : undefined,
          required: !!Object.keys(userWhere).length,
        },
      ],
      order: [['booked_at', 'DESC']],
    });

    const bookingIds = bookings.map((b) => b.id);
    const txRows = bookingIds.length
      ? await PaymentTransaction.findAll({
          where: { booking_id: bookingIds },
          attributes: [
            'booking_id',
            'provider',
            'provider_payment_id',
            'provider_refund_id',
            'status',
            'refund_status',
            'failure_reason',
            'amount',
            'currency',
            'updated_at',
          ],
          order: [['updated_at', 'DESC']],
        })
      : [];

    const latestTxByBookingId = new Map();
    for (const tx of txRows) {
      if (!latestTxByBookingId.has(tx.booking_id)) {
        latestTxByBookingId.set(tx.booking_id, tx);
      }
    }

    const payload = bookings.map((b) => {
      const row = b.toJSON();
      const tx = latestTxByBookingId.get(row.id);
      const amount = tx ? Number(tx.amount) : Number(row.event?.price || 0) * Number(row.seats_booked || 0);
      row.amount = amount;
      row.currency = tx?.currency || 'INR';
      row.payment = tx
        ? {
            provider: tx.provider,
            provider_payment_id: tx.provider_payment_id,
            provider_refund_id: tx.provider_refund_id,
            status: tx.status,
            refund_status: tx.refund_status,
            failure_reason: tx.failure_reason,
            updated_at: tx.updated_at,
          }
        : null;
      return row;
    });

    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const resendTicketEmail = async (req, res) => {
  try {
    const bookingId = Number(req.params.bookingId);
    if (!bookingId) return res.status(400).json({ error: 'Invalid booking ID' });

    const booking = await Booking.findByPk(bookingId, {
      include: [
        { association: 'event', attributes: ['id', 'title', 'date', 'location', 'price'] },
        { association: 'user', attributes: ['id', 'name', 'email'] },
      ],
    });

    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (!booking.user?.email) return res.status(400).json({ error: 'User email not found for this booking' });

    const tx = await PaymentTransaction.findOne({
      where: { booking_id: booking.id, status: 'succeeded' },
      order: [['updated_at', 'DESC']],
    });

    if (!tx && booking.payment_status !== 'paid') {
      return res.status(400).json({ error: 'Cannot resend ticket for an unpaid booking' });
    }

    const pdfPath = await generateTicketPDF(booking, booking.event);
    await sendEmail(
      booking.user.email,
      'Your Event Ticket (Resent)',
      `Hello ${booking.user.name || ''}, this is a resent copy of your ticket for booking #${booking.id}.`,
      pdfPath
    );

    res.json({ message: 'Ticket email resent successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const resendRefundEmail = async (req, res) => {
  try {
    const bookingId = Number(req.params.bookingId);
    if (!bookingId) return res.status(400).json({ error: 'Invalid booking ID' });

    const booking = await Booking.findByPk(bookingId, {
      include: [
        { association: 'event', attributes: ['title'] },
        { association: 'user', attributes: ['name', 'email'] },
      ],
    });

    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (!booking.user?.email) return res.status(400).json({ error: 'User email not found for this booking' });

    const tx = await PaymentTransaction.findOne({
      where: {
        booking_id: booking.id,
        refund_status: { [Op.in]: ['initiated', 'processing', 'refunded', 'failed'] },
      },
      order: [['updated_at', 'DESC']],
    });

    if (!tx) {
      return res.status(400).json({ error: 'No refund record found for this booking' });
    }

    let refundText = 'Your refund request has been initiated and is being processed. The amount should be credited in 3-5 working days.';
    if (tx.refund_status === 'refunded') {
      refundText = 'Your refund has been completed successfully.';
    }
    if (tx.refund_status === 'failed') {
      refundText = 'Your refund could not be completed automatically. Our support team will contact you shortly.';
    }

    await sendEmail(
      booking.user.email,
      'Refund Update (Resent)',
      `Hello ${booking.user.name || 'Customer'}, here is your latest refund update for "${booking.event?.title || 'your event'}": ${refundText}`
    );

    res.json({ message: 'Refund email resent successfully', refundStatus: tx.refund_status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  stats,
  popularEvents,
  getLogs,
  getOccupancyDashboard,
  getFilteredBookings,
  resendTicketEmail,
  resendRefundEmail,
};
