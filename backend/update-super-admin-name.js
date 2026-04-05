const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');

const updateSuperAdminName = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-lecture-system', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Find and update super admin user
    const result = await User.findOneAndUpdate(
      { role: 'super_admin', name: 'superadmin' },
      { name: 'superadmin' },
      { new: true }
    );

    if (result) {
      console.log('✅ Super admin name updated successfully');
      console.log(`Updated from: "${result.name}" back to: "superadmin"`);
      console.log(`Actually updated to: "superadmin"`);
      console.log(`User email: ${result.email}`);
    } else {
      console.log('⚠️ Super admin user not found with name "superadmin"');
      // Try to find any super_admin to show what's in the database
      const superAdmin = await User.findOne({ role: 'super_admin' });
      if (superAdmin) {
        console.log(`Current super admin: ${superAdmin.name} (${superAdmin.email})`);
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating super admin name:', error);
    process.exit(1);
  }
};

updateSuperAdminName();
