# Student Portal Lecture Transcript Feature

## Overview

This feature enables students to:
1. **View lecture transcripts** with precise timestamps
2. **Translate transcripts** into their preferred language
3. **Download transcripts** as PDF files (original and translated)
4. **Set language preferences** for automatic translations
5. **View language distribution** analysis for multilingual lectures

## Features Implemented

### 1. Database Models

#### LectureTranscript Model (`/backend/models/LectureTranscript.js`)
Stores comprehensive transcript data:
- Original transcript with segments and timestamps
- Multiple language translations
- PDF file references
- Language analysis percentages
- Translation status tracking

#### User Model (Updated)
Added `preferredLanguage` field with options:
- English
- Hindi
- Gujarati
- Spanish

### 2. Backend Services

#### Transcript Processing Service (`/backend/services/transcriptProcessingService.js`)
Core service functions:
- **generateTranscriptPDF()** - Generate PDF with timestamps and formatting
- **translateTranscript()** - Translate full transcript text using Gemini API
- **translateSegments()** - Translate individual segments maintaining timestamps
- **formatTime()** - Convert seconds to HH:MM:SS format

Features:
- PDF includes lecture title, course, professor, date
- Clean, readable formatting with proper spacing
- Timestamp preservation during translation
- Batch processing for segment translation (max 20 per batch)
- Error handling and fallback mechanisms

#### Transcription Service (Updated)
Enhanced to automatically:
1. Create LectureTranscript record after transcription
2. Generate PDF for original transcript
3. Store transcript metadata and language analysis

### 3. Backend Controllers

#### Transcript Controller (`/backend/controllers/transcriptController.js`)

**Endpoints:**

```
GET  /api/transcripts/:lectureId
     - Get transcript with optional language parameter
     - Auto-detects student's preferred language if not specified
     - Returns segments, language analysis, PDF links

POST /api/transcripts/:lectureId/translate
     - Request translation to specific language
     - Translates full text and segments
     - Generates PDF for translated version
     - Returns: translated text, segments, PDF link

GET  /api/transcripts/:lectureId/languages
     - Get all available language options
     - Shows which languages have translations
     - Returns translation status

GET  /api/transcripts/:lectureId/pdf/:language
     - Download transcript PDF in specific language
     - Returns PDF file as attachment

GET  /api/transcripts/student/preferred-language
     - Get current student's preferred language

PUT  /api/transcripts/student/preferred-language
     - Update student's preferred language
     - Requires: { preferredLanguage: string }
```

### 4. Frontend Components

#### TranscriptViewer Component (`/frontend/src/components/shared/TranscriptViewer.jsx`)
Features:
- **Language Selection** - Switch between available languages
- **Auto-Translation** - Automatically translate to selected language
- **PDF Downloads** - Download original or translated PDFs
- **Language Distribution** - Show progress bars for language percentages
- **Timestamp Sync** - Highlight current segment (with video integration)
- **Responsive Design** - Works on mobile and desktop
- **Loading States** - Proper feedback during translation
- **Error Handling** - Clear error messages and retry options

#### StudentLanguageSettings Component (`/frontend/src/components/shared/StudentLanguageSettings.jsx`)
Features:
- **Language Selection Grid** - Easy visual selection
- **Save Preference** - Persist student's choice
- **Auto-Application** - New transcripts use this preference
- **Success Feedback** - Clear confirmation messages
- **Unsaved Changes** - Save button only enabled when changed

### 5. API Routes

New route file: `/backend/routes/transcripts.js`
- Integrated into main `/api/transcripts` endpoint in server.js
- Protected by authentication middleware
- Role-based access control where applicable

### 6. Dependencies Added

**Backend:**
- `pdfkit` (^0.13.0) - PDF generation library

## Usage Flow

### For Students

#### 1. View Lecture Transcript

```
1. Navigate to lecture detail page
2. Scroll to "Transcript" section
3. TranscriptViewer component displays:
   - Original lecture transcript
   - Available languages
   - Current language (default: English or preferred language)
```

#### 2. Translate Transcript

```
1. In TranscriptViewer, click desired language button
2. If not yet translated:
   - Click triggers POST /api/transcripts/:lectureId/translate
   - System translates full text and segments
   - Generates PDF
   - Takes 30-60 seconds depending on length
3. Transcript updates with translation
4. PDF becomes available for download
```

#### 3. Set Language Preference

