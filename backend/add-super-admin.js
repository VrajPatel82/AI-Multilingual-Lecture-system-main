/**
 * Add New Super Admin User - Direct Database Insert
 * 
 * This script adds a new super admin user (Titiksha Raval) without deleting existing data.
 * Only run this if you want to add the new super admin to an existing database.
 * 
 * NOTE: The seed.js already includes this user, so only use this if:
 * 1. You're adding to an existing database that wasn't seeded
 * 2. You want to add this user without running full seed
 */

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');

const addNewSuperAdmin = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // Check if user already exists
    const existingUser = await User.findOne({ email: 'titiksha@superadmin.com' });
    if (existingUser) {
      console.log('✓ Titiksha Raval already exists with email titiksha@superadmin.com');
      return;
    }

    // Create new super admin
    const newSuperAdmin = await User.create({
      name: 'Titiksha Raval',
      email: 'titiksha@superadmin.com',
      password: 'Password@123',
      role: 'super_admin',
      phone: '+91-9000000002',
      bio: 'Senior platform administrator.'
    });

    console.log('✓ Successfully added new super admin:');
    console.log(`  Name: ${newSuperAdmin.name}`);
    console.log(`  Email: ${newSuperAdmin.email}`);
    console.log(`  Role: ${newSuperAdmin.role}`);
    console.log(`  Phone: ${newSuperAdmin.phone}`);

  } catch (error) {
    console.error('Error adding super admin:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

// Run if this file is executed directly
if (require.main === module) {
  addNewSuperAdmin();
}

module.exports = addNewSuperAdmin;
