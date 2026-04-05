const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

/**
 * Transcript Processing Service
 * Handles PDF generation, translation, and storage of lecture transcripts
 */

/**
 * Generate PDF from transcript with timestamps
 * @param {string} lectureTitle - Title of the lecture
 * @param {string} courseName - Name of the course
 * @param {string} professorName - Name of the professor
 * @param {string} lectureDate - Date of the lecture
 * @param {Array} segments - Transcript segments with timestamps
 * @param {string} language - Language of the transcript
 * @param {string} outputDir - Directory to save the PDF (default: uploads)
 * @returns {Promise<{filename: string, path: string}>}
 */
const generateTranscriptPDF = async (lectureTitle, courseName, professorName, lectureDate, segments, language = 'English', outputDir = null) => {
  return new Promise((resolve, reject) => {
    try {
      if (!outputDir) {
        outputDir = path.join(__dirname, '..', 'uploads');
      }

      // Create directory if it doesn't exist
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Generate filename with timestamp
      const filename = `transcript_${Date.now()}_${language.toLowerCase()}.pdf`;
      const filepath = path.join(outputDir, filename);

      // Create PDF document
      const doc = new PDFDocument({
        bufferPages: true,
        margin: 50
      });

      const stream = fs.createWriteStream(filepath);
      doc.pipe(stream);

      // Set font
      doc.font('Helvetica-Bold').fontSize(18).text(lectureTitle, { underline: true });
      doc.moveDown(0.5);

      // Header information
      doc.font('Helvetica').fontSize(11);
      doc.text(`Course: ${courseName}`);
      doc.text(`Professor: ${professorName}`);
      doc.text(`Date: ${lectureDate}`);
      doc.text(`Language: ${language}`);
      doc.text(`Generated: ${new Date().toLocaleString()}`);
      
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(1);

      // Transcript content
      doc.fontSize(10);
      segments.forEach((segment, index) => {
        const timeStr = formatTime(segment.start);
        const segmentText = `${timeStr}  ${segment.text}`;
        
        // Add segment with proper wrapping
        doc.text(segmentText, {
          width: 500,
          align: 'left',
          lineGap: 4
        });
        
        // Add some space between segments
        if ((index + 1) % 5 === 0) {
          doc.moveDown(0.3);
        }
      });

      doc.moveDown(1);
      doc.font('Helvetica').fontSize(9).text('------- End of Transcript -------', { align: 'center' });

      // Finalize PDF
      doc.end();

      stream.on('finish', () => {
        console.log(`[PDF] ✅ Transcript PDF generated: ${filename}`);
        resolve({
          filename,
          path: `/uploads/${filename}`
        });
      });

      stream.on('error', (err) => {
        console.error('[PDF] ❌ Error writing PDF:', err.message);
        reject(new Error(`Failed to generate PDF: ${err.message}`));
      });
    } catch (error) {
      console.error('[PDF] ❌ PDF generation error:', error.message);
      reject(error);
    }
  });
};

/**
 * Helper: Make Groq API request with exponential backoff retry
 * @param {Object} data - Request body
 * @param {number} retryCount - Current retry count
 * @returns {Promise<Object>}
 */
const groqRequestWithRetry = async (data, retryCount = 0) => {
  const MAX_RETRIES = 5;
  try {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      data,
      {
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
        },
        timeout: 60000
      }
    );
    return response;
  } catch (error) {
    const status = error.response?.status;
    const isRateLimited = status === 429;
    
    if (isRateLimited && retryCount < MAX_RETRIES) {
      const delayMs = Math.pow(2, retryCount) * 3000; // 3s, 6s, 12s, 24s, 48s
      console.log(`[Translation] Rate limited (429). Retrying in ${delayMs}ms... (attempt ${retryCount + 1}/${MAX_RETRIES})`);
      await new Promise(r => setTimeout(r, delayMs));
      return groqRequestWithRetry(data, retryCount + 1);
    }
    throw error;
  }
};

/**
 * Format time in seconds to HH:MM:SS format
 * @param {number} seconds
 * @returns {string}
 */
const formatTime = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  const pad = (num) => String(num).padStart(2, '0');
  
  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
  }
  return `${pad(minutes)}:${pad(secs)}`;
};

/**
 * Translate transcript text to target language using Groq
 * @param {string} text - Text to translate
 * @param {string} targetLanguage - Target language (English, Hindi, Gujarati)
 * @returns {Promise<string>}
 */
