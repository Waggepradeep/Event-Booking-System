#!/usr/bin/env node

/**
 * Seed script to add test events to the database
 * Run with: npm exec node seedEvents.js
 */

require('dotenv').config();
const { sequelize } = require('./src/config/db');
const Event = require('./src/models/eventModel');

const ADMIN_USER_ID = 1; // Default admin user ID

const testEvents = [
  {
    title: 'React Workshop',
    description: 'Learn modern React development techniques including hooks, context API, and performance optimization.',
    location: 'San Francisco, CA',
    date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    price: 99.99,
    total_seats: 50,
    created_by: ADMIN_USER_ID,
  },
  {
    title: 'Web Development Conference 2026',
    description: 'Join thousands of developers for talks on the latest web technologies and trends.',
    location: 'New York, NY',
    date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    price: 299.99,
    total_seats: 500,
    created_by: ADMIN_USER_ID,
  },
  {
    title: 'JavaScript Masterclass',
    description: 'Deep dive into advanced JavaScript concepts and practical patterns used in production applications.',
    location: 'Austin, TX',
    date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
    price: 149.99,
    total_seats: 100,
    created_by: ADMIN_USER_ID,
  },
  {
    title: 'Node.js Backend Development',
    description: 'Build scalable and efficient backend systems using Node.js and Express.',
    location: 'Seattle, WA',
    date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 21 days from now
    price: 199.99,
    total_seats: 75,
    created_by: ADMIN_USER_ID,
  },
  {
    title: 'Tech Startup Networking Event',
    description: 'Meet founders, investors, and fellow entrepreneurs in the tech space.',
    location: 'Los Angeles, CA',
    date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
    price: 49.99,
    total_seats: 200,
    created_by: ADMIN_USER_ID,
  },
  {
    title: 'CSS & UI Design Bootcamp',
    description: 'Master modern CSS, responsive design, and UI/UX best practices.',
    location: 'Chicago, IL',
    date: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000), // 28 days from now
    price: 179.99,
    total_seats: 60,
    created_by: ADMIN_USER_ID,
  },
];

async function seedEvents() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Set available seats equal to total seats
    const eventsWithAvailableSeats = testEvents.map(event => ({
      ...event,
      available_seats: event.total_seats,
    }));

    const createdEvents = await Event.bulkCreate(eventsWithAvailableSeats);
    console.log(`✅ Successfully created ${createdEvents.length} test events!`);

    createdEvents.forEach((event) => {
      console.log(`   • ${event.title} (${event.location}) - $${event.price}`);
    });

    console.log('\n✅ Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error.message);
    process.exit(1);
  }
}

// Run the seeding script
seedEvents();
