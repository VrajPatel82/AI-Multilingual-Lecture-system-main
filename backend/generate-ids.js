// Script to generate departmentId for all departments and professorId for all professors
const mongoose = require('mongoose');
const User = require('./models/User');
const Department = require('./models/Department');
const Institution = require('./models/Institution');

async function generateIds() {
  try {
    await mongoose.connect('mongodb://localhost:27017/lecture_system', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Connected to MongoDB');

    // Generate departmentIds
    console.log('Generating departmentIds...');
    const departments = await Department.find();
    for (const dept of departments) {
      if (!dept.departmentId) {
        const inst = await Institution.findById(dept.institution);
        if (inst) {
          const instCode = inst.code || 'UNK';
          const deptCode = dept.code || 'UNK';
          dept.departmentId = `${instCode}-${deptCode}-001`;
          await dept.save();
          console.log(`Generated departmentId for ${dept.name}: ${dept.departmentId}`);
        }
      }
    }

    // Generate professorIds
    console.log('Generating professorIds...');
    const professors = await User.find({ role: 'professor' }).populate('institution').populate('department');
    
    // Group professors by department
    const profsByDept = {};
    for (const prof of professors) {
      if (!prof.professorId && prof.department && prof.institution) {
        const deptKey = prof.department._id.toString();
        if (!profsByDept[deptKey]) {
          profsByDept[deptKey] = [];
        }
        profsByDept[deptKey].push(prof);
      }
    }

    // Assign professor IDs
    for (const [deptKey, profs] of Object.entries(profsByDept)) {
      const dept = await Department.findById(deptKey).populate('institution');
      if (dept && dept.institution) {
        const instCode = dept.institution.code || 'UNK';
        const deptCode = dept.code || 'UNK';
        
        for (let i = 0; i < profs.length; i++) {
          profs[i].professorId = `${instCode}-${deptCode}-PROF-${String(i + 1).padStart(3, '0')}`;
          await profs[i].save();
          console.log(`Generated professorId for ${profs[i].name}: ${profs[i].professorId}`);
        }
      }
    }

    console.log('✅ All IDs generated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

generateIds();