```
1. Go to Student Profile Settings
2. Find "Transcript Preferences" section
3. Click preferred language button
4. Click "Save Preference"
5. All future transcripts automatically show in this language
```

#### 4. Download Transcript

```
1. In TranscriptViewer, click "📥 Download [Language] PDF"
2. PDF downloads with:
   - Lecture title, course, professor
   - Original creation date
   - All segments with timestamps
   - Proper formatting and spacing
```

### For Professors/Admins

#### 1. Automatic Transcript Generation

```
1. Upload audio/video file to lecture
2. System automatically:
   - Transcribes using Groq API
   - Creates LectureTranscript record
   - Generates original language PDF
   - Detects language distribution
```

#### 2. Monitor Transcription Status

```
View transcription.status values:
- "none" - Not applicable
- "processing" - Currently transcribing
- "completed" - Transcription successful
- "failed" - Check error message
```

## Database Schema

### LectureTranscript Collection
```javascript
{
  lecture: ObjectId,              // Reference to Lecture
  originalTranscript: {
    text: String,                 // Full transcript text
    language: String,             // Detected language (Hindi, English, etc)
    segments: [
      {
        start: Number,            // Start time in seconds
        end: Number,              // End time in seconds
        text: String,             // Segment text
        language: String          // Language of segment
      }
    ]
  },
  translations: [
    {
      language: String,           // English, Hindi, Gujarati, Spanish
      text: String,               // Translated full text
      segments: [
        {
          start: Number,          // Timestamps PRESERVED
          end: Number,
          text: String            // Translated text
        }
      ],
      translatedAt: Date
    }
  ],
  pdfFiles: [
    {
      language: String,
      path: String,               // /uploads/transcript_*.pdf
      filename: String,
      isOriginal: Boolean,
      generatedAt: Date
    }
  ],
  languagePercentages: {
    English: Number,              // 0-100
    Hindi: Number,
    Gujarati: Number,
    Other: Number
  },
  status: String,                 // pending, transcribed, translated, completed
  createdAt: Date,
  updatedAt: Date
}
```

### User Collection (Updated)
```javascript
{
  // ... existing fields ...
  preferredLanguage: {
    type: String,
    enum: ['English', 'Hindi', 'Gujarati', 'Spanish'],
    default: 'English'
  }
}
```

## Configuration

### Environment Variables
Ensure your `.env` file has:
```env
GEMINI_API_KEY=<your-key>    # For translations
GROQ_API_KEY=<your-key>      # For transcription
```

### Supported Languages
- English
- Hindi
- Gujarati
- Spanish

To add more languages:
1. Update enum in LectureTranscript model
2. Update enum in User model
3. Update language arrays in frontend components
4. Test translation with new language

## Integration Instructions

### 1. Frontend Integration

Add TranscriptViewer to lecture detail page:
```jsx
import TranscriptViewer from '@/components/shared/TranscriptViewer';

// In your Lecture page component:
<TranscriptViewer />

// Or if you have a tabbed interface:
<Tabs>
  <Tab label="Transcript">
    <TranscriptViewer />
  </Tab>
</Tabs>
```

Add StudentLanguageSettings to student profile:
```jsx
import StudentLanguageSettings from '@/components/shared/StudentLanguageSettings';

// In your Profile or Settings page:
<StudentLanguageSettings 
  onSuccess={(language) => console.log('Updated to:', language)}
/>
```

### 2. Backend Integration

The backend is already integrated:
- Routes registered in `server.js`
- Controllers ready to handle requests
- Services initialized automatically

Just restart the server:
```bash
cd backend
npm run dev
```

## Error Handling

### Common Issues

**"GEMINI_API_KEY is not configured"**
- Solution: Add valid Gemini API key to `.env`
- Get key: https://aistudio.google.com/app/apikeys

**"Translation failed: 403"**
- Solution: Verify Gemini API key has proper permissions
- Enable Generative Language API in Google Cloud Console

**"Transcript not found"**
- Solution: Transcription may still be processing
- Wait 30-60 seconds and reload
- Check server logs for transcription errors

**"PDF download fails"**
- Solution: File may not exist on disk
- Regenerate transcript or contact admin

## Testing

### Manual Testing Checklist

