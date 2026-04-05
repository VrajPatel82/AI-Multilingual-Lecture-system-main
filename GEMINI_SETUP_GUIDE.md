# Gemini Translation & PDF Timestamps Setup Guide

## Quick Start (5 minutes)

### 1. Get Your Gemini API Key

```
1. Open: https://aistudio.google.com/app/apikeys
2. Sign in with your Google account
3. Click "Create API Key"  
4. Copy the generated key
```

### 2. Update Environment Configuration

Navigate to `/backend` directory and create or update `.env`:

```bash
cd backend
```

Add/update this line in `.env`:

```env
GEMINI_API_KEY=your_api_key_here_paste_full_key
```

**Example (.env file):**
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/lecture_system
JWT_SECRET=your_secret_key_here
JWT_EXPIRE=24h
FRONTEND_URL=http://localhost:5173
REDIS_URL=redis://localhost:6379
GEMINI_API_KEY=AIzaSyD1234567890abcdefghijklmnop  # <- Your key here
API_URL=http://localhost:5000
```

### 3. Verify Backend Dependencies

```bash
cd backend
npm install
```

Ensure `@google/generative-ai` is installed. Check `package.json`:

```json
{
  "dependencies": {
    "@google/generative-ai": "^0.24.1",
    ...other packages
  }
}
```

If not present, install it:

```bash
npm install @google/generative-ai
```

### 4. Start the Server

```bash
# In backend directory
npm run dev
```

You should see console output like:
```
[Translation] ✅ Gemini translation to Hindi completed
[PDF] ✅ Transcript PDF generated: transcript_1704956400000.pdf
```

### 5. Test the Feature

1. **Upload a lecture** with audio/video
2. **Wait for transcription** to complete (30-60 seconds)
3. **Navigate to transcript** section
4. **Select a language** (Hindi, Gujarati, Spanish)
5. **Wait for translation** (30-120 seconds depending on length)
6. **See** translated text displayed with timestamps
7. **Download PDFs** - Both original and translated versions

## Architecture Overview

```
Frontend (React)
    ↓
TranscriptViewer Component
    ↓
API Calls
    ↓
Backend Express Server
    ↓
Gemini API ←→ Translation Service
    ↓
PDF Generation Service
    ↓
MongoDB (Storage)
    + /backend/uploads/ (PDF Files)
```

## File Changes Made

### Backend Services
**File:** `/backend/services/transcriptProcessingService.js`
- ✅ Updated to use Google Generative AI (Gemini)
- ✅ Added PDF generation with timestamps
- ✅ Batch processing for segments

### Backend Controllers
**File:** `/backend/controllers/transcriptController.js`
- ✅ Enhanced `translateTranscript()` to generate PDFs
- ✅ Auto-generate original PDF on first translation
- ✅ Return PDF download URLs in response

### Frontend Components
**File:** `/frontend/src/components/shared/TranscriptViewer.jsx`
- ✅ Added PDF download buttons
- ✅ Display translated text with timestamps
- ✅ Show translation status
- ✅ Enhanced UI with language indicators

## Feature Flow

### Step 1: Student Views Transcript
```
→ GET /api/transcripts/:lectureId
← Returns segments with current language
```

### Step 2: Student Selects Different Language
```
→ POST /api/transcripts/:lectureId/translate
  {"targetLanguage": "Hindi"}

Process:
1. Load original transcript segments
2. Generate Original English PDF (if not exists)
3. Call Gemini API to translate full text
4. Call Gemini API to translate segments in batches
5. Save translation to database
6. Generate Hindi PDF with timestamps
7. Save PDF reference to database

← Returns:
{
  "message": "Translation completed successfully",
  "translation": {
    "language": "Hindi",
    "segments": [...translated segments with timestamps...],
    "translatedAt": "2024-01-15T10:30:00Z"
  },
  "pdfGenerated": true,
  "downloadUrl": "/api/transcripts/LECTURE_ID/pdf/Hindi"
}
```

### Step 3: Student Downloads PDF
```
→ GET /api/transcripts/:lectureId/pdf/Hindi
← PDF file with name: transcript_<timestamp>_Hindi.pdf
```

## PDF Format Example

```
═══════════════════════════════════════════════════════════════
                    LECTURE TRANSCRIPT
═══════════════════════════════════════════════════════════════

Course: Advanced Data Structures
Professor: Dr. Smith
Date: 1/15/2024
Language: Hindi
Generated: 1/15/2024, 10:30:45 AM

───────────────────────────────────────────────────────────────

00:00   नमस्ते और FindMedia Engineering में आपका स्वागत है

00:02   आज हम एक specific example लेंगे DFA की length based example है

00:05   यह उदाहरण दर्शाता है कि language कैसे define की जाती है

00:08   कि language is defined in such a way that

00:11   set of all the strings whose length is at least 2

00:15   निर्दिष्ट length, जिन सभी strings, जो भी strings हैं

00:19   जो किसी language को belong करते हैं, को

───────────────────────────────────────────────────────────────
------- End of Transcript -------
```

## Environment Validation

Before running, verify your setup:

```bash
# Check Node.js version
node --version  # Should be v14 or higher

# Check npm
npm --version   # Should be v6 or higher

# Verify .env file exists
ls -la backend/.env

# Check Gemini API key is set
grep GEMINI_API_KEY backend/.env

# Verify dependencies installed
npm list @google/generative-ai
```

## Troubleshooting

### Issue 1: "GEMINI_API_KEY is not configured"

**Cause:** Missing or empty API key in .env

**Solution:**
```bash
1. Check .env file exists:
   cat backend/.env | grep GEMINI_API_KEY

