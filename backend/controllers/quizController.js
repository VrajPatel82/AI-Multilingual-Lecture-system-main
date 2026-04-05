const Quiz = require('../models/Quiz');
const QuizResult = require('../models/QuizResult');
const Lecture = require('../models/Lecture');
const aiQuizService = require('../services/aiQuizService');

// @desc    Get all quizzes (with pagination & filters)
// @route   GET /api/quizzes?page=1&limit=20&course=id&search=keyword&createdBy=userId
exports.getAllQuizzes = async (req, res, next) => {
  try {
    const { course, search, createdBy, page, limit } = req.query;
    const filter = {};
    // Handle comma-separated course IDs
    if (course) {
      const courseIds = course.split(',').map(id => id.trim());
      filter.course = courseIds.length === 1 ? courseIds[0] : { $in: courseIds };
    }
    if (createdBy) filter.createdBy = createdBy;
    if (search) {
      filter.title = { $regex: search, $options: 'i' };
    }

    // Students only see active quizzes; professors/admins see all
    if (req.user.role === 'student') {
      filter.isActive = true;
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [totalItems, quizzes] = await Promise.all([
      Quiz.countDocuments(filter),
      Quiz.find(filter)
        .populate('course', 'name code')
        .populate('createdBy', 'name email')
        .select('-questions.correctAnswer')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
    ]);

    // For each quiz, check if current user has attempted
    const quizzesWithStatus = await Promise.all(
      quizzes.map(async (quiz) => {
        const result = await QuizResult.findOne({
          quiz: quiz._id,
          student: req.user._id
        });
        return {
          ...quiz.toObject(),
          attempted: !!result,
          score: result ? result.totalScore : null,
          maxScore: result ? result.maxScore : null
        };
      })
    );

    const totalPages = Math.ceil(totalItems / limitNum);
    res.json({
      data: quizzesWithStatus,
      pagination: {
        total: totalItems,
        totalItems,
        currentPage: pageNum,
        totalPages,
        limit: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get quiz by ID (for attempting)
// @route   GET /api/quizzes/:id
exports.getQuizById = async (req, res, next) => {
  try {
    const quiz = await Quiz.findById(req.params.id)
      .populate('course', 'name code')
      .populate('createdBy', 'name email');

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Students cannot access inactive quizzes
    if (req.user.role === 'student' && !quiz.isActive) {
      return res.status(403).json({ message: 'This quiz is currently inactive' });
    }

    // Hide correct answers for students
    const quizObj = quiz.toObject();
    if (req.user.role === 'student') {
      quizObj.questions = quizObj.questions.map(q => {
        const { correctAnswer, ...rest } = q;
        return rest;
      });
    }

    // Check if already attempted
    const existing = await QuizResult.findOne({
      quiz: quiz._id,
      student: req.user._id
    });

    res.json({
      quiz: quizObj,
      attempted: !!existing,
      result: existing || null
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create quiz
// @route   POST /api/quizzes
exports.createQuiz = async (req, res, next) => {
  try {
    const { title, course, questions, timeLimit, deadline } = req.body;

    if (!questions || questions.length === 0) {
      return res.status(400).json({ message: 'Quiz must have at least one question' });
    }

    const quiz = await Quiz.create({
      title,
      course,
      questions,
      timeLimit: timeLimit || 30,
      deadline: deadline ? new Date(deadline) : undefined,
      createdBy: req.user._id
    });

    await quiz.populate('course', 'name code');
    await quiz.populate('createdBy', 'name email');

    res.status(201).json({ quiz, message: 'Quiz created successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit quiz answers
// @route   POST /api/quizzes/:id/submit
exports.submitQuiz = async (req, res, next) => {
  try {
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Check if quiz is active (students cannot submit to inactive quizzes)
    if (!quiz.isActive) {
      return res.status(403).json({ message: 'This quiz is currently inactive and cannot be submitted' });
    }

    // Check deadline
    if (quiz.deadline && new Date() > quiz.deadline) {
      return res.status(400).json({ message: 'Quiz deadline has passed' });
    }

    // Check if already submitted
    const existing = await QuizResult.findOne({
      quiz: quiz._id,
      student: req.user._id
    });

    if (existing) {
      return res.status(400).json({ message: 'You have already submitted this quiz' });
    }

    const { answers } = req.body;

    if (!answers || answers.length === 0) {
      return res.status(400).json({ message: 'Please provide answers' });
    }

    // Evaluate answers
    let totalScore = 0;
    let maxScore = 0;
    const evaluatedAnswers = quiz.questions.map((question) => {
      const points = question.points || 1;
      maxScore += points;
      const userAnswer = answers.find(a => a.questionId === question._id.toString());

      if (!userAnswer) {
        return {
          questionId: question._id,
          answer: '',
          isCorrect: false,
          pointsEarned: 0
        };
      }

      let isCorrect = false;
      let pointsEarned = 0;

      const questionType = question.type || 'mcq';
      if (questionType === 'mcq') {
        isCorrect = userAnswer.answer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
        pointsEarned = isCorrect ? points : 0;
      }
      // Descriptive answers are graded manually (pointsEarned stays 0)

      totalScore += pointsEarned;

      return {
        questionId: question._id,
        answer: userAnswer.answer,
        isCorrect,
        pointsEarned
      };
    });

    const result = await QuizResult.create({
      quiz: quiz._id,
      student: req.user._id,
      answers: evaluatedAnswers,
      totalScore,
      maxScore
    });

    res.status(201).json({
      result,
      message: 'Quiz submitted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get quiz results
// @route   GET /api/quizzes/:id/results
exports.getQuizResults = async (req, res, next) => {
  try {
    const quiz = await Quiz.findById(req.params.id)
      .populate('course', 'name code');

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Professors/admins can see all results; students see only their own
    let results;
    if (['professor', 'dept_admin', 'inst_admin', 'super_admin'].includes(req.user.role)) {
      results = await QuizResult.find({ quiz: req.params.id })
        .populate('student', 'name email enrollmentNumber')
        .sort({ totalScore: -1 });
    } else {
      results = await QuizResult.find({
        quiz: req.params.id,
        student: req.user._id
      });
    }

    res.json({ quiz: { title: quiz.title, course: quiz.course }, results });
  } catch (error) {
    next(error);
  }
};

// @desc    Update quiz
// @route   PUT /api/quizzes/:id
exports.updateQuiz = async (req, res, next) => {
  try {
    let quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    if (quiz.createdBy.toString() !== req.user._id.toString() &&
        !['dept_admin', 'inst_admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized to update this quiz' });
    }

    // Only allow updating safe fields — prevent changing createdBy, etc.
    const { title, questions, timeLimit, deadline, course, isActive } = req.body;
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (questions !== undefined) updateData.questions = questions;
    if (timeLimit !== undefined) updateData.timeLimit = timeLimit;
    if (deadline !== undefined) updateData.deadline = deadline ? new Date(deadline) : null;
    if (course !== undefined) updateData.course = course;
    if (isActive !== undefined) updateData.isActive = isActive;

    quiz = await Quiz.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true
    })
      .populate('course', 'name code')
      .populate('createdBy', 'name email');

    res.json({ quiz, message: 'Quiz updated successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete quiz
// @route   DELETE /api/quizzes/:id
exports.deleteQuiz = async (req, res, next) => {
  try {
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    if (quiz.createdBy.toString() !== req.user._id.toString() &&
        !['dept_admin', 'inst_admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized to delete this quiz' });
    }

    // Delete associated results
    await QuizResult.deleteMany({ quiz: quiz._id });
    await Quiz.findByIdAndDelete(req.params.id);

    res.json({ message: 'Quiz deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate quiz from lecture using AI
// @route   POST /api/quizzes/generate-from-lecture/:lectureId
// @access  Private (professors & admins)
exports.generateQuizFromLecture = async (req, res, next) => {
  try {
    const { lectureId } = req.params;
    const { questionCount = 5 } = req.body;

    // Validate input
    if (!lectureId) {
      return res.status(400).json({ message: 'Lecture ID is required' });
    }

    // Fetch lecture
    const lecture = await Lecture.findById(lectureId);
    if (!lecture) {
      return res.status(404).json({ message: 'Lecture not found' });
    }

    // Check if lecture has transcription
    if (!lecture.transcription || !lecture.transcription.text) {
      return res.status(400).json({ 
        message: 'Lecture does not have transcription. Please transcribe the lecture first.' 
      });
    }

    // Check if empty transcription
    if (lecture.transcription.text.trim().length === 0) {
      return res.status(400).json({ 
        message: 'Lecture transcription is empty. Cannot generate quiz from empty content.' 
      });
    }

    // Check if quiz already exists for this lecture (optional caching)
    const existingQuiz = await Quiz.findOne({ 
      sourceLecture: lectureId,
      aiGenerated: true 
    });

    if (existingQuiz) {
      return res.status(200).json({ 
        quiz: existingQuiz, 
        message: 'Quiz already generated for this lecture',
        cached: true
      });
    }

    // Call AI service to generate quiz
    let generatedQuestions;
    try {
      console.log(`[GenQuiz] Generating quiz from lecture: ${lecture.title}`);
      console.log(`[GenQuiz] Transcription length: ${lecture.transcription.text.length} characters`);
      
      const quizData = await aiQuizService.generateQuizFromLecture(
        lecture.transcription.text, 
        parseInt(questionCount) || 5
      );
      
      console.log(`[GenQuiz] Quiz data received, transforming to DB format...`);
      generatedQuestions = aiQuizService.transformToDBFormat(quizData, lecture.title);
      console.log(`[GenQuiz] Generated ${generatedQuestions.length} questions successfully`);
    } catch (aiError) {
      console.error('[GenQuiz] AI Service failed:', aiError.message);
      console.error('[GenQuiz] Stack:', aiError.stack);
      return res.status(500).json({ 
        message: 'Failed to generate quiz using AI',
        error: aiError.message,
        details: process.env.NODE_ENV === 'development' ? aiError.stack : undefined
      });
    }

    // Create quiz in database
    const quizTitle = `${lecture.title} - AI Generated Quiz`;
    
    const quiz = await Quiz.create({
      title: quizTitle,
      course: lecture.course,
      questions: generatedQuestions,
      timeLimit: 30,
      createdBy: req.user._id,
      aiGenerated: true,
      sourceLecture: lectureId,
      generatedAt: new Date()
    });

    // Populate references
    await quiz.populate('course', 'name code');
    await quiz.populate('createdBy', 'name email');
    await quiz.populate('sourceLecture', 'title');

    res.status(201).json({ 
      quiz, 
      message: 'Quiz generated successfully from lecture transcript',
      cached: false
    });
  } catch (error) {
    console.error('Generate Quiz Error:', error);
    next(error);
  }
};

// @desc    Delete quiz result (professor/admin only)
// @route   DELETE /api/quiz-results/:id
exports.deleteQuizResult = async (req, res, next) => {
  try {
    const result = await QuizResult.findById(req.params.id);

    if (!result) {
      return res.status(404).json({ message: 'Quiz result not found' });
    }

    // Check if user is the professor who created the quiz or an admin
    const quiz = await Quiz.findById(result.quiz);
    
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Only allow deletion by quiz creator or admins
    if (quiz.createdBy.toString() !== req.user._id.toString() && 
        !['dept_admin', 'inst_admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized to delete this result' });
    }

    await QuizResult.findByIdAndDelete(req.params.id);

    res.json({ message: 'Quiz result deleted successfully' });
  } catch (error) {
    next(error);
  }
};
