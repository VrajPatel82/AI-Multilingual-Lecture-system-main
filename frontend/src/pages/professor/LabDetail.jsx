import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { lecturesAPI, quizzesAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import GenerateQuizModal from '../../components/quiz/GenerateQuizModal';
import QuizDisplay from '../../components/quiz/QuizDisplay';
import EditContentModal from '../../components/shared/EditContentModal';

// Format seconds to MM:SS
const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export default function ProfessorLabDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [lab, setLab] = useState(null);
  const [loading, setLoading] = useState(true);
  const [transcription, setTranscription] = useState(null);
  const [showTranscript, setShowTranscript] = useState(true);
  const [activeSegment, setActiveSegment] = useState(-1);
  
  const [relatedQuizzes, setRelatedQuizzes] = useState([]);
  const [quizzesLoading, setQuizzesLoading] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  const [importantQuestions, setImportantQuestions] = useState([]);
  const [iqLoading, setIqLoading] = useState(false);
  const [iqGenerated, setIqGenerated] = useState(false);
  const [expandedQ, setExpandedQ] = useState({});
  
  const mediaRef = useRef(null);
  const scrollSectionRef = useRef(null);

  useEffect(() => {
    fetchLab();
  }, [id]);

  const fetchLab = async () => {
    try {
      const res = await lecturesAPI.getById(id);
      const labData = res.data.data || res.data.lecture || res.data;
      setLab(labData);
      
      // Fetch transcription
      fetchTranscription();
      // Fetch quizzes
      fetchRelatedQuizzes(labData._id);
    } catch (err) {
      toast.error('Failed to load lab details');
    } finally {
      setLoading(false);
    }
  };

  const fetchTranscription = async () => {
    try {
      const res = await lecturesAPI.getTranscription(id);
      setTranscription(res.data.transcription || { status: 'none' });
    } catch (err) {
      setTranscription({ status: 'none' });
    }
  };

  const fetchRelatedQuizzes = async (labId) => {
    setQuizzesLoading(true);
    try {
      const res = await quizzesAPI.getAll({ limit: 50 });
      const allQuizzes = res.data.data || [];
      const related = allQuizzes.filter(q => q.sourceLecture === labId);
      setRelatedQuizzes(related);
    } catch (err) {
      console.error('Error fetching quizzes:', err);
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
      toast.error('Failed to generate questions');
    } finally {
      setIqLoading(false);
    }
  };

  const handleQuizGenerated = (newQuiz) => {
    setRelatedQuizzes(prev => [newQuiz, ...prev]);
    setShowGenerateModal(false);
    toast.success('Quiz generated successfully!');
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
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div></div>;
  }

  if (!lab) {
    return <div className="text-center py-12 text-muted">Lab not found</div>;
  }

  const fileUrl = lab.fileUrl || (lab.file ? `${window.location.origin}/${lab.file}` : '');
  const attachmentUrl = lab.attachmentUrl ? (lab.attachmentUrl.startsWith('http') ? lab.attachmentUrl : `${window.location.origin}${lab.attachmentUrl}`) : null;
  const isVideo = fileUrl && /\.(mp4|webm|ogg)$/i.test(fileUrl);
  const isAudio = fileUrl && /\.(mp3|wav|ogg|m4a)$/i.test(fileUrl);
  const isPdf = fileUrl && /\.pdf$/i.test(fileUrl);
  const hasTranscription = transcription?.status === 'completed' && transcription?.text;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted">
          <Link to="/professor/my-labs" className="hover:text-purple-600">My Labs</Link>
          <span>/</span>
          <span className="text-heading font-medium">{lab.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowEditModal(true)}
            className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 shadow-sm shadow-blue-200"
          >
            ✏️ Edit Lab
          </button>
          <Link to="/professor/my-labs" className="text-sm text-purple-600 hover:underline">← Back to List</Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content (Left 2 Columns) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Video Player Section */}
          <div className="bg-black rounded-xl shadow-xl overflow-hidden aspect-video relative flex items-center justify-center border border-gray-800">
            {isVideo ? (
              <video ref={mediaRef} controls className="w-full h-full">
                <source src={fileUrl} />
              </video>
            ) : isAudio ? (
              <div className="p-8 w-full bg-gradient-to-br from-purple-900 to-indigo-900 flex flex-col items-center justify-center">
                <span className="text-6xl mb-4">🎙️</span>
                <audio ref={mediaRef} controls className="w-full max-w-md">
                  <source src={fileUrl} />
                </audio>
              </div>
            ) : isPdf ? (
              <div className="w-full h-[600px] flex flex-col">
                <div className="bg-gray-100 p-2 text-xs flex justify-between items-center border-b border-gray-200">
                  <span className="text-gray-600">PDF Preview</span>
                  <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">Open in New Tab</a>
                </div>
                <iframe src={fileUrl} className="flex-1 w-full" title={lab.title} />
              </div>
            ) : (
              <div className="text-white text-center p-8">
                <p>Preview not available for this file type</p>
                <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="btn-primary mt-4 inline-block">Download File</a>
              </div>
            )}
          </div>

          {/* Lab Information */}
          <div className="bg-surface rounded-card shadow-card border border-border p-6">
            <h1 className="text-2xl font-bold text-heading">{lab.title}</h1>
            <div className="flex flex-wrap gap-4 mt-3">
              <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">Semester {lab.semester}</span>
              <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-semibold">{lab.course?.name || 'No Course'}</span>
              <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">{new Date(lab.createdAt).toLocaleDateString()}</span>
            </div>
            {lab.description && (
              <div className="mt-4">
                <h3 className="font-semibold text-heading mb-1 text-sm">Description</h3>
                <p className="text-gray-600 text-sm whitespace-pre-wrap">{lab.description}</p>
              </div>
            )}
          </div>

          {/* Attachment / Lab Manual Section */}
          {attachmentUrl && (
            <div className="bg-white rounded-card shadow-card border border-border overflow-hidden">
              <div className="px-6 py-3 border-b border-border bg-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📄</span>
                  <h3 className="font-semibold text-heading text-sm uppercase tracking-wider">Lab Manual / PDF</h3>
                </div>
                <a 
                  href={attachmentUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-xs font-bold text-purple-600 hover:text-purple-800"
                >
                  Open in New Tab
                </a>
              </div>
              <div className="p-0 h-[500px]">
                <iframe src={attachmentUrl} className="w-full h-full border-none" title="Lab Manual" />
              </div>
            </div>
          )}

          {/* AI Important Questions Section */}
          <div className="bg-surface rounded-card shadow-card border border-border overflow-hidden">
             <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                   <span className="text-xl">💡</span>
                   <h3 className="font-semibold text-heading text-sm uppercase tracking-wider">Important Questions</h3>
                </div>
                {!iqGenerated && (
                  <button 
                    onClick={handleGenerateImportantQuestions}
                    disabled={iqLoading || !hasTranscription}
                    className="text-xs font-bold text-purple-600 hover:text-purple-800 disabled:opacity-50"
                  >
                    {iqLoading ? 'Generating...' : '+ Generate with AI'}
                  </button>
                )}
             </div>
             <div className="p-6">
                {!iqGenerated ? (
                   <div className="text-center py-4">
                      <p className="text-xs text-muted">Generate study questions from the transcript to help students</p>
                   </div>
                ) : (
                   <div className="space-y-3">
                      {importantQuestions.map((q, idx) => (
                        <div key={idx} className="border border-border rounded-lg overflow-hidden">
                           <button 
                             onClick={() => setExpandedQ(prev => ({...prev, [idx]: !prev[idx]}))}
                             className="w-full text-left px-4 py-3 text-sm font-medium text-heading hover:bg-gray-50 flex justify-between items-center"
                           >
                              <span>{idx+1}. {q.question}</span>
                              <span>{expandedQ[idx] ? '−' : '+'}</span>
                           </button>
                           {expandedQ[idx] && (
                             <div className="px-4 pb-3 text-xs text-gray-600 bg-purple-50 p-3 border-t border-purple-100">
                                {q.answer}
                             </div>
                           )}
                        </div>
                      ))}
                   </div>
                )}
             </div>
          </div>
        </div>

        {/* Sidebar (Right 1 Column) */}
        <div className="space-y-6">
          {/* Transcription Action Card */}
          <div className="bg-surface rounded-card shadow-card border border-border overflow-hidden">
            <div className="p-4 border-b border-border bg-gray-50 flex items-center justify-between">
              <h3 className="font-semibold text-heading text-sm">Transcript</h3>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                transcription?.status === 'completed' ? 'bg-green-100 text-green-700' : 
                transcription?.status === 'processing' ? 'bg-amber-100 text-amber-700 animate-pulse' : 
                'bg-red-100 text-red-700'
              }`}>
                {transcription?.status || 'None'}
              </span>
            </div>
            <div className="p-4 max-h-[400px] overflow-y-auto">
              {transcription?.segments?.length > 0 ? (
                <div className="space-y-3">
                  {transcription.segments.map((seg, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => seekTo(seg.start)}
                      className={`p-2 rounded cursor-pointer transition-colors border-l-2 ${
                        activeSegment === idx ? 'bg-purple-50 border-purple-500' : 'hover:bg-gray-50 border-transparent'
                      }`}
                    >
                      <span className="text-[10px] font-mono text-purple-600 font-bold block mb-1">{formatTime(seg.start)}</span>
                      <p className="text-xs text-gray-700 leading-relaxed">{seg.text}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <span className="text-2xl">📝</span>
                  <p className="text-xs text-muted mt-2">No transcription segments available</p>
                </div>
              )}
            </div>
          </div>

          {/* Quiz Management Card */}
          <div className="bg-surface rounded-card shadow-card border border-border overflow-hidden">
            <div className="p-4 border-b border-border bg-gray-50 flex items-center justify-between">
              <h3 className="font-semibold text-heading text-sm">Lab Quizzes</h3>
              <button 
                onClick={() => setShowGenerateModal(true)}
                disabled={!hasTranscription}
                className="text-[10px] font-bold text-blue-600 hover:text-blue-800 disabled:opacity-50"
              >
                + Create New
              </button>
            </div>
            <div className="p-4">
               {quizzesLoading ? (
                 <div className="flex justify-center p-4"><div className="animate-spin h-5 w-5 border-b-2 border-blue-600 rounded-full"></div></div>
               ) : relatedQuizzes.length > 0 ? (
                 <div className="space-y-2">
                   {relatedQuizzes.map(quiz => (
                     <div 
                       key={quiz._id} 
                       onClick={() => setSelectedQuiz(quiz)}
                       className="p-3 border border-border rounded-lg hover:border-blue-300 cursor-pointer transition-colors group"
                     >
                        <h4 className="text-xs font-semibold text-heading group-hover:text-blue-600 truncate">{quiz.title}</h4>
                        <div className="flex items-center justify-between mt-1 text-[10px] text-muted">
                           <span>{quiz.questions?.length || 0} Questions</span>
                           {quiz.aiGenerated && <span>🤖 AI</span>}
                        </div>
                     </div>
                   ))}
                 </div>
               ) : (
                 <p className="text-xs text-center text-muted py-4">No quizzes created for this lab yet.</p>
               )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {selectedQuiz && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-auto">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl z-10">
                 <h2 className="font-bold text-heading">Quiz Preview: {selectedQuiz.title}</h2>
                 <button onClick={() => setSelectedQuiz(null)} className="p-1 hover:bg-gray-100 rounded-full">✕</button>
              </div>
              <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                 <QuizDisplay quiz={selectedQuiz} showAnswers={true} />
              </div>
              <div className="p-4 bg-gray-50 border-t border-gray-100 text-right rounded-b-2xl">
                 <button onClick={() => setSelectedQuiz(null)} className="btn-secondary text-xs">Close</button>
              </div>
           </div>
        </div>
      )}

      {showGenerateModal && (
        <GenerateQuizModal 
          isOpen={showGenerateModal} 
          lecture={lab} 
          onClose={() => setShowGenerateModal(false)} 
          onQuizGenerated={handleQuizGenerated} 
        />
      )}

      {showEditModal && (
        <EditContentModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          content={lab}
          onUpdate={(updated) => setLab(updated)}
        />
      )}
    </div>
  );
}
