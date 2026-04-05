const mongoose = require('mongoose');
const Lecture = require('../models/Lecture');
const path = require('path');
const fs = require('fs');
const { paginate } = require('../utils/pagination');
const { isTranscribable, transcribeLectureAsync } = require('../services/transcription');

// @desc    Get all lectures (with filters & pagination)
// @route   GET /api/lectures?page=1&limit=20&course=id&semester=3&type=lecture&search=keyword&fileType=pdf&uploadedAfter=date&uploadedBy=id
exports.getAllLectures = async (req, res, next) => {
  try {
    const { course, semester, type, search, fileType, uploadedAfter, uploadedBy, department, page, limit } = req.query;
    const filter = {};

    // Convert ObjectId parameters from string to mongoose ObjectId
    if (course) {
      const courseIds = course.split(',').map(id => id.trim());
      if (courseIds.length === 1) {
        filter.course = new mongoose.Types.ObjectId(courseIds[0]);
      } else {
        filter.course = { $in: courseIds.map(id => new mongoose.Types.ObjectId(id)) };
      }
    }
    if (semester) filter.semester = parseInt(semester);
    if (type && ['lecture', 'lab'].includes(type)) filter.type = type;
    if (fileType) filter.fileType = fileType;
    if (uploadedBy) filter.uploadedBy = new mongoose.Types.ObjectId(uploadedBy);
    if (uploadedAfter) filter.createdAt = { $gte: new Date(uploadedAfter) };

    if (department) {
      const Course = require('../models/Course');
      const courses = await Course.find({ department: new mongoose.Types.ObjectId(department) }).select('_id');
      filter.course = { $in: courses.map(c => c._id) };
    }
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { experimentTitle: { $regex: search, $options: 'i' } }
      ];
    }

    const result = await paginate(Lecture, filter, { page, limit }, [
      { path: 'course', select: 'name code' },
      { path: 'uploadedBy', select: 'name email' }
    ]);

    res.json({
      data: result.data,
      pagination: { total: result.pagination.totalItems, ...result.pagination }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get content accessible to student (filtered by semester & type)
// @route   GET /api/lectures/student/content?type=lecture&page=1&limit=20
exports.getContentByStudent = async (req, res, next) => {
  try {
    const User = require('../models/User');
    const { type, course, semester, search, page = 1, limit = 20 } = req.query;
    
    // Get user's current semester
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const filter = {};

    // For students, default to cumulative contents up to their current semester
    // Unless a specific semester is requested
    if (semester) {
      filter.semester = parseInt(semester);
    } else {
      filter.semester = { $lte: user.currentSemester };
    }

    // Filter by course if provided
    if (course) {
      const courseIds = course.split(',').map(id => id.trim());
      if (courseIds.length === 1) {
        filter.course = new mongoose.Types.ObjectId(courseIds[0]);
      } else {
        filter.course = { $in: courseIds.map(id => new mongoose.Types.ObjectId(id)) };
      }
    }

    // Filter by type if provided
    if (type && ['lecture', 'lab'].includes(type)) {
      filter.type = type;
    }

    // Search filter
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { experimentTitle: { $regex: search, $options: 'i' } }
      ];
    }

    const result = await paginate(Lecture, filter, { page, limit }, [
      { path: 'course', select: 'name code' },
      { path: 'uploadedBy', select: 'name email' }
    ]);

    res.json({
      currentSemester: user.currentSemester,
      data: result.data,
      pagination: { total: result.pagination.totalItems, ...result.pagination }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get lecture by ID
// @route   GET /api/lectures/:id
exports.getLectureById = async (req, res, next) => {
  try {
    const lecture = await Lecture.findById(req.params.id)
      .populate('course', 'name code')
      .populate('uploadedBy', 'name email');

    if (!lecture) {
      return res.status(404).json({ message: 'Lecture not found' });
    }

    res.json({
      success: true,
      data: lecture
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create lecture
// @route   POST /api/lectures
exports.createLecture = async (req, res, next) => {
  try {
    const { title, description, type = 'lecture', subject, experimentTitle, course, semester, language } = req.body;

    const mainFile = req.files?.file ? req.files.file[0] : null;
    const attachmentFile = req.files?.attachment ? req.files.attachment[0] : null;

    // Validate required fields
    if (!title) return res.status(400).json({ message: 'Title is required' });
    if (!course) return res.status(400).json({ message: 'Course is required' });
    if (!semester) return res.status(400).json({ message: 'Semester is required' });
    if (!mainFile) return res.status(400).json({ message: 'Please upload a primary file (Video, Audio, or PDF)' });

    // Determine file type
    const ext = path.extname(mainFile.originalname).toLowerCase();
    let fileType = 'document';
    if (ext === '.pdf') fileType = 'pdf';
    else if (['.mp4', '.webm', '.mov'].includes(ext)) fileType = 'video';
    else if (['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.mpeg', '.mpga'].includes(ext)) fileType = 'audio';

    // Check if file is transcribable
    const canTranscribe = isTranscribable(mainFile.originalname);

    const lectureData = {
      title,
      description,
      type: type === 'lab' ? 'lab' : 'lecture',
      fileUrl: `/uploads/${mainFile.filename}`,
      fileType,
      fileName: mainFile.originalname,
      fileKey: mainFile.filename,
      attachmentUrl: attachmentFile ? `/uploads/${attachmentFile.filename}` : undefined,
      attachmentName: attachmentFile ? attachmentFile.originalname : undefined,
      course,
      uploadedBy: req.user._id,
      semester: parseInt(semester),
      language: language || 'en',
      transcription: {
        status: canTranscribe ? 'processing' : 'none'
      }
    };

    // Add type-specific fields
    if (type === 'lab') {
      if (!subject) return res.status(400).json({ message: 'Subject is required for labs' });
      lectureData.subject = subject;
      if (experimentTitle) lectureData.experimentTitle = experimentTitle;
    }

    const lecture = await Lecture.create(lectureData);

    await lecture.populate('course', 'name code');
    await lecture.populate('uploadedBy', 'name email');

    // Trigger transcription asynchronously (don't block the response)
    // Only transcribe if the file was actually uploaded locally
    if (canTranscribe && mainFile) {
      const absolutePath = path.join(__dirname, '..', 'uploads', mainFile.filename);
      transcribeLectureAsync(lecture._id, absolutePath)
        .catch(err => console.error('Background transcription error:', err.message));
    } else if (!mainFile && isTranscribable(lectureData.fileName || '')) {
      console.log(`[Lecture] Lecture has external URL, skipping local file transcription: ${lecture._id}`);
    }

    res.status(201).json({ lecture, message: 'Content uploaded successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Update lecture
// @route   PUT /api/lectures/:id
exports.updateLecture = async (req, res, next) => {
  try {
    let lecture = await Lecture.findById(req.params.id);

    if (!lecture) {
      return res.status(404).json({ message: 'Lecture not found' });
    }

    // Only the uploader or admin can update
    if (lecture.uploadedBy.toString() !== req.user._id.toString() &&
        !['dept_admin', 'inst_admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized to update this lecture' });
    }

    const updates = {};
    if (req.body.title) updates.title = req.body.title;
    if (req.body.description !== undefined) updates.description = req.body.description;
    if (req.body.course) updates.course = req.body.course;
    if (req.body.semester) updates.semester = parseInt(req.body.semester);
    if (req.body.subject) updates.subject = req.body.subject;
    if (req.body.experimentTitle) updates.experimentTitle = req.body.experimentTitle;

    // If new main file uploaded
    if (req.files?.file) {
      const mainFile = req.files.file[0];
      // Delete old file
      const oldFilePath = path.join(__dirname, '..', lecture.fileUrl);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
      updates.fileUrl = `/uploads/${mainFile.filename}`;
      updates.fileName = mainFile.originalname;
      updates.fileKey = mainFile.filename;

      const ext = path.extname(mainFile.originalname).toLowerCase();
      updates.fileType = ext === '.pdf' ? 'pdf' :
        ['.mp4', '.webm', '.mov'].includes(ext) ? 'video' :
        ['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.mpeg', '.mpga'].includes(ext) ? 'audio' : 'document';

      // Re-trigger transcription if the new file is transcribable
      if (isTranscribable(mainFile.originalname)) {
        updates.transcription = { status: 'processing', text: '', segments: [], error: null };
      } else {
        updates.transcription = { status: 'none', text: '', segments: [] };
      }
    }

    // If new attachment uploaded
    if (req.files?.attachment) {
      const attachmentFile = req.files.attachment[0];
      // Delete old attachment if any
      if (lecture.attachmentUrl) {
        const oldAttachPath = path.join(__dirname, '..', lecture.attachmentUrl);
        if (fs.existsSync(oldAttachPath)) {
          fs.unlinkSync(oldAttachPath);
        }
      }
      updates.attachmentUrl = `/uploads/${attachmentFile.filename}`;
      updates.attachmentName = attachmentFile.originalname;
    }

    lecture = await Lecture.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true
    })
      .populate('course', 'name code')
      .populate('uploadedBy', 'name email');

    // Re-trigger transcription if new file is transcribable
    if (req.files?.file && isTranscribable(req.files.file[0].originalname)) {
      const absolutePath = path.join(__dirname, '..', 'uploads', req.files.file[0].filename);
      transcribeLectureAsync(lecture._id, absolutePath)
        .catch(err => console.error('Background transcription error:', err.message));
    }

    res.json({ lecture, message: 'Lecture updated successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete lecture
// @route   DELETE /api/lectures/:id
exports.deleteLecture = async (req, res, next) => {
  try {
    const lecture = await Lecture.findById(req.params.id);

    if (!lecture) {
      return res.status(404).json({ message: 'Lecture not found' });
    }

    // Only the uploader or admin can delete
    if (lecture.uploadedBy.toString() !== req.user._id.toString() &&
        !['dept_admin', 'inst_admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized to delete this lecture' });
    }

    // Delete file from filesystem
    const filePath = path.join(__dirname, '..', lecture.fileUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete attachment if exists
    if (lecture.attachmentUrl) {
       const attachPath = path.join(__dirname, '..', lecture.attachmentUrl);
       if (fs.existsSync(attachPath)) fs.unlinkSync(attachPath);
    }

    await Lecture.findByIdAndDelete(req.params.id);

    res.json({ message: 'Lecture deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get transcription for a lecture
// @route   GET /api/lectures/:id/transcription
exports.getTranscription = async (req, res, next) => {
  try {
    const lecture = await Lecture.findById(req.params.id).select('title transcription fileType');

    if (!lecture) {
      return res.status(404).json({ message: 'Lecture not found' });
    }

    res.json({
      lectureId: lecture._id,
      title: lecture.title,
      fileType: lecture.fileType,
      transcription: lecture.transcription || { status: 'none' }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Retry transcription for a lecture
// @route   POST /api/lectures/:id/transcription/retry
exports.retryTranscription = async (req, res, next) => {
  try {
    const lecture = await Lecture.findById(req.params.id);

    if (!lecture) {
      return res.status(404).json({ message: 'Lecture not found' });
    }

    // Only the uploader or admin can retry
    if (lecture.uploadedBy.toString() !== req.user._id.toString() &&
        !['dept_admin', 'inst_admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (!isTranscribable(lecture.fileName)) {
      return res.status(400).json({ message: 'This file type does not support transcription' });
    }

    if (lecture.transcription?.status === 'processing') {
      return res.status(400).json({ message: 'Transcription is already in progress' });
    }

    // Check if lecture has a local file (not just external URL)
    if (!lecture.fileName) {
      return res.status(400).json({ 
        message: 'This lecture uses an external file URL and cannot be transcribed locally. Please upload a local audio/video file to enable transcription.' 
      });
    }

    console.log(`[Retry] Retrying transcription for lecture ${lecture._id}, fileKey: ${lecture.fileKey}`);

    // Mark as processing
    await Lecture.findByIdAndUpdate(lecture._id, {
      'transcription.status': 'processing',
      'transcription.error': null
    });

    // Determine the actual saved filename:
    // 1. Use fileKey if available (new uploads)
    // 2. Otherwise extract from fileUrl (backward compatibility for old uploads)
    // 3. Fall back to fileName if all else fails
    let savedFilename = lecture.fileKey;
    if (!savedFilename && lecture.fileUrl) {
      // Extract filename from URL like "/uploads/1234567890-123456789.mp4" -> "1234567890-123456789.mp4"
      savedFilename = path.basename(lecture.fileUrl);
    }
    if (!savedFilename) {
      // Last resort - use fileName, though this may not exist on disk for old uploads
      savedFilename = lecture.fileName;
    }
    
    const absolutePath = path.join(__dirname, '..', 'uploads', savedFilename);
    
    console.log(`[Retry] Absolute path: ${absolutePath}`);
    
    transcribeLectureAsync(lecture._id, absolutePath)
      .catch(err => console.error('[Retry] Background transcription error:', err.message));

    res.json({ message: 'Transcription retry started' });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate AI Quiz from lecture/lab transcript
// @route   POST /api/lectures/:id/generate-quiz
exports.generateQuizFromLecture = async (req, res, next) => {
  try {
    const Quiz = require('../models/Quiz');
    const axios = require('axios');

    const lecture = await Lecture.findById(req.params.id)
      .populate('course', 'name code _id');

    if (!lecture) {
      return res.status(404).json({ message: 'Content not found' });
    }

    // Check if transcription is available
    if (!lecture.transcription || lecture.transcription.status !== 'completed' || !lecture.transcription.text) {
      return res.status(400).json({ message: 'Transcription not available yet. Please wait for transcription to complete.' });
    }

    // Prepare prompt for Gemini API
    const sessionType = lecture.type === 'lab' ? 'Lab' : 'Lecture';
    const transcript = lecture.transcription.text.substring(0, 4000); // Limit transcript to avoid token limits

    const prompt = `You are an AI tutor. session Type: ${sessionType}. Generate exactly 5 multiple choice questions from the following transcript. 

Return ONLY valid JSON in this exact format (no markdown, no code blocks, just JSON):
[
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "answer": "Option A"
  }
]

Rules:
- Generate exactly 5 questions
- Each question must have exactly 4 options
- One option must be correct (the answer)
- If ${sessionType.toLowerCase()}: ${sessionType === 'Lab' ? 'focus on practical steps, tools, observations, and experimental procedures' : 'focus on theory, concepts, and key learning points'}
- Make questions clear and educational
- No explanations, just JSON

Transcript:
${transcript}`;

    try {
      // Call Gemini API
      const response = await axios.post(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
        {
          contents: [{
            parts: [{ text: prompt }]
          }]
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          params: {
            key: process.env.GEMINI_API_KEY
          }
        }
      );

      // Extract generated text
      const generatedText = response.data.candidates[0].content.parts[0].text;
      
      // Parse JSON response
      let questions = JSON.parse(generatedText);
      
      // Ensure we have exactly 5 questions
      if (!Array.isArray(questions) || questions.length === 0) {
        return res.status(500).json({ message: 'Failed to generate valid questions' });
      }

      // Format questions for Quiz model
      const formattedQuestions = questions.map(q => ({
        question: q.question,
        type: 'mcq',
        options: q.options,
        correctAnswer: q.answer,
        points: 1
      }));

      // Create quiz
      const quiz = await Quiz.create({
        title: `${sessionType} Quiz: ${lecture.title}`,
        course: lecture.course._id,
        questions: formattedQuestions,
        timeLimit: 20,
        createdBy: req.user._id
      });

      await quiz.populate('course', 'name code');

      res.status(201).json({
        message: 'Quiz generated successfully',
        quiz,
        questionCount: quiz.questions.length
      });
    } catch (apiError) {
      console.error('Gemini API Error:', apiError.response?.data || apiError.message);
      return res.status(500).json({ 
        message: 'Failed to generate quiz. Please try again.',
        error: process.env.NODE_ENV === 'development' ? apiError.message : undefined
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Generate important questions from lecture transcript using AI
// @route   POST /api/lectures/:id/important-questions
exports.generateImportantQuestions = async (req, res, next) => {
  try {
    const aiQuizService = require('../services/aiQuizService');

    const lecture = await Lecture.findById(req.params.id);

    if (!lecture) {
      return res.status(404).json({ message: 'Lecture not found' });
    }

    if (!lecture.transcription || lecture.transcription.status !== 'completed' || !lecture.transcription.text) {
      return res.status(400).json({ message: 'Transcription not available yet.' });
    }

    try {
      const questions = await aiQuizService.generateImportantQuestions(
        lecture.transcription.text,
        lecture.type
      );

      if (!Array.isArray(questions) || questions.length === 0) {
        return res.status(500).json({ message: 'Failed to generate valid questions' });
      }

      res.json({
        message: 'Important questions generated successfully',
        lectureTitle: lecture.title,
        questions
      });
    } catch (apiError) {
      console.error('AI Service Error:', apiError.message);
      return res.status(500).json({ message: 'Failed to generate important questions. Please try again.' });
    }
  } catch (error) {
    next(error);
  }
};
