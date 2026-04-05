const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function updateSuperAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lecture-system');
    console.log('✓ MongoDB Connected');

    // Find and update super admin user
    const result = await User.updateOne(
      { role: 'super_admin' },
      { $set: { name: 'Super Admin' } }
    );

    if (result.modifiedCount > 0) {
      console.log('✓ Super Admin name updated successfully');
      const updated = await User.findOne({ role: 'super_admin' });
      console.log('Updated user:', {
        name: updated.name,
        email: updated.email,
        role: updated.role
      });
    } else {
      console.log('⚠ No super admin user found to update');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error updating super admin:', error.message);
    process.exit(1);
  }
}

updateSuperAdmin();