- [ ] Upload audio file, wait for transcription
- [ ] View transcript in Transcript Viewer
- [ ] Select different language - translation should work
- [ ] Download original PDF
- [ ] Download translated PDF, verify formatting
- [ ] Set preferred language in student profile
- [ ] Verify new transcripts use preferred language
- [ ] Test with multilingual audio (English + Hindi)
- [ ] Verify language percentages display correctly

### API Testing

```bash
# Get transcript with default language
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:5000/api/transcripts/LECTURE_ID

# Translate to Hindi
curl -X POST -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"targetLanguage":"Hindi"}' \
  http://localhost:5000/api/transcripts/LECTURE_ID/translate

# Get available languages
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:5000/api/transcripts/LECTURE_ID/languages

# Download PDF
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:5000/api/transcripts/LECTURE_ID/pdf/Hindi \
  --output transcript_hindi.pdf
```

## Performance Considerations

### Optimization Tips

1. **Batch Segment Translation** - Currently processes 20 segments per batch
   - Adjust `BATCH_SIZE` in `transcriptProcessingService.js` if needed
   - Higher = faster but more tokens, Lower = slower but cheaper

2. **PDF Generation** - Async process
   - Doesn't block transcript retrieval
   - Failures don't prevent transcript display

3. **Caching** - Consider adding Redis caching for:
   - Frequently accessed translations
   - Language availability data
   - Student preferences

4. **Pagination** - For very long transcripts:
   - Implement pagination in frontend
   - Load segments in chunks instead of all at once

## Security Notes

- All endpoints require authentication
- Students can only access their own transcripts
- Professors can access student transcripts for their courses
- PDFs are served securely with proper headers

## Future Enhancements

1. **Real-time Translation Progress** - WebSocket updates
2. **Search in Transcripts** - Full-text search across translations
3. **Export Options** - JSON, SRT, VTT formats
4. **Keyword Highlights** - Highlight important terms
5. **Speaker Identification** - Mark different speakers
6. **Accessibility** - Better WCAG compliance
7. **Bookmark Segments** - Save important parts
8. **Share Transcripts** - Collaborative features

## Recent Updates: Gemini Translation & PDF Timestamps

### New Features Added

#### 1. Gemini AI Translation Integration
The system now uses **Google Gemini API** for intelligent transcript translation, replacing Groq with more accurate and capable translation service:

**Benefits:**
- More accurate translations with better context understanding
- Better handling of technical and academic terminology
- Faster processing for large segments
- Improved language nuance preservation

**Implementation:**
- Updated `transcriptProcessingService.js` to use `@google/generative-ai` SDK
- Replaced `translateTranscript()` function to call Gemini API
- Replaced `translateSegments()` to batch-process segments with Gemini
- Maintains timestamp accuracy during translation

#### 2. PDF Generation with Timestamps
Both original and translated transcripts are now automatically saved as timestamped PDF files:

**Features:**
- **Automatic PDF Generation** - PDFs created immediately after translation
- **Timestamped Filenames** - Format: `transcript_<timestamp>_<language>.pdf`
- **Formatted Layout** - Professional PDF with:
  - Lecture title (bold header)
  - Course name
  - Professor name
  - Lecture date
  - Language identifier
  - Generation timestamp
  - Numbered segments with HH:MM:SS timestamps
  - Proper spacing and readability
- **Dual PDFs** - Both original and translated versions available
- **Persistent Storage** - PDFs stored in `/backend/uploads/` directory
- **Database Tracking** - PDF references stored in LectureTranscript.pdfFiles

#### 3. Enhanced Frontend Display
Updated TranscriptViewer component with:

**Download Controls:**
- Side-by-side download buttons for original and translated PDFs
- Status indicators showing PDF availability
- Timestamps in PDF filenames for versioning
- Loading states during generation

**Display Format:**
- Timestamps displayed in MM:SS or HH:MM:SS format
- Segments highlighted with left border for visual clarity
- Language indicator showing current translation
- PDF generation confirmation message
- Color-coded buttons (Blue=Original, Green=Translated)

**User Experience:**
- Real-time feedback during translation
- Download progress indication
- Error messages with retry options
- Automatic URL revocation after download

### API Response Enhancement

The `/api/transcripts/:lectureId/translate` endpoint now returns:

```json
{
  "message": "Translation completed successfully",
  "translation": {
    "language": "Hindi",
    "text": "...translated text...",
    "segments": [
      {
        "start": 0,
        "end": 5,
        "text": "...translated segment..."
      }
    ],
    "translatedAt": "2024-01-15T10:30:00Z"
  },
  "pdfGenerated": true,
  "downloadUrl": "/api/transcripts/LECTURE_ID/pdf/Hindi"
}
```