2. Ensure no empty value:
   # ❌ Wrong
   GEMINI_API_KEY=
   
   # ❌ Wrong  
   GEMINI_API_KEY=""
   
   # ✅ Correct
   GEMINI_API_KEY=AIzaSyD...full_key_here

3. Restart server after updating .env
```

### Issue 2: "403 Forbidden" Translation Error

**Cause:** Invalid API key or API not enabled

**Solution:**
```
1. Verify API key at: https://aistudio.google.com/app/apikeys
2. Ensure key is valid and not expired
3. Check Google Cloud Console has Generative Language API enabled
4. Try regenerating the API key
```

### Issue 3: Translation Takes Too Long

**Cause:** Large transcript or network latency

**Solution:**
```
- Short transcripts: 30-45 seconds expected
- Medium transcripts: 45-90 seconds expected  
- Long transcripts: 90-120+ seconds expected

If consistently slower:
1. Reduce BATCH_SIZE in transcriptProcessingService.js
2. Check network connectivity
3. Monitor Gemini API status
```

### Issue 4: PDF Not Downloading

**Cause:** File system or path issues

**Solution:**
```bash
1. Check uploads directory exists:
   ls -la backend/uploads/

2. Create if missing:
   mkdir -p backend/uploads

3. Check permissions:
   chmod 755 backend/uploads

4. Delete stuck PDFs and regenerate:
   rm backend/uploads/transcript_*.pdf
```

### Issue 5: Frontend Shows Old Transcript After Translation

**Cause:** Browser cache

**Solution:**
```javascript
# In browser console:
localStorage.clear()
sessionStorage.clear()

# Or hard refresh:
Ctrl+Shift+R (Windows/Linux)
Cmd+Shift+R (Mac)
```

## API Request/Response Examples

### Get Transcript
```bash
curl -X GET http://localhost:5000/api/transcripts/LECTURE_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "lectureId": "123abc",
  "title": "DFA Example",
  "course": "Advanced Data Structures",
  "professor": "Dr. Smith",
  "currentLanguage": "English",
  "segments": [
    {
      "start": 0,
      "end": 5,
      "text": "Hello and welcome to FindMedia Engineering"
    }
  ],
  "pdfFiles": [
    {
      "language": "English",
      "downloadUrl": "/api/transcripts/123abc/pdf/English",
      "generatedAt": "2024-01-15T10:00:00Z"
    }
  ]
}
```

### Translate Transcript to Hindi
```bash
curl -X POST http://localhost:5000/api/transcripts/LECTURE_ID/translate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"targetLanguage":"Hindi"}'
```

**Response:**
```json
{
  "message": "Translation completed successfully",
  "translation": {
    "language": "Hindi",
    "text": "नमस्ते और FindMedia Engineering में आपका स्वागत है...",
    "segments": [
      {
        "start": 0,
        "end": 5,
        "text": "नमस्ते और FindMedia Engineering में आपका स्वागत है"
      }
    ],
    "translatedAt": "2024-01-15T10:30:00Z"
  },
  "pdfGenerated": true,
  "downloadUrl": "/api/transcripts/LECTURE_ID/pdf/Hindi"
}
```

### Download PDF
```bash
curl -X GET http://localhost:5000/api/transcripts/LECTURE_ID/pdf/Hindi \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  --output transcript_timestamp_Hindi.pdf
```

## Performance Optimization

### Reduce Translation Time

**Option 1:** Smaller batch size
```javascript
// In transcriptProcessingService.js
const BATCH_SIZE = 5;  // Default: 10, reduce for faster but multiple calls
```

**Option 2:** Parallel processing (advanced)
```javascript
// Use Promise.all() for concurrent API calls
// But respect rate limits!
```

### Reduce PDF Generation Time

Currently PDFs generate serially. To optimize:
```javascript
// Generate both original and translated PDFs in parallel
// See transcriptController.js translateTranscript function
```

## Next Steps

1. ✅ Setup Gemini API key
2. ✅ Update .env file  
3. ✅ Restart backend server
4. ✅ Test with a sample transcript
5. 📊 Monitor translation performance
6. 🔍 Check MongoDB for stored PDFs
7. 📥 Verify PDF downloads work
8. 🚀 Deploy to production

## For Production Deployment

### Security Checklist
- [ ] Gemini API key stored securely (never in version control)
- [ ] Use environment variable management system
- [ ] Enable API key restrictions (IP, domain, referrer)
- [ ] Regular API key rotation schedule
- [ ] Monitor API usage and costs
- [ ] Implement rate limiting
- [ ] Use HTTPS for all requests
- [ ] Backup PDF storage system

### Scalability Considerations
- [ ] Implement caching for frequent translations
- [ ] Use CDN for PDF delivery
- [ ] Setup worker queues for background processing
- [ ] Monitor API quota and usage
- [ ] Implement pagination for long transcripts
- [ ] Consider compression for stored PDFs

## Support & Resources

- **Gemini API Documentation:** https://ai.google.dev/
- **API Console:** https://console.cloud.google.com/
- **GitHub Issues:** Check project repository
- **Logs:** Run `npm run dev` and watch console output

## Rollback Instructions

If Gemini integration causes issues and you need to rollback:

```bash
# Restore from git
git checkout backend/services/transcriptProcessingService.js
git checkout backend/controllers/transcriptController.js

# Or manually restore Groq version from backup
# Edit .env to use GROQ_API_KEY instead
```

---

**Last Updated:** January 15, 2024
**Version:** 2.0 (Gemini Integration)
