const mongoose = require('mongoose');
const Institution = require('./models/Institution');
const Department = require('./models/Department');
const User = require('./models/User');
require('dotenv').config();

async function reseedInstitutionDepts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lecture-system');
    console.log('✓ MongoDB Connected\n');

    // Get existing institutions
    const institutions = await Institution.find();
    
    if (institutions.length === 0) {
      console.log('⚠ No institutions found. Please run seed.js first');
      process.exit(1);
    }

    console.log('Found institutions:');
    institutions.forEach(inst => console.log(`  → ${inst.name} (${inst.code})`));

    // Map institutions by code
    const iitb = institutions.find(i => i.code === 'IITB');
    const iitd = institutions.find(i => i.code === 'IITD');

    if (!iitb || !iitd) {
      console.log('⚠ Expected institutions (IITB, IITD) not found');
      process.exit(1);
    }

    // Clear existing departments
    await Department.deleteMany({});
    console.log('✓ Cleared existing departments\n');

    // Recreate all departments
    const deptConfig = [
      { name: 'Computer Science & Engineering', code: 'CSE', institution: iitb._id },
      { name: 'Electrical Engineering', code: 'EE', institution: iitb._id },
      { name: 'Computer Science & Engineering', code: 'CSE', institution: iitd._id },
      { name: 'Electronics & Communication', code: 'ECE', institution: iitd._id },
    ];

    const departments = await Department.insertMany(deptConfig);
    console.log(`✓ Created ${departments.length} departments:\n`);
    
    departments.forEach(dept => {
      const instCode = dept.institution === iitb._id ? 'IITB' : 'IITD';
      console.log(`  → ${dept.name} (${dept.code}) @ ${instCode}`);
    });

    // Verify the fix
    console.log('\n=== VERIFICATION ===\n');
    const verify = await Institution.aggregate([
      {
        $lookup: {
          from: 'departments',
          localField: '_id',
          foreignField: 'institution',
          as: 'departments'
        }
      },
      { $sort: { name: 1 } }
    ]);

    verify.forEach(inst => {
      console.log(`${inst.name}: ${inst.departments.length} department${inst.departments.length !== 1 ? 's' : ''}`);
    });

    console.log('\n✓ Database reseed complete!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

reseedInstitutionDepts();
