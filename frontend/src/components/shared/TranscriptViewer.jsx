import { useState, useEffect } from 'react';
import api from '../../services/api';

/**
 * TranscriptViewer Component
 * Displays lecture transcript with timestamp synchronization
 * Supports multiple language translations displayed inline
 */
const TranscriptViewer = ({ lectureId }) => {
  const [transcript, setTranscript] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [availableLanguages, setAvailableLanguages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [translating, setTranslating] = useState(false);

  // Fetch transcript on mount
  useEffect(() => {
    if (!lectureId) return;
    console.log(`[Transcript Viewer] Component mounted with lectureId: ${lectureId}`);
    fetchTranscript('English');
    fetchAvailableLanguages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lectureId]);

  const fetchTranscript = async (language) => {
    try {
      setLoading(true);
      // Ensure language is always a string
      let lang = language || selectedLanguage || 'English';
      if (typeof lang !== 'string') {
        lang = String(lang);
      }
      console.log(`[Transcript Viewer] Fetching transcript for language: ${lang}`);
      const response = await api.get(`/transcripts/${lectureId}?language=${lang}`);
      console.log(`[Transcript Viewer] Got response:`, response.data);
      setTranscript(response.data);
      setSelectedLanguage(response.data.currentLanguage || lang);
      setError(null);
    } catch (err) {
      console.error('[Transcript Viewer] Error fetching transcript:', err);
      setError(err.response?.data?.message || 'Failed to load transcript');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableLanguages = async () => {
    try {
      console.log(`[Transcript Viewer] Fetching available languages...`);
      const response = await api.get(`/transcripts/${lectureId}/languages`);
      console.log(`[Transcript Viewer] Available languages:`, response.data.languages);
      setAvailableLanguages(response.data.languages);
    } catch (err) {
      console.error('[Transcript Viewer] Error fetching languages:', err);
      // Set default languages if API fails
      const defaults = [
        { name: 'English', available: true, translated: false, isOriginal: true },
        { name: 'Hindi', available: true, translated: false },
        { name: 'Gujarati', available: true, translated: false }
      ];
      console.log(`[Transcript Viewer] Using default languages`, defaults);
      setAvailableLanguages(defaults);
    }
  };

  const handleLanguageChange = async (language) => {
    // Convert to string and trim whitespace
    const lang = String(language || '').trim();
    console.log(`[Transcript Viewer] Language changed to: ${lang}`);
    
    if (!lang || lang === selectedLanguage) {
      console.log(`[Transcript Viewer] Already selected language or invalid: ${lang}`);
      return;
    }

    // Immediately update UI to show selection
    setSelectedLanguage(lang);

    // If selecting English (original), just display it
    if (lang === 'English') {
      console.log(`[Transcript Viewer] Fetching original English transcript...`);
      await fetchTranscript('English');
      return;
    }

    const langData = availableLanguages.find(l => String(l.name).trim() === lang);
    console.log(`[Transcript Viewer] Language data:`, langData);
    
    if (!langData?.available || !langData?.translated) {
      // Translate to this language
      console.log(`[Transcript Viewer] Translation needed for: ${lang}`);
      await translateTranscript(lang);
    } else {
      // Already translated, just fetch
      console.log(`[Transcript Viewer] Translation already exists, fetching...`);
      await fetchTranscript(lang);
    }
  };

  const translateTranscript = async (targetLanguage) => {
    try {
      setTranslating(true);
      // Ensure targetLanguage is a string
      const lang = String(targetLanguage).trim();
      console.log(`[Transcript Viewer] Starting translation to ${lang}...`);
      
      const response = await api.post(`/transcripts/${lectureId}/translate`, {
        targetLanguage: lang
      });

      console.log(`[Transcript Viewer] Translation response:`, response.data);
      
      // Update transcript with translated segments
      if (response.data.translation && response.data.translation.segments) {
        console.log(`[Transcript Viewer] Updating UI with ${response.data.translation.segments.length} translated segments`);
        setTranscript(prev => ({
          ...prev,
          segments: response.data.translation.segments,
          currentLanguage: lang
        }));
      }
      
      // Update available languages
      console.log(`[Transcript Viewer] Fetching updated language list...`);
      await fetchAvailableLanguages();
      console.log(`[Transcript Viewer] Translation completed successfully!`);
    } catch (err) {
      console.error('[Transcript Viewer] Translation error:', err);
      console.error('[Transcript Viewer] Error response:', err.response?.data);
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to translate transcript');
      // Reset language selection on error
      setSelectedLanguage('English');
    } finally {
      setTranslating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
          <p className="text-gray-600">Loading transcript...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded p-4 text-red-700">
        <p className="font-semibold">Error</p>
        <p>{error}</p>
        <button 
          onClick={() => fetchTranscript('English')}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!transcript) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded p-4 text-yellow-700">
        <p>No transcript available for this lecture yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Transcript Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Lecture Transcript</h2>
          <p className="text-gray-600 text-sm mt-1">
            {transcript.course} | {transcript.professor}
          </p>
        </div>

        {/* Language Selection */}
        <div className="flex flex-wrap gap-3 items-center">
          <label className="font-semibold text-gray-700">Language:</label>
          <select
            value={selectedLanguage}
            onChange={(e) => {
              const selectedValue = e.target.value;
              console.log(`[Transcript Viewer] Dropdown selected:`, selectedValue);
              handleLanguageChange(selectedValue);
            }}
            disabled={translating}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:border-gray-400 disabled:bg-gray-100 disabled:cursor-not-allowed font-medium"
          >
            {(availableLanguages.length > 0 
              ? availableLanguages 
              : [
                  { name: 'English', available: true, translated: false, isOriginal: true },
                  { name: 'Hindi', available: true, translated: false },
                  { name: 'Gujarati', available: true, translated: false }
                ]
            ).map((lang) => (
              <option key={lang.name} value={lang.name}>
                {lang.name}
                {lang.translated ? ' ✓' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Translation Status */}
      {translating && (
        <div className="bg-blue-50 border border-blue-200 rounded p-4 text-blue-700 flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
          <p>⏳ Translating to <span className="font-semibold">{selectedLanguage}</span>... This may take a minute.</p>
        </div>
      )}

      {/* Transcript Content */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Full Transcript - {selectedLanguage}</h3>
          <p className="text-xs text-blue-600 mt-2 font-medium">🌐 Language: {selectedLanguage}</p>
        </div>
        
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {transcript.segments?.map((segment, index) => (
            <div
              key={index}
              className="flex gap-4 pb-3 border-b border-gray-200 last:border-b-0 hover:bg-blue-50 px-2 py-2 rounded transition"
            >
              <span className="text-blue-600 font-mono text-sm font-bold min-w-fit pt-0.5">
                {formatTime(segment.start)}
              </span>
              <p className="text-gray-700 text-sm leading-relaxed flex-1">
                {segment.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Helper function to format time
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

export default TranscriptViewer;
