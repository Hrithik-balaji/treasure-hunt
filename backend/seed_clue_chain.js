const mongoose = require('mongoose');
const Round = require('./models/Round');
const defaultRounds = require('./data/defaultRounds');
require('dotenv').config();

const MONGO_DB_NAME = process.env.MONGO_DB_NAME || 'test';

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI, { dbName: MONGO_DB_NAME });
    console.log(`Connected to DB: ${MONGO_DB_NAME}`);
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
