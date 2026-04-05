const mongoose = require('mongoose');

const lectureSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Lecture title is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    enum: ['lecture', 'lab'],
    default: 'lecture',
    required: true
  },
  subject: {
    type: String,
    trim: true
  },
  experimentTitle: {
    type: String,
    trim: true
  },
  fileUrl: {
    type: String,
    required: [true, 'File URL is required']
  },
  fileType: {
    type: String,
    enum: ['pdf', 'video', 'audio', 'document'],
    default: 'pdf'
  },
  fileName: {
    type: String
  },
  fileKey: {
    type: String,
    description: 'Actual filename saved by Multer (used for reading files from disk)'
  },
  attachmentUrl: {
    type: String
  },
  attachmentName: {
    type: String
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  semester: {
    type: Number,
    min: 1,
    max: 8,
    required: true
  },
  language: {
    type: String,
    default: 'en'
  },
  teachingLanguage: {
    type: String,
    enum: ['English', 'Hindi', 'Gujarati', 'Mixed'],
    default: 'English'
  },
  transcription: {
    status: {
      type: String,
      enum: ['none', 'processing', 'completed', 'failed'],
      default: 'none'
    },
    text: {
      type: String,
      default: ''
    },
    segments: [{
      start: Number,
      end: Number,
      text: String,
      language: String
    }],
    language: String,
    duration: Number,
    completedAt: Date,
    error: String
  },
  languageAnalysis: {
    English: {
      type: Number,
      default: 0
    },
    Hindi: {
      type: Number,
      default: 0
    },
    Gujarati: {
      type: Number,
      default: 0
    },
    Other: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

// Database indexes for performance
lectureSchema.index({ title: 'text', description: 'text' });
lectureSchema.index({ course: 1, createdAt: -1 });
lectureSchema.index({ uploadedBy: 1 });
lectureSchema.index({ semester: 1 });
lectureSchema.index({ type: 1 });
lectureSchema.index({ fileType: 1 });
lectureSchema.index({ createdAt: -1 });
lectureSchema.index({ type: 1, semester: 1, uploadedBy: 1 });

module.exports = mongoose.model('Lecture', lectureSchema);
