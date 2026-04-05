const Groq = require('groq-sdk');
const fs = require('fs');
const path = require('path');

/**
 * Transcription service using Groq Whisper Large V3 Turbo
 * Docs: https://console.groq.com/docs/model/whisper-large-v3-turbo
 */

// Initialize Groq client lazily (when first used) to ensure env vars are loaded
let groq = null;

const getGroqClient = () => {
  if (!groq) {
    const apiKey = process.env.GROQ_API_KEY?.trim();
    if (!apiKey) {
      throw new Error('GROQ_API_KEY is not configured. Add it to your .env file.');
    }
    groq = new Groq({ apiKey });
  }
  return groq;
};

// Supported audio/video extensions for transcription
const TRANSCRIBABLE_EXTENSIONS = ['.mp4', '.webm', '.mov', '.mp3', '.wav', '.ogg', '.m4a', '.flac', '.mpeg', '.mpga'];

/**
 * Check if a file is transcribable (audio or video)
 * @param {string} filename 
 * @returns {boolean}
 */
const isTranscribable = (filename) => {
  const ext = path.extname(filename).toLowerCase();
  return TRANSCRIBABLE_EXTENSIONS.includes(ext);
};

/**
 * Transcribe an audio/video file using Groq Whisper Large V3 Turbo
 * Supports multilingual audio - automatically detects language(s) in the audio
 * @param {string} filePath - Absolute path to the audio/video file
 * @returns {Promise<{text: string, segments: Array, language: string, duration: number}>}
 */
const transcribeFile = async (filePath) => {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not configured. Add it to your .env file.');
  }

  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  try {
    console.log(`[Groq] Starting transcription with Whisper Large V3 Turbo model`);
    console.log(`[Groq] File: ${filePath}`);
    console.log(`[Groq] File size: ${(fs.statSync(filePath).size / 1024 / 1024).toFixed(2)} MB`);
    
    // Use file stream for Groq API
    const fileStream = fs.createReadStream(filePath);
    
    console.log(`[Groq] Sending request to Groq API...`);
    console.log(`[Groq] GROQ_API_KEY configured: ${process.env.GROQ_API_KEY ? 'YES' : 'NO'}`);
    
    // Get the Groq client (lazy initialized)
    const groqClient = getGroqClient();
    
    // Use Groq's Whisper Large V3 Turbo for transcription with auto language detection
    const transcription = await groqClient.audio.transcriptions.create({
      file: fileStream,
      model: 'whisper-large-v3-turbo',
      response_format: 'verbose_json',
      temperature: 0.0
    });

    console.log(`[Groq] ✅ Transcription successful`);
    console.log(`[Groq] Text length: ${transcription.text.length} characters`);
    console.log(`[Groq] Detected language: ${transcription.language}`);

    return {
      text: transcription.text || '',
      segments: (transcription.segments || []).map(seg => ({
        start: seg.start,
        end: seg.end,
        text: seg.text
      })),
      language: transcription.language || 'unknown',
      duration: transcription.duration || 0
    };
  } catch (error) {
    console.error('[Groq] ❌ Transcription error:', error.message);
    console.error('[Groq] Error code:', error.code);
    console.error('[Groq] Error status:', error.status);
    console.error('[Groq] Full error:', error);
    
    // More helpful error messages for common issues
    let errorMsg = error.message;
    
    // Check for specific error conditions
    if (error.status === 401 || error.message.includes('401') || error.message.includes('Unauthorized')) {
      errorMsg = 'Groq API authentication failed - GROQ_API_KEY may be invalid or expired';
      console.error('[Groq] 🔑 Check: Is your GROQ_API_KEY valid?');
    } else if (error.status === 403 || error.message.includes('403') || error.message.includes('Forbidden')) {
      errorMsg = 'Groq API access denied - check your API key permissions';
      console.error('[Groq] 🔐 Check: Does your API key have transcription permissions?');
    } else if (error.status === 429 || error.message.includes('429') || error.message.includes('Rate limit')) {
      errorMsg = 'Groq API rate limit exceeded - please try again later';
      console.error('[Groq] ⏰ Check: Try again in a few moments');
    } else if (error.code === 'ECONNREFUSED' || error.message.includes('ECONNREFUSED') || error.message.includes('Connection refused')) {
      errorMsg = 'Connection error to Groq API - check your internet connection';
      console.error('[Groq] 🌐 Check: Is your internet connection working?');
    } else if (error.message.includes('timeout')) {
      errorMsg = 'Groq API request timeout - file may be too large or network is slow';
      console.error('[Groq] 📶 Check: Is your network connection stable? Try with a smaller file.');
    } else if (error.message.includes('ENOENT')) {
      errorMsg = 'File not found on disk';
      console.error('[Groq] 📁 Check: Verify the file path exists');
    }
    
    if (error.error) {
      console.error('[Groq] API Error details:', JSON.stringify(error.error, null, 2));
    }
    
    throw new Error(`Transcription failed: ${errorMsg}`);
  }
};

