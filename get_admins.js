const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

// Mock a minimal User model for querying
const UserSchema = new mongoose.Schema({
  username: String,
  email: String,
  role: String
}, { collection: 'users' });

const User = mongoose.model('User', UserSchema);

async function checkAdmins() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI is missing in environment variables.');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log('Connected to DB');    const admins = await User.find({ role: 'admin' }).select('username email');
    if (admins.length > 0) {
      console.log('Admin users found:');
      admins.forEach(a => console.log(`- Username: ${a.username}, Email: ${a.email}`));
    } else {
      console.log('No admin users found in the database.');
    }
    process.exit(0);
  } catch (err) {
    console.error('Error connecting to DB:', err.message);
    process.exit(1);
  }
}

checkAdmins();
