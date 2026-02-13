// src/controllers/eventController.js
const { Op } = require('sequelize');
const Event = require('../models/eventModel');

const createEvent = async (req, res) => {
  try {
    const { title, description, location, date, price, total_seats } = req.body || {};
    if (!title || !location || !date || total_seats == null) return res.status(400).json({ error: 'Missing required fields' });
    const created_by = req.user.id;
    const evt = await Event.create({
      title, description, location, date, price: price || 0, total_seats, available_seats: total_seats, created_by
    });
    res.json({ message: 'Event created successfully', eventId: evt.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const listEvents = async (req, res) => {
  try {
    const { location, date } = req.query || {};
    const where = {};
    if (location) where.location = { [Op.like]: `%${location}%` };
    if (date) {
      const dayStart = new Date(date);
      const dayEnd = new Date(date);
      dayEnd.setDate(dayEnd.getDate() + 1);
      where.date = { [Op.gte]: dayStart, [Op.lt]: dayEnd };
    }
    const events = await Event.findAll({ where, attributes: ['id','title','description','location','date','price','available_seats','total_seats'] });
    res.json({ data: events });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getEvent = async (req, res) => {
  try {
    const id = req.params.id;
    const evt = await Event.findByPk(id);
    if (!evt) return res.status(404).json({ error: 'Event not found' });
    res.json({ data: evt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateEvent = async (req, res) => {
  try {
    const id = req.params.id;
    const evt = await Event.findByPk(id);
    if (!evt) return res.status(404).json({ error: 'Event not found' });
    const up = await evt.update(req.body);
    res.json({ message: 'Event updated', event: up });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteEvent = async (req, res) => {
  try {
    const id = req.params.id;
    const evt = await Event.findByPk(id);
    if (!evt) return res.status(404).json({ error: 'Event not found' });
    await evt.destroy();
    res.json({ message: 'Event deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { createEvent, listEvents, getEvent, updateEvent, deleteEvent };