/**
 * Transcribe a lecture file and update the lecture document in DB
 * Runs asynchronously — caller should not await unless they need the result immediately
 * Supports multilingual audio with automatic language detection
 * @param {string} lectureId - Lecture MongoDB document ID
 * @param {string} fileAbsolutePath - Absolute path to the uploaded file
 */
/**
 * Transcribe a lecture file and update the lecture document in DB
 * Runs asynchronously — caller should not await unless they need the result immediately
 * Supports multilingual audio with automatic language detection
 * @param {string} lectureId - Lecture MongoDB document ID
 * @param {string} fileAbsolutePath - Absolute path to the uploaded file
 */
const transcribeLectureAsync = async (lectureId, fileAbsolutePath, retryCount = 0) => {
  const Lecture = require('../models/Lecture');
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 5000; // 5 seconds, increases exponentially

  try {
    console.log(`[Transcription] Starting transcription for lecture ${lectureId}`);
    console.log(`[Transcription] File path: ${fileAbsolutePath}`);
    
    // Verify file actually exists before proceeding
    if (!fs.existsSync(fileAbsolutePath)) {
      console.log(`[Transcription] ⚠️  File does not exist, skipping transcription (likely external URL lecture)`);
      
      // Mark as failed with informative message
      await Lecture.findByIdAndUpdate(lectureId, {
        'transcription.status': 'failed',
        'transcription.error': 'File is an external URL and cannot be transcribed locally'
      });
      return;
    }
    
    // Mark as processing
    await Lecture.findByIdAndUpdate(lectureId, {
      'transcription.status': 'processing',
      'transcription.error': null
    });

    const result = await transcribeFile(fileAbsolutePath);
    console.log(`[Transcription] File transcribed successfully, text length: ${result.text.length}`);

    // Call Gemini API to analyze the language percentages
    const { analyzeLanguage, analyzeSegmentsLanguage } = require('./languageAnalysisService');
    
    let languageAnalysis = null;
    try {
      console.log(`[Transcription] Analyzing language content...`);
      languageAnalysis = await analyzeLanguage(result.text);
      console.log(`[Transcription] Language analysis completed`);
    } catch (langErr) {
      console.error('[Transcription] Failed to analyze language:', langErr.message);
    }

    // Call Gemini API to analyze language for each segment
    let segmentsWithLanguage = result.segments;
    try {
      console.log(`[Transcription] Analyzing segment languages...`);
      segmentsWithLanguage = await analyzeSegmentsLanguage(result.segments);
      console.log(`[Transcription] Segment language analysis completed`);
    } catch (segErr) {
      console.error('[Transcription] Failed to analyze segment languages:', segErr.message);
    }

    const updateData = {
      'transcription.status': 'completed',
      'transcription.text': result.text,
      'transcription.segments': segmentsWithLanguage,
      'transcription.language': result.language,
      'transcription.duration': result.duration,
      'transcription.completedAt': new Date(),
      'transcription.error': null
    };

    if (languageAnalysis) {
      updateData.languageAnalysis = languageAnalysis;
    }

    // Save transcription and analysis to the lecture document
    await Lecture.findByIdAndUpdate(lectureId, updateData);

    // Create/Update LectureTranscript record and generate PDF
    try {
      const LectureTranscript = require('../models/LectureTranscript');
      const { generateTranscriptPDF } = require('./transcriptProcessingService');
      
      const lecture = await Lecture.findById(lectureId)
        .select('title course uploadedBy createdAt')
        .populate('course', 'name')
        .populate('uploadedBy', 'name');

      let lectureTranscript = await LectureTranscript.findOne({ lecture: lectureId });
      
      if (!lectureTranscript) {
        lectureTranscript = new LectureTranscript({
          lecture: lectureId,
          originalTranscript: {
            text: result.text,
            language: result.language,
            segments: segmentsWithLanguage
          },
          status: 'transcribed'
        });

        if (languageAnalysis) {
          lectureTranscript.languagePercentages = languageAnalysis;
        }

        await lectureTranscript.save();
      } else {
        lectureTranscript.originalTranscript = {
          text: result.text,
          language: result.language,
          segments: segmentsWithLanguage
        };
        lectureTranscript.status = 'transcribed';
        if (languageAnalysis) {
          lectureTranscript.languagePercentages = languageAnalysis;
        }
        await lectureTranscript.save();
      }

      // Generate PDF for original transcript
      try {
        const pdfResult = await generateTranscriptPDF(
          lecture.title,
          lecture.course.name,
          lecture.uploadedBy.name,
          new Date(lecture.createdAt).toLocaleDateString(),
          segmentsWithLanguage,
          result.language || 'English'
        );

        // Check if PDF entry already exists
        const pdfExists = lectureTranscript.pdfFiles.some(p => p.language === (result.language || 'English'));
        if (!pdfExists) {
          lectureTranscript.pdfFiles.push({
            language: result.language || 'English',
            path: pdfResult.path,
            filename: pdfResult.filename,
            isOriginal: true,
            generatedAt: new Date()
          });
          await lectureTranscript.save();
        }
        console.log(`[Transcription] ✅ PDF generated for original transcript`);
      } catch (pdfError) {
        console.error('[Transcription] PDF generation failed:', pdfError.message);
        // Continue without PDF - transcription already succeeded
      }
    } catch (transcriptError) {
      console.error('[Transcription] Failed to create LectureTranscript:', transcriptError.message);
      // Continue anyway - transcript is already saved in Lecture model
    }

    console.log(`[Transcription] ✅ Success! Transcription completed for lecture ${lectureId}`);
    return result;
  } catch (error) {
    console.error(`[Transcription] ❌ Failed for lecture ${lectureId}:`, error.message);
    console.error(`[Transcription] Error stack:`, error.stack);
    
    // Check if we should retry
    const isRetryable = error.message.includes('429') || 
                       error.message.includes('timeout') ||
                       error.message.includes('ECONNREFUSED') ||
                       error.code === 'ENOTFOUND';
    
    if (isRetryable && retryCount < MAX_RETRIES) {
      const delayMs = RETRY_DELAY * Math.pow(2, retryCount);
      console.log(`[Transcription] ⏳ Retrying in ${delayMs}ms (attempt ${retryCount + 1}/${MAX_RETRIES})...`);
      
      // Wait and retry
      await new Promise(resolve => setTimeout(resolve, delayMs));
      return transcribeLectureAsync(lectureId, fileAbsolutePath, retryCount + 1);
    }

    try {
      await Lecture.findByIdAndUpdate(lectureId, {
        'transcription.status': 'failed',
        'transcription.error': error.message
      });
    } catch (updateErr) {
      console.error(`[Transcription] Failed to update lecture with error:`, updateErr.message);
    }

    throw error;
  }
};

module.exports = {
  isTranscribable,
  transcribeFile,
  transcribeLectureAsync,
  TRANSCRIBABLE_EXTENSIONS
};
