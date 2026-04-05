import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { lecturesAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import LanguageChart from '../../components/shared/LanguageChart';
import TranscriptViewer from '../../components/shared/TranscriptViewer';
import toast from 'react-hot-toast';

// Format seconds to MM:SS
const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

// Get semester-specific subject display
const getSemesterSubjectDisplay = (lecture, userSemester) => {
  if (!lecture.subject) return null;
  const semesterLabel = lecture.semester === userSemester ? 'Current Semester' : `Semester ${lecture.semester}`;
  return `${lecture.subject} (${semesterLabel})`;
};

export default function StudentLectureDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [lecture, setLecture] = useState(null);
  const [loading, setLoading] = useState(true);
  const [transcription, setTranscription] = useState(null);
  const [transcriptionLoading, setTranscriptionLoading] = useState(false);
  const [showTranscript, setShowTranscript] = useState(true);
  const [activeSegment, setActiveSegment] = useState(-1);
  const [importantQuestions, setImportantQuestions] = useState([]);
  const [iqLoading, setIqLoading] = useState(false);
  const [iqGenerated, setIqGenerated] = useState(false);
  const [expandedQ, setExpandedQ] = useState({});
  const mediaRef = useRef(null);

  useEffect(() => {
    fetchLecture();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchLecture = async () => {
    try {
      const res = await lecturesAPI.getById(id);
      const lectureData = res.data.data || res.data.lecture || res.data;
      setLecture(lectureData);
      fetchTranscription();
    } catch (err) {
      toast.error('Failed to load lecture');
    } finally {
      setLoading(false);
    }
  };

  const fetchTranscription = async () => {
    setTranscriptionLoading(true);
    try {
      const res = await lecturesAPI.getTranscription(id);
      setTranscription(res.data.transcription || { status: 'none' });
    } catch (err) {
      setTranscription({ status: 'none' });
    } finally {
      setTranscriptionLoading(false);
    }
  };

  const handleGenerateImportantQuestions = async () => {
    setIqLoading(true);
    try {
      const res = await lecturesAPI.generateImportantQuestions(id);
      setImportantQuestions(res.data.questions || []);
      setIqGenerated(true);
      toast.success('Important questions generated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate important questions');
    } finally {
      setIqLoading(false);
    }
  };

  const toggleQExpand = (idx) => {
    setExpandedQ(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const seekTo = (time) => {
    if (mediaRef.current) {
      mediaRef.current.currentTime = time;
      mediaRef.current.play();
    }
  };

  useEffect(() => {
    const media = mediaRef.current;
    if (!media || !transcription?.segments?.length) return;

    const handleTimeUpdate = () => {
      const currentTime = media.currentTime;
      const idx = transcription.segments.findIndex(
        (seg, i) => currentTime >= seg.start && (i === transcription.segments.length - 1 || currentTime < transcription.segments[i + 1].start)
      );
      setActiveSegment(idx);
    };

    media.addEventListener('timeupdate', handleTimeUpdate);
    return () => media.removeEventListener('timeupdate', handleTimeUpdate);
  }, [transcription]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!lecture) {
    return (
      <div className="text-center py-12">
        <p className="text-muted text-lg">Lecture not found</p>
        <Link to="/student/lectures" className="text-blue-600 hover:underline mt-2 inline-block">Back to Lectures</Link>
      </div>
    );
  }

  const fileUrl = lecture.fileUrl || (lecture.file ? `${window.location.origin}/${lecture.file}` : '');
  const attachmentUrl = lecture.attachmentUrl ? (lecture.attachmentUrl.startsWith('http') ? lecture.attachmentUrl : `${window.location.origin}${lecture.attachmentUrl}`) : null;
  const isVideo = fileUrl && /\.(mp4|webm|ogg)$/i.test(fileUrl);
  const isPdf = fileUrl && /\.pdf$/i.test(fileUrl);
  const isAudio = fileUrl && /\.(mp3|wav|ogg|m4a)$/i.test(fileUrl);
  const hasTranscription = transcription?.status === 'completed' && transcription?.text;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted">
        <Link to="/student/lectures" className="hover:text-blue-600">Lectures</Link>
        <span>/</span>
        <span className="text-heading">{lecture.title}</span>
      </div>

      {/* Media Player */}
      <div className="bg-surface rounded-card shadow-card border border-border overflow-hidden">
        {isVideo ? (
          <video ref={mediaRef} controls className="w-full max-h-[500px] bg-black">
            <source src={fileUrl} />
            Your browser does not support video playback.
          </video>
        ) : isPdf ? (
          <div className="w-full h-[600px] flex flex-col bg-white">
            <div className="bg-gray-100 p-2 text-xs flex justify-between items-center border-b border-gray-200">
              <span className="text-gray-600 font-medium font-sans">Lecture Document (PDF)</span>
              <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-bold font-sans">
                Can't see the PDF? Click here to open in new tab
              </a>
            </div>
            <iframe src={fileUrl} className="flex-1 w-full" title={lecture.title} />
          </div>
        ) : isAudio ? (
          <div className="p-8 flex justify-center bg-gradient-to-br from-blue-500 to-blue-700">
            <audio ref={mediaRef} controls className="w-full max-w-lg">
              <source src={fileUrl} />
            </audio>
          </div>
        ) : fileUrl ? (
          <div className="p-8 text-center bg-gray-50 flex flex-col items-center justify-center h-[300px]">
             <span className="text-5xl mb-4">📄</span>
             <p className="text-heading font-medium mb-3">Document: {lecture.fileName || 'Lecture Material'}</p>
             <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="btn-primary inline-block px-6">
                Open / Download Document
             </a>
          </div>
        ) : (
          <div className="h-64 bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
            <span className="text-white text-6xl">🎬</span>
          </div>
        )}
      </div>

      {/* Lecture Info */}
      <div className="bg-surface rounded-card shadow-card border border-border p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-heading">{lecture.title}</h1>
            {lecture.subject && (
              <p className="text-sm text-muted mt-2 font-medium">
                📚 {getSemesterSubjectDisplay(lecture, user?.currentSemester)}
              </p>
            )}
          </div>
        </div>

        {lecture.semester && (
          <div className={`mb-4 p-3 rounded-lg border-2 ${
            lecture.semester === user?.currentSemester
              ? 'bg-green-50 border-green-200'
              : 'bg-blue-50 border-blue-200'
          }`}>
            <div className="flex items-center gap-2">
              <span className="text-lg">
                {['', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣'][lecture.semester]}
              </span>
              <div>
                <p className={`font-semibold text-sm ${
                  lecture.semester === user?.currentSemester ? 'text-green-800' : 'text-blue-800'
                }`}>
                  Semester {lecture.semester} 
                  {lecture.semester === user?.currentSemester ? ' (Your Current Semester)' : ' (Previous Semester)'}
                </p>
                <p className={`text-xs ${
                  lecture.semester === user?.currentSemester ? 'text-green-700' : 'text-blue-700'
                }`}>
                  {['', 'First Year', 'First Year', 'Second Year', 'Second Year', 'Third Year', 'Third Year', 'Fourth Year', 'Fourth Year'][lecture.semester]} Content
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-3 mt-4">
          {lecture.course?.name && (
            <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">{lecture.course.name}</span>
          )}
          <span className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full">
            {new Date(lecture.createdAt).toLocaleDateString()}
          </span>
          {lecture.uploadedBy?.name && (
            <span className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full">
              By {lecture.uploadedBy.name}
            </span>
          )}
        </div>
        {lecture.description && (
          <div className="mt-4 text-body">
            <h3 className="font-semibold text-heading mb-2">Description</h3>
            <p className="whitespace-pre-wrap">{lecture.description}</p>
          </div>
        )}

        {/* Attachment Section */}
        {attachmentUrl && (
          <div className="mt-6 pt-6 border-t border-border">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">📄</span>
              <h3 className="font-semibold text-heading">Additional Material (PDF)</h3>
            </div>
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <span className="text-2xl">📑</span>
                <div className="flex-1">
                  <p className="font-medium text-heading text-sm">{lecture.attachmentName || 'Lecture Material.pdf'}</p>
                  <p className="text-xs text-muted mt-1">Click download to access the PDF</p>
                </div>
              </div>
              <a 
                href={attachmentUrl} 
                download
                className="btn-primary px-4 py-2 text-sm font-semibold"
              >
                ⬇️ Download
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Language Analysis Section */}
      {lecture.languageAnalysis && (
        <LanguageChart data={lecture.languageAnalysis} />
      )}

      {/* Transcription Section */}
      {(isVideo || isAudio) && (
        <TranscriptViewer lectureId={id} />
      )}

      {/* 💡 AI Important Questions Section */}
      <div className="bg-surface rounded-card shadow-card border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <span className="text-xl">💡</span>
            <h3 className="font-semibold text-heading">AI Important Questions</h3>
            {iqGenerated && importantQuestions.length > 0 && (
              <span className="text-xs text-white bg-purple-600 px-2 py-0.5 rounded-full">
                {importantQuestions.length} Questions
              </span>
            )}
          </div>
          <p className="text-sm text-muted mt-1">Key questions and answers generated from this lecture to help you study</p>
        </div>

        <div className="p-6">
          {!iqGenerated ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <span className="text-4xl mb-3">🧠</span>
              <p className="text-heading font-medium mb-1">Generate Important Questions</p>
              <p className="text-sm text-muted mb-4 max-w-md">
                AI will analyze the lecture transcript and generate key questions with answers to help you prepare for exams.
              </p>
              <button
                onClick={handleGenerateImportantQuestions}
                disabled={iqLoading || !hasTranscription}
                className="btn-primary disabled:opacity-50"
              >
                {iqLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Generating...
                  </span>
                ) : (
                  '💡 Generate Important Questions'
                )}
              </button>
              {!hasTranscription && (
                <p className="text-xs text-amber-600 mt-2">⏳ Transcription must be available first</p>
              )}
            </div>
          ) : importantQuestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <span className="text-2xl">📄</span>
              <p className="text-sm text-muted mt-2">No questions could be generated for this lecture</p>
            </div>
          ) : (
            <div className="space-y-3">
              {importantQuestions.map((item, idx) => (
                <div
                  key={idx}
                  className="border border-border rounded-xl overflow-hidden transition-all hover:border-purple-300"
                >
                  <button
                    onClick={() => toggleQExpand(idx)}
                    className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                  >
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-sm font-bold mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="flex-1 font-medium text-heading text-sm leading-relaxed">{item.question}</span>
                    <span className={`text-muted transition-transform flex-shrink-0 mt-1 ${expandedQ[idx] ? 'rotate-180' : ''}`}>
                      ▼
                    </span>
                  </button>
                  {expandedQ[idx] && (
                    <div className="px-4 pb-4 pt-0 ml-10">
                      <div className="bg-purple-50 border-l-4 border-purple-400 rounded-r-lg p-3">
                        <p className="text-sm text-gray-700 leading-relaxed">{item.answer}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <div className="flex justify-center pt-3">
                <button
                  onClick={handleGenerateImportantQuestions}
                  disabled={iqLoading}
                  className="text-sm text-purple-600 hover:text-purple-800 font-medium disabled:opacity-50 flex items-center gap-1"
                >
                  {iqLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="inline-block w-3 h-3 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin"></span>
                      Regenerating...
                    </span>
                  ) : (
                    '🔄 Regenerate Questions'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>


    </div>
  );
}
