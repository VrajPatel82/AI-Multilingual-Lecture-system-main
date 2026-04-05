import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { lecturesAPI, quizzesAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

// Format seconds to MM:SS
const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

// Get semester-specific subject display
const getSemesterSubjectDisplay = (lab, userSemester) => {
  if (!lab.subject) return null;
  const semesterLabel = lab.semester === userSemester ? 'Current Semester' : `Semester ${lab.semester}`;
  return `${lab.subject} (${semesterLabel})`;
};

export default function StudentLabDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [lab, setLab] = useState(null);
  const [loading, setLoading] = useState(true);
  const [transcription, setTranscription] = useState(null);
  const [transcriptionLoading, setTranscriptionLoading] = useState(false);
  const [showTranscript, setShowTranscript] = useState(true);
  const [activeSegment, setActiveSegment] = useState(-1);
  const [relatedQuizzes, setRelatedQuizzes] = useState([]);
  const [quizzesLoading, setQuizzesLoading] = useState(false);
  const [importantQuestions, setImportantQuestions] = useState([]);
  const [iqLoading, setIqLoading] = useState(false);
  const [iqGenerated, setIqGenerated] = useState(false);
  const [expandedQ, setExpandedQ] = useState({});
  const mediaRef = useRef(null);

  useEffect(() => {
    fetchLab();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchLab = async () => {
    try {
      const res = await lecturesAPI.getById(id);
      const labData = res.data.data || res.data.lecture || res.data;
      setLab(labData);
      fetchTranscription();
      fetchRelatedQuizzes(labData._id);
    } catch (err) {
      toast.error('Failed to load lab');
    } finally {
      setLoading(false);
    }
  };

  const fetchRelatedQuizzes = async (labId) => {
    setQuizzesLoading(true);
    try {
      const res = await quizzesAPI.getAll({ limit: 50 });
      const allQuizzes = res.data.data || [];
      const related = allQuizzes.filter(q => q.aiGenerated && q.sourceLecture === labId);
      setRelatedQuizzes(related);
    } catch (err) {
      console.log('Could not fetch quizzes');
    } finally {
      setQuizzesLoading(false);
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

  const fetchTranscription = async () => {
    setTranscriptionLoading(true);
    try {
      const res = await lecturesAPI.getTranscription(id);
      setTranscription(res.data.transcription || { status: 'none' });
    } catch (err) {
      // Transcription not available — that's ok
      setTranscription({ status: 'none' });
    } finally {
      setTranscriptionLoading(false);
    }
  };

  // Seek media to a specific timestamp when clicking a transcript segment
  const seekTo = (time) => {
    if (mediaRef.current) {
      mediaRef.current.currentTime = time;
      mediaRef.current.play();
    }
  };

  // Track active segment based on media playback
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

  if (!lab) {
    return (
      <div className="text-center py-12">
        <p className="text-muted text-lg">Lab not found</p>
        <Link to="/student/labs" className="text-blue-600 hover:underline mt-2 inline-block">Back to Labs</Link>
      </div>
    );
  }

  const fileUrl = lab.fileUrl || (lab.file ? `${window.location.origin}/${lab.file}` : '');
  const attachmentUrl = lab.attachmentUrl ? (lab.attachmentUrl.startsWith('http') ? lab.attachmentUrl : `${window.location.origin}${lab.attachmentUrl}`) : null;
  const isVideo = fileUrl && /\.(mp4|webm|ogg)$/i.test(fileUrl);
  const isPdf = fileUrl && /\.pdf$/i.test(fileUrl);
  const isAudio = fileUrl && /\.(mp3|wav|ogg|m4a)$/i.test(fileUrl);
  const hasTranscription = transcription?.status === 'completed' && transcription?.text;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted">
        <Link to="/student/labs" className="hover:text-blue-600">Labs</Link>
        <span>/</span>
        <span className="text-heading">{lab.title}</span>
      </div>

      {/* Media Player */}
      <div className="bg-surface rounded-card shadow-card border border-border overflow-hidden">
        {isVideo ? (
          <video ref={mediaRef} controls className="w-full max-h-[500px] bg-black">
            <source src={fileUrl} />
            Your browser does not support video playback.
          </video>
        ) : isPdf ? (
          <div className="w-full h-[600px] flex flex-col">
            <div className="bg-gray-100 p-2 text-xs flex justify-between items-center border-b border-gray-200">
              <span className="text-gray-600 font-medium">PDF Document</span>
              <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-bold">
                Can't see the PDF? Click here to open in new tab
              </a>
            </div>
            <iframe src={fileUrl} className="flex-1 w-full" title={lab.title} />
          </div>
        ) : isAudio ? (
          <div className="p-8 flex justify-center bg-gradient-to-br from-purple-500 to-purple-700">
            <audio ref={mediaRef} controls className="w-full max-w-lg">
              <source src={fileUrl} />
            </audio>
          </div>
        ) : fileUrl ? (
          <div className="p-8 text-center bg-gray-50 flex flex-col items-center justify-center h-[300px]">
             <span className="text-5xl mb-4">📄</span>
             <p className="text-heading font-medium mb-3">Document: {lab.fileName || 'Lab Material'}</p>
             <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="btn-primary inline-block px-6">
                Open / Download Document
             </a>
          </div>
        ) : (
          <div className="h-64 bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
            <span className="text-white text-6xl">🧪</span>
          </div>
        )}
      </div>

      {/* Lab Info */}
      <div className="bg-surface rounded-card shadow-card border border-border p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-heading">{lab.title}</h1>
            {lab.experimentTitle && (
              <p className="text-sm text-purple-600 mt-2 font-medium">
                🧪 <span className="font-semibold">Experiment:</span> {lab.experimentTitle}
              </p>
            )}
            {lab.subject && (
              <p className="text-sm text-indigo-600 mt-1 font-medium">
                📋 {getSemesterSubjectDisplay(lab, user?.currentSemester)}
              </p>
            )}
          </div>
        </div>

        {/* Semester Info Banner */}
        {lab.semester && (
          <div className={`mb-4 p-3 rounded-lg border-2 ${
            lab.semester === user?.currentSemester
              ? 'bg-green-50 border-green-200'
              : 'bg-purple-50 border-purple-200'
          }`}>
            <div className="flex items-center gap-2">
              <span className="text-lg">
                {['', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣'][lab.semester]}
              </span>
              <div>
                <p className={`font-semibold text-sm ${
                  lab.semester === user?.currentSemester
                    ? 'text-green-800'
                    : 'text-purple-800'
                }`}>
                  Semester {lab.semester} 
                  {lab.semester === user?.currentSemester ? ' (Your Current Semester)' : ' (Previous Semester)'}
                </p>
                <p className={`text-xs ${
                  lab.semester === user?.currentSemester
                    ? 'text-green-700'
                    : 'text-purple-700'
                }`}>
                  {['', 'First Year', 'First Year', 'Second Year', 'Second Year', 'Third Year', 'Third Year', 'Fourth Year', 'Fourth Year'][lab.semester]} Practicals
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-3 mt-4">
          {lab.course?.name && (
            <span className="px-3 py-1 bg-purple-100 text-purple-700 text-sm rounded-full">{lab.course.name}</span>
          )}
          <span className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full">
            {new Date(lab.createdAt).toLocaleDateString()}
          </span>
          {lab.uploadedBy?.name && (
            <span className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full">
              By {lab.uploadedBy.name}
            </span>
          )}
        </div>
        {lab.description && (
          <div className="mt-4 text-body">
            <h3 className="font-semibold text-heading mb-2">Description</h3>
            <p className="whitespace-pre-wrap">{lab.description}</p>
          </div>
        )}

        {/* Attachment / Lab Manual Section */}
        {attachmentUrl && (
          <div className="mt-6 pt-6 border-t border-border">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">📄</span>
                <h3 className="font-semibold text-heading">Lab Manual / PDF</h3>
              </div>
              <a 
                href={attachmentUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-sm font-bold text-blue-600 hover:underline"
              >
                Open in New Tab
              </a>
            </div>
            <div className="bg-gray-100 rounded-xl overflow-hidden h-[500px]">
              <iframe src={attachmentUrl} className="w-full h-full border-none" title="Lab Manual" />
            </div>
          </div>
        )}
      </div>

      {/* Transcription Section */}
      {(isVideo || isAudio) && (
        <div className="bg-surface rounded-card shadow-card border border-border overflow-hidden">
          <div
            className="flex items-center justify-between px-6 py-4 border-b border-border cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => setShowTranscript(prev => !prev)}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">📝</span>
              <h3 className="font-semibold text-heading">Transcript</h3>
              {transcription?.status === 'completed' && transcription.duration > 0 && (
                <span className="text-xs text-muted bg-gray-100 px-2 py-0.5 rounded-full">
                  {formatTime(transcription.duration)} duration
                </span>
              )}
              {transcription?.status === 'processing' && (
                <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full animate-pulse">
                  Processing...
                </span>
              )}
              {transcription?.status === 'completed' && (
                <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                  Available
                </span>
              )}
              {transcription?.status === 'failed' && (
                <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                  Unavailable
                </span>
              )}
            </div>
            <span className={`text-muted transition-transform ${showTranscript ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </div>

          {showTranscript && (
            <div className="p-6">
              {transcriptionLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                  <span className="ml-3 text-muted">Loading transcript...</span>
                </div>
              ) : transcription?.status === 'completed' && transcription.text ? (
                <div className="space-y-4">
                  {/* Full transcript text */}
                  {transcription.segments && transcription.segments.length > 0 ? (
                    <div className="space-y-1 max-h-96 overflow-y-auto pr-2">
                      {transcription.segments.map((seg, idx) => (
                        <div
                          key={idx}
                          onClick={() => seekTo(seg.start)}
                          className={`flex gap-3 p-2 rounded-lg cursor-pointer transition-colors group ${
                            activeSegment === idx
                              ? 'bg-purple-50 border-l-4 border-purple-500'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <span className="text-xs font-mono text-purple-600 bg-purple-50 px-2 py-1 rounded shrink-0 group-hover:bg-purple-100 h-fit">
                            {formatTime(seg.start)}
                          </span>
                          <p className="text-sm text-body leading-relaxed">{seg.text}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-body whitespace-pre-wrap leading-relaxed">{transcription.text}</p>
                    </div>
                  )}

                  {/* Language info */}
                  {transcription.language && (
                    <div className="flex items-center gap-2 pt-2 border-t border-border">
                      <span className="text-xs text-muted">Language: <span className="font-medium">{transcription.language.toUpperCase()}</span></span>
                    </div>
                  )}
                </div>
              ) : transcription?.status === 'processing' ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="animate-pulse flex items-center gap-2 text-amber-600">
                    <span className="text-2xl">🎙️</span>
                    <span className="font-medium">Transcription in progress...</span>
                  </div>
                  <p className="text-sm text-muted mt-2">
                    The AI is transcribing this lab. Please check back in a few minutes.
                  </p>
                </div>
              ) : transcription?.status === 'failed' ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <span className="text-2xl">⚠️</span>
                  <p className="text-sm text-red-600 mt-2 font-medium">Transcription could not be generated</p>
                  <p className="text-xs text-muted mt-1">{transcription.error || 'An error occurred during processing'}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <span className="text-2xl">📄</span>
                  <p className="text-sm text-muted mt-2">No transcript available for this lab</p>
                </div>
              )}
            </div>
          )}
        </div>
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
          <p className="text-sm text-muted mt-1">Key questions and answers generated from this lab to help you study</p>
        </div>

        <div className="p-6">
          {!iqGenerated ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <span className="text-4xl mb-3">🧠</span>
              <p className="text-heading font-medium mb-1">Generate Important Questions</p>
              <p className="text-sm text-muted mb-4 max-w-md">
                AI will analyze the lab transcript and generate key questions with answers to help you prepare for exams.
              </p>
              <button
                onClick={handleGenerateImportantQuestions}
                disabled={iqLoading || !hasTranscription}
                className="btn-primary bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
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
              <p className="text-sm text-muted mt-2">No questions could be generated for this lab</p>
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

      {/* AI-Generated Quizzes Section */}
      <div className="bg-surface rounded-card shadow-card border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <span className="text-xl">🤖</span>
            <h3 className="font-semibold text-heading">AI-Generated Quizzes</h3>
            {relatedQuizzes.length > 0 && (
              <span className="text-xs text-white bg-indigo-600 px-2 py-0.5 rounded-full">
                {relatedQuizzes.length}
              </span>
            )}
          </div>
          <p className="text-sm text-muted mt-1">Test your understanding with AI-generated quizzes based on this lab</p>
        </div>

        <div className="p-6">
          {quizzesLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              <span className="ml-3 text-muted">Loading quizzes...</span>
            </div>
          ) : relatedQuizzes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <span className="text-2xl">📝</span>
              <p className="text-sm text-muted mt-2">No quizzes available for this lab yet</p>
              <p className="text-xs text-muted mt-1">Your professor will generate quizzes from this lab</p>
            </div>
          ) : (
            <div className="space-y-3">
              {relatedQuizzes.map(quiz => (
                <Link
                  key={quiz._id}
                  to={`/student/quiz/${quiz._id}`}
                  className="block p-4 border border-border rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-heading">{quiz.title}</h4>
                      <p className="text-sm text-muted mt-1">{quiz.questions?.length || 0} questions • {quiz.timeLimit || 30} minutes</p>
                    </div>
                    <span className="text-purple-600 font-semibold">Start Quiz →</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
