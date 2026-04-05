const mongoose = require('mongoose');

const timetableEntrySchema = new mongoose.Schema({
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  professor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  dayOfWeek: {
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    required: true
  },
  startTime: {
    type: String,
    required: true // Format: "HH:MM" (24hr)
  },
  endTime: {
    type: String,
    required: true
  },
  room: {
    type: String,
    trim: true,
    default: ''
  },
  semester: {
    type: Number,
    min: 1,
    max: 12
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
  }
}, {
  timestamps: true
});

// Indexes
timetableEntrySchema.index({ course: 1 });
timetableEntrySchema.index({ professor: 1 });
timetableEntrySchema.index({ dayOfWeek: 1, startTime: 1 });
timetableEntrySchema.index({ room: 1, dayOfWeek: 1 });
timetableEntrySchema.index({ department: 1, semester: 1 });

module.exports = mongoose.model('Timetable', timetableEntrySchema);
