// src/routes/eventRoutes.js
const express = require('express');
const { authenticate, authorize } = require('../middlewares/authMiddleware');
const { createEvent, listEvents, getEvent, updateEvent, deleteEvent } = require('../controllers/eventController');

const router = express.Router();

router.get('/', listEvents);
router.get('/:id', getEvent);
router.post('/', authenticate, authorize('admin'), createEvent);
router.put('/:id', authenticate, authorize('admin'), updateEvent);
router.delete('/:id', authenticate, authorize('admin'), deleteEvent);

module.exports = router;