const mongoose = require('mongoose');
const Round = require('./models/Round');
const defaultRounds = require('./data/defaultRounds');
require('dotenv').config();

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');
    await Round.deleteMany({});
    await Round.insertMany(defaultRounds);
    console.log('Seeded rounds successfully from shared default data.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seed();