const translateTranscript = async (text, targetLanguage) => {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not configured');
  }

  if (targetLanguage === 'English') {
    return text; // No translation needed
  }

  const prompt = `You are a professional translator specializing in academic content. Translate the following lecture transcript to ${targetLanguage}.
Maintain the exact meaning and academic terminology.
Keep the translation natural and readable.
Do NOT add any explanations or notes.
Translate only the content, nothing else.

Transcript:
${text}`;

  try {
    console.log(`[Translation] Starting Groq translation to ${targetLanguage}...`);
    
    const response = await groqRequestWithRetry({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'You are a professional translator. Translate accurately and naturally.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 4096
    });

    const translatedText = response.data.choices[0].message.content;
    console.log(`[Translation] ✅ Groq translation to ${targetLanguage} completed`);
    return translatedText;
  } catch (error) {
    console.error(`[Translation] ❌ Groq translation error: ${error.message}`);
    
    if (error.response?.status === 401 || error.response?.status === 403) {
      throw new Error(`Authentication failed with Groq API. Check your GROQ_API_KEY.`);
    } else if (error.response?.status === 429) {
      throw new Error(`Groq API rate limit exceeded. Your quota may be exhausted. Try again in a few minutes.`);
    }
    
    throw new Error(`Translation failed: ${error.message}`);
  }
};

/**
 * Translate transcript segments to target language using Groq with retry logic
 * @param {Array} segments - Array of segments with text and timestamps
 * @param {string} targetLanguage - Target language
 * @returns {Promise<Array>}
 */
const translateSegments = async (segments, targetLanguage) => {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not configured');
  }

  if (targetLanguage === 'English') {
    return segments; // No translation needed
  }

  const BATCH_SIZE = 5; // Reduced to avoid rate limits
  const translatedSegments = [];
  const BATCH_DELAY = 2000; // 2 second delay between batches

  try {
    for (let i = 0; i < segments.length; i += BATCH_SIZE) {
      const batch = segments.slice(i, i + BATCH_SIZE);
      const batchText = batch.map((seg, idx) => `${idx + 1}. ${seg.text}`).join('\n');

      const prompt = `Translate each of these segment texts to ${targetLanguage}.
Keep translations natural and maintain academic terminology.
Return ONLY the translations as a numbered list (1. translation\n2. translation\n...)
Do NOT include explanations, notes, or anything else.

Segments:
${batchText}`;

      console.log(`[Translation] Sending batch ${Math.floor(i / BATCH_SIZE) + 1} to Groq (${batch.length} segments)`);

      const response = await groqRequestWithRetry({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'You are a professional translator. Translate accurately and naturally. Return only the numbered list of translations.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 2048
      });

      const translationsText = response.data.choices[0].message.content;
      
      console.log(`[Translation] Groq response received, parsing...`);

      // Parse numbered list - more robust parsing
      const lines = translationsText.split('\n').filter(line => line.trim());
      const translations = [];
      
      for (const line of lines) {
        const match = line.match(/^\d+\.\s*(.+)$/);
        if (match) {
          translations.push(match[1].trim());
        }
      }

      console.log(`[Translation] Parsed ${translations.length} translations from Groq response`);

      // Match translations to segments
      batch.forEach((seg, idx) => {
        const translation = translations[idx] || seg.text;
        
        translatedSegments.push({
          start: seg.start,
          end: seg.end,
          text: translation
        });
      });

      console.log(`[Translation] ✅ Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(segments.length / BATCH_SIZE)} completed for ${targetLanguage}`);

      // Add delay between batches to avoid rate limits
      if (i + BATCH_SIZE < segments.length) {
        console.log(`[Translation] Waiting ${BATCH_DELAY}ms before next batch...`);
        await new Promise(r => setTimeout(r, BATCH_DELAY));
      }
    }

    console.log(`[Translation] ✅ All ${translatedSegments.length} segments translated to ${targetLanguage}`);
    return translatedSegments;
  } catch (error) {
    console.error(`[Translation] ❌ Groq segment translation error: ${error.message}`);
    
    if (error.response?.status === 401 || error.response?.status === 403) {
      throw new Error(`Authentication failed with Groq API. Check your GROQ_API_KEY.`);
    } else if (error.response?.status === 429) {
      throw new Error(`Groq API rate limit exceeded. Your quota may be exhausted. Try again in a few minutes.`);
    }
    
    throw error;
  }
};

module.exports = {
  generateTranscriptPDF,
  translateTranscript,
  translateSegments,
  formatTime
};
