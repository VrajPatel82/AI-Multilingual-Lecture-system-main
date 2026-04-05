const LectureTranscript = require('../models/LectureTranscript');
const Lecture = require('../models/Lecture');
const User = require('../models/User');
const { generateTranscriptPDF, translateTranscript, translateSegments } = require('../services/transcriptProcessingService');
const fs = require('fs');
const path = require('path');

/**
 * Get transcript with optional translation
 * @route GET /api/transcripts/:lectureId
 */
exports.getTranscript = async (req, res, next) => {
  try {
    const { lectureId } = req.params;
    const { language } = req.query;

    const transcript = await LectureTranscript.findOne({ lecture: lectureId });
    if (!transcript) {
      return res.status(404).json({ message: 'Transcript not found for this lecture' });
    }

    const lecture = await Lecture.findById(lectureId)
      .select('title')
      .populate('course', 'name')
      .populate('uploadedBy', 'name');

    if (!lecture) {
      return res.status(404).json({ message: 'Lecture not found' });
    }

    // Get student's preferred language if not specified
    let targetLanguage = language || 'English';
    if (req.user && req.user.role === 'student' && !language) {
      const student = await User.findById(req.user._id).select('preferredLanguage');
      targetLanguage = student?.preferredLanguage || 'English';
      console.log(`[Transcript] Student ${req.user._id} preferred language: ${targetLanguage}`);
    }

    // Build response with segments in target language
    const response = {
      lectureId,
      title: lecture.title,
      course: lecture.course?.name,
      professor: lecture.uploadedBy?.name,
      originalLanguage: transcript.originalTranscript?.language,
      currentLanguage: targetLanguage,
      segments: [],
      languagePercentages: transcript.languagePercentages,
      translationStatus: transcript.status
    };

    console.log(`[Transcript] Original language: ${transcript.originalTranscript?.language}, Target: ${targetLanguage}`);

    // Determine which segments to use based on target language
    if (targetLanguage === 'English' || targetLanguage === transcript.originalTranscript?.language) {
      // Use original segments
      console.log(`[Transcript] Using original segments (target same as original)`);
      response.segments = transcript.originalTranscript?.segments || [];
    } else {
      // Look for translation
      let translation = transcript.translations.find(t => t.language === targetLanguage);
      console.log(`[Transcript] Existing translation found: ${!!translation}`);
      
      if (!translation) {
        // Translation doesn't exist - translate it now
        try {
          console.log(`[Transcript] ⏳ Auto-translating ${transcript.originalTranscript?.language} → ${targetLanguage} for user`);
          
          const translatedSegments = await translateSegments(
            transcript.originalTranscript.segments,
            targetLanguage
          );
          
          console.log(`[Transcript] ✅ Translation completed. Got ${translatedSegments.length} segments`);
          
          // Save the new translation
          transcript.translations.push({
            language: targetLanguage,
            text: translatedSegments.map(s => s.text).join(' '),
            segments: translatedSegments,
            translatedAt: new Date()
          });
          await transcript.save();
          console.log(`[Transcript] 💾 Translation saved to database`);
          
          translation = { segments: translatedSegments, translatedAt: new Date() };
        } catch (err) {
          console.error(`[Transcript] ❌ Auto-translation FAILED:`, err.message);
          console.error(err);
        }
      }
      
      if (translation && translation.segments && translation.segments.length > 0) {
        console.log(`[Transcript] ✅ Returning ${translation.segments.length} translated segments in ${targetLanguage}`);
        response.segments = translation.segments;
        response.translatedAt = translation.translatedAt;
      } else {
        // Fallback to original if translation failed
        console.log(`[Transcript] ⚠️ Translation failed or empty, falling back to original`);
        response.segments = transcript.originalTranscript?.segments || [];
      }
    }

    // Get available PDFs
    response.pdfFiles = transcript.pdfFiles.map(pdf => ({
      language: pdf.language,
      downloadUrl: `/api/transcripts/${lectureId}/pdf/${pdf.language}`,
      generatedAt: pdf.generatedAt
    }));

    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Translate transcript to a specific language
 * @route POST /api/transcripts/:lectureId/translate
 */
exports.translateTranscript = async (req, res, next) => {
  try {
    const { lectureId } = req.params;
    const { targetLanguage } = req.body;

    if (!['English', 'Hindi', 'Gujarati'].includes(targetLanguage)) {
      return res.status(400).json({ message: 'Invalid target language' });
    }

    let transcript = await LectureTranscript.findOne({ lecture: lectureId });
    if (!transcript) {
      return res.status(404).json({ message: 'Transcript not found' });
    }

    // Check if translation already exists
    const existingTranslation = transcript.translations.find(t => t.language === targetLanguage);
    if (existingTranslation) {
      return res.json({
        message: 'Translation already exists',
        translation: existingTranslation
      });
    }

    if (targetLanguage === 'English') {
      return res.json({
        message: 'Original transcript is already in English',
        translation: {
          language: 'English',
          text: transcript.originalTranscript.text,
          segments: transcript.originalTranscript.segments
        }
      });
    }

    // Get lecture details for PDF generation
    const lecture = await Lecture.findById(lectureId)
      .select('title createdAt')
      .populate('course', 'name')
      .populate('uploadedBy', 'name');

    if (!lecture) {
      return res.status(404).json({ message: 'Lecture not found' });
    }

    // Generate PDF for original transcript if not already done
    try {
      const hasOriginalPDF = transcript.pdfFiles.find(p => p.isOriginal && p.language === 'English');
      if (!hasOriginalPDF) {
        console.log('[Transcript] Generating PDF for original transcript...');
        const originalPdfResult = await generateTranscriptPDF(
          lecture.title,
          lecture.course.name,
          lecture.uploadedBy.name,
          new Date(lecture.createdAt).toLocaleDateString(),
          transcript.originalTranscript.segments,
          'English'
        );

        transcript.pdfFiles.push({
          language: 'English',
          path: originalPdfResult.path,
          filename: originalPdfResult.filename,
          isOriginal: true,
          generatedAt: new Date()
        });

        console.log('[Transcript] ✅ Original PDF generated and saved');
      }
    } catch (pdfError) {
      console.error('[Transcript] Original PDF generation failed:', pdfError.message);
    }

    // Translate full text using Gemini
    console.log(`[Transcript] Starting translation of full text to ${targetLanguage}...`);
    let translatedText;
    try {
      translatedText = await translateTranscript(
        transcript.originalTranscript.text,
        targetLanguage
      );
      console.log(`[Transcript] ✅ Full text translated to ${targetLanguage}`);
    } catch (translateError) {
      console.error(`[Transcript] ❌ Translation failed:`, translateError.message);
      return res.status(500).json({ 
        message: `Translation failed: ${translateError.message}`,
        error: translateError.message
      });
    }

    // Translate segments using Gemini
    console.log(`[Transcript] Starting segment translation to ${targetLanguage}...`);
    let translatedSegments;
    try {
      translatedSegments = await translateSegments(
        transcript.originalTranscript.segments,
        targetLanguage
      );
      console.log(`[Transcript] ✅ ${translatedSegments.length} segments translated to ${targetLanguage}`);
    } catch (segmentError) {
      console.error(`[Transcript] ❌ Segment translation failed:`, segmentError.message);
      return res.status(500).json({ 
        message: `Segment translation failed: ${segmentError.message}`,
        error: segmentError.message
      });
    }

    // Save translation
    console.log(`[Transcript] Saving translation to database...`);
    transcript.translations.push({
      language: targetLanguage,
      text: translatedText,
      segments: translatedSegments,
      translatedAt: new Date()
    });

    transcript.status = 'translated';
    await transcript.save();
    console.log(`[Transcript] ✅ Translation saved to database`);

    // Generate PDF for translated transcript
    try {
      console.log(`[Transcript] Generating PDF for ${targetLanguage} translation...`);
      const pdfResult = await generateTranscriptPDF(
        lecture.title,
        lecture.course.name,
        lecture.uploadedBy.name,
        new Date(lecture.createdAt).toLocaleDateString(),
        translatedSegments,
        targetLanguage
      );

      transcript.pdfFiles.push({
        language: targetLanguage,
        path: pdfResult.path,
        filename: pdfResult.filename,
        isOriginal: false,
        generatedAt: new Date()
      });

      await transcript.save();
      console.log(`[Transcript] ✅ ${targetLanguage} PDF generated and saved`);
    } catch (pdfError) {
      console.error('[Transcript] Translated PDF generation failed:', pdfError.message);
      // Continue without PDF - translation still succeeded
    }

    res.json({
      message: 'Translation completed successfully',
      translation: {
        language: targetLanguage,
        text: translatedText,
        segments: translatedSegments,
        translatedAt: new Date()
      },
      pdfGenerated: true,
      downloadUrl: `/api/transcripts/${lectureId}/pdf/${targetLanguage}`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Download transcript PDF
 * @route GET /api/transcripts/:lectureId/pdf/:language
 */
exports.downloadTranscriptPDF = async (req, res, next) => {
  try {
    const { lectureId, language } = req.params;

    const transcript = await LectureTranscript.findOne({ lecture: lectureId });
    if (!transcript) {
      return res.status(404).json({ message: 'Transcript not found' });
    }

    const pdfFile = transcript.pdfFiles.find(p => p.language === language);
    if (!pdfFile) {
      return res.status(404).json({ message: `PDF not available for ${language}` });
    }

    const filepath = path.join(__dirname, '..', pdfFile.path);
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ message: 'PDF file not found on server' });
    }

    res.download(filepath, `transcript_${language}.pdf`);
  } catch (error) {
    next(error);
  }
};

/**
 * Get available languages for a transcript
 * @route GET /api/transcripts/:lectureId/languages
 */
exports.getAvailableLanguages = async (req, res, next) => {
  try {
    const { lectureId } = req.params;

    const transcript = await LectureTranscript.findOne({ lecture: lectureId });
    if (!transcript) {
      return res.status(404).json({ message: 'Transcript not found' });
    }

    const languages = [
      {
        name: 'English',
        available: true,
        translated: false,
        isOriginal: true
      },
      ...transcript.translations.map(t => ({
        name: t.language,
        available: true,
        translated: true,
        translatedAt: t.translatedAt
      }))
    ];

    const availableLanguages = ['English', 'Hindi', 'Gujarati'].map(lang => {
      const existing = languages.find(l => l.name === lang);
      return existing || {
        name: lang,
        available: true,  // Always available
        translated: false
      };
    });

    res.json({
      lectureId,
      languages: availableLanguages,
      originalLanguage: transcript.originalTranscript?.language,
      status: transcript.status
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update student preferred language
 * @route PUT /api/transcripts/student/preferred-language
 */
exports.updatePreferredLanguage = async (req, res, next) => {
  try {
    const { preferredLanguage } = req.body;

    if (!['English', 'Hindi', 'Gujarati'].includes(preferredLanguage)) {
      return res.status(400).json({ message: 'Invalid language' });
    }

    const student = await User.findByIdAndUpdate(
      req.user._id,
      { preferredLanguage },
      { new: true }
    ).select('preferredLanguage name email');

    res.json({
      message: 'Preferred language updated',
      preferredLanguage: student.preferredLanguage
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get student preferred language
 * @route GET /api/transcripts/student/preferred-language
 */
exports.getPreferredLanguage = async (req, res, next) => {
  try {
    const student = await User.findById(req.user._id).select('preferredLanguage');
    res.json({
      preferredLanguage: student?.preferredLanguage || 'English'
    });
  } catch (error) {
    next(error);
  }
};
