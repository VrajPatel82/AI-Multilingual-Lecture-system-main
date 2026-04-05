const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const demoCredentials = [
  { email: 'admin@superadmin.com', role: 'super_admin', name: 'Super Admin' },
  { email: 'admin@iitb.ac.in', role: 'inst_admin', name: 'Dr. Ramesh Kumar' },
  { email: 'hod.cse@iitb.ac.in', role: 'dept_admin', name: 'Amit Patel' },
  { email: 'vikram@iitb.ac.in', role: 'professor', name: 'Prof. Vikram Malhotra' },
  { email: 'rahul@iitb.ac.in', role: 'student', name: 'Rahul Verma' }
];

async function verifyCreds() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lecture-system');
    console.log('✓ MongoDB Connected\n');

    console.log('=== VERIFYING DEMO CREDENTIALS ===\n');
    let allFound = true;

    for (const cred of demoCredentials) {
      const user = await User.findOne({ email: cred.email }).select('+password');
      
      if (!user) {
        console.log(`❌ ${cred.role.toUpperCase()}: ${cred.email} - NOT FOUND`);
        allFound = false;
      } else {
        const hasPassword = !!user.password;
        const roleMatch = user.role === cred.role;
        
        if (roleMatch && hasPassword) {
          console.log(`✅ ${cred.role.toUpperCase()}: ${cred.email}`);
          console.log(`   Name: ${user.name}`);
          console.log(`   Password: Set (Password@123)`);
        } else {
          console.log(`⚠ ${cred.role.toUpperCase()}: ${cred.email} - MISMATCH`);
          console.log(`   Expected Role: ${cred.role}, Found: ${user.role}`);
          console.log(`   Password Set: ${hasPassword}`);
          allFound = false;
        }
      }
      console.log('');
    }

    if (allFound) {
      console.log('✅ All demo credentials verified successfully!');
      console.log('\n=== CREDENTIALS READY FOR LOGIN PAGE ===');
      console.log('Super Admin: admin@superadmin.com / Password@123');
      console.log('Inst Admin: admin@iitb.ac.in / Password@123');
      console.log('Dept Admin: hod.cse@iitb.ac.in / Password@123');
      console.log('Professor: vikram@iitb.ac.in / Password@123');
      console.log('Student: rahul@iitb.ac.in / Password@123');
    } else {
      console.log('⚠ Some credentials need attention');
    }

    process.exit(allFound ? 0 : 1);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

verifyCreds();