### Configuration for Gemini

**Step 1: Get Gemini API Key**
```
1. Visit: https://aistudio.google.com/app/apikeys
2. Sign in with Google account
3. Click "Create API Key"
4. Copy the key
```

**Step 2: Update .env**
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

**Step 3: Verify Installation**
The package `@google/generative-ai` should already be in package.json. If not:
```bash
cd backend
npm install @google/generative-ai
```

### Translation Process Flow

```
User selects language
       ↓
POST /api/transcripts/:lectureId/translate
       ↓
Check if translation exists (return if cached)
       ↓
Load original transcript segments
       ↓
Generate original PDF (if not exists)
       ↓
Call Gemini API to translate full text
       ↓
Call Gemini API to translate segments in batches
       ↓
Save translation to database
       ↓
Generate translated PDF with timestamps
       ↓
Save PDF reference to database
       ↓
Return translation + download URLs
       ↓
Frontend displays translated transcript with PDF buttons
```

### Timestamp Preservation

The system maintains timing accuracy throughout the process:

1. **Original Transcription**: Segments created with exact timestamps
2. **Translation**: Timestamps carried through untouched from original
3. **PDF Generation**: Timestamps formatted as MM:SS or HH:MM:SS
4. **Storage**: Timestamps stored in database with millisecond precision

### PDF File Organization

```
/backend/uploads/
├── transcript_1704956400000_English.pdf     (Original)
├── transcript_1704956401234_Hindi.pdf       (Translated)
├── transcript_1704956402567_Gujarati.pdf    (Translated)
└── ...
```

**File Naming Convention:**
- `transcript_` - Static prefix
- `{timestamp}` - Epoch milliseconds when PDF generated
- `_{language}` - Target language
- `.pdf` - File extension

### Troubleshooting Gemini Integration

**Issue: "GEMINI_API_KEY is not configured"**
```
✗ Solution: Add GEMINI_API_KEY to .env file
✓ Verify: Log your .env file exists in /backend directory
```

**Issue: "Translation failed: 403 Forbidden"**
```
✗ Possible causes:
  - Invalid API key
  - API not enabled in Google Cloud Console
  - API key restrictions (IP/domain limits)
  
✓ Solutions:
  1. Regenerate API key
  2. Ensure Generative Language API enabled
  3. Check API key permissions
  4. Remove any API restrictions if testing in dev
```

**Issue: "API quota exceeded"**
```
✗ Cause: Too many translation requests in short time
✓ Solution: 
  - Check Google AIStudio Dashboard for usage
  - Implement rate limiting cache
  - Batch segment processing (already implemented)
```

**Issue: "PDF not downloading"**
```
✗ Possible causes:
  - File not generated successfully
  - File deleted from disk
  - Path issues in storage
  
✓ Solutions:
  1. Check /backend/uploads/ directory exists
  2. Verify file permissions
  3. Check server logs for PDF generation errors
  4. Regenerate PDF by requesting translation again
```

### Performance Metrics

**Typical Processing Times:**
- Short transcript (< 1000 words): 30-45 seconds
- Medium transcript (1000-5000 words): 45-90 seconds
- Large transcript (5000+ words): 90-120 seconds

**Key Factors:**
- Segment batch size (10 segments per API call)
- Gemini API response time (varies)
- PDF generation time (~1-2 seconds)
- Network latency

### Monitoring & Logging

The system includes comprehensive logging:

```javascript
[Translation] Starting Gemini translation to Hindi...
[Translation] Sending batch 1 to Gemini (10 segments)
[Translation] Gemini response received, parsing...
[Translation] Parsed 10 translations from Gemini response
[Translation] ✅ Batch 1/5 completed for Hindi
[PDF] ✅ Transcript PDF generated: transcript_1704956400000_Hindi.pdf
[Transcript] ✅ Hindi PDF generated and saved
```

Check logs in real-time while development server runs:
```bash
npm run dev
# Watch for [Translation] and [PDF] prefixed messages
```

## Support

For issues or questions:
1. Check server logs: `npm run dev`
2. Check browser console: F12 > Console
3. Verify API keys in `.env`
4. Check MongoDB connection
5. Review error messages in UI
