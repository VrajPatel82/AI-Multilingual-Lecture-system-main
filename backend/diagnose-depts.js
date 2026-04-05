const mongoose = require('mongoose');
const Institution = require('./models/Institution');
const Department = require('./models/Department');
require('dotenv').config();

async function diagnose() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lecture-system');
    console.log('✓ MongoDB Connected\n');

    // Check institutions and their departments
    const institutionsWithDepts = await Institution.aggregate([
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

    console.log('=== INSTITUTIONS WITH DEPARTMENTS ===\n');
    if (institutionsWithDepts.length === 0) {
      console.log('⚠ No institutions found in database\n');
    } else {
      institutionsWithDepts.forEach(inst => {
        console.log(`📍 ${inst.name} (${inst.code})`);
        console.log(`   Departments: ${inst.departments.length}`);
        inst.departments.forEach(dept => {
          console.log(`     → ${dept.name} (${dept.code})`);
        });
        console.log('');
      });
    }

    // Check total counts
    const totalInsts = await Institution.countDocuments();
    const totalDepts = await Department.countDocuments();
    
    console.log(`Total Institutions: ${totalInsts}`);
    console.log(`Total Departments: ${totalDepts}`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

diagnose();
