import { useState, useEffect } from 'react';
import { quizzesAPI, coursesAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function ProfessorQuizBuilder() {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [assignedCourses, setAssignedCourses] = useState([]);
  const [form, setForm] = useState({ title: '', description: '', course: '', duration: 30, isActive: true });
  const [questions, setQuestions] = useState([{ question: '', options: ['', '', '', ''], correctAnswer: 0, type: 'mcq', points: 1 }]);
  const [saving, setSaving] = useState(false);
  const [existingQuizzes, setExistingQuizzes] = useState([]);
  const [showList, setShowList] = useState(true);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState([]);
  const [loadingResults, setLoadingResults] = useState(false);

  useEffect(() => {
    fetchCourses();
    fetchQuizzes();
  }, [user?.id]);

  const fetchCourses = async () => {
    try {
      // Use user.courses directly - it's already populated from auth
      if (user?.courses?.length) {
        setAssignedCourses(user.courses);
      } else {
        setAssignedCourses([]);
      }
    } catch (err) { /* ignore */ }
  };

  const fetchQuizzes = async () => {
    try {
      const res = await quizzesAPI.getAll({ limit: 50, createdBy: user.id });
      const allQuizzes = res.data.data || [];
      // Filter to only quizzes from assigned courses
      if (user?.courses?.length) {
        const courseIds = user.courses.map(c => c._id?.toString() || c.toString());
        const filtered = allQuizzes.filter(q => {
          const quizCourseId = q.course?._id?.toString() || q.course?.toString();
          return courseIds.includes(quizCourseId);
        });
        setExistingQuizzes(filtered);
      } else {
        setExistingQuizzes([]);
      }
    } catch (err) { /* ignore */ }
  };

  const fetchResults = async (quizId) => {
    setLoadingResults(true);
    try {
      const res = await fetch(`/api/quizzes/${quizId}/results`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setResults(data.results || []);
      setSelectedQuiz(data.quiz);
      setShowResults(true);
      setShowList(false);
    } catch (err) {
      toast.error('Failed to fetch results');
    } finally {
      setLoadingResults(false);
    }
  };

  const downloadResults = () => {
    if (!results || results.length === 0) {
      toast.error('No results to download');
      return;
    }

    // Create CSV data
    const headers = ['Student Name', 'Enrollment Number', 'Score', 'Submitted Date'];
    const rows = results.map(r => [
      r.student?.name || 'N/A',
      r.student?.enrollmentNumber || 'N/A',
      `${r.totalScore}/${r.maxScore}`,
      new Date(r.submittedAt).toLocaleDateString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${selectedQuiz?.title || 'quiz'}-results.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Results downloaded successfully');
  };

  const deleteStudentResponse = async (resultId) => {
    if (!window.confirm('Delete this student response? This action cannot be undone.')) return;
    
    try {
      await fetch(`/api/quiz-results/${resultId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success('Response deleted successfully');
      setResults(results.filter(r => r._id !== resultId));
    } catch (err) {
      toast.error('Failed to delete response');
    }
  };

  const toggleQuizStatus = async (quizId, currentStatus) => {
    try {
      await quizzesAPI.update(quizId, { isActive: !currentStatus });
      toast.success(`Quiz ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      fetchQuizzes();
    } catch (err) {
      toast.error('Failed to update quiz status');
    }
  };

  const addQuestion = () => {
    setQuestions(q => [...q, { question: '', options: ['', '', '', ''], correctAnswer: 0, type: 'mcq', points: 1 }]);
  };

  const removeQuestion = (idx) => {
    if (questions.length <= 1) return;
    setQuestions(q => q.filter((_, i) => i !== idx));
  };

  const updateQuestion = (idx, field, value) => {
    setQuestions(q => q.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const updateOption = (qIdx, oIdx, value) => {
    setQuestions(q => q.map((item, i) => {
      if (i !== qIdx) return item;
      const newOptions = [...item.options];
      newOptions[oIdx] = value;
      return { ...item, options: newOptions };
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.course) return toast.error('Title and course are required');
    if (questions.some(q => !q.question || q.options.some(o => !o))) {
      return toast.error('Fill in all questions and options');
    }

    setSaving(true);
    try {
      // Format questions with type and points
      const formattedQuestions = questions.map(q => ({
        question: q.question,
        type: 'mcq',
        options: q.options,
        correctAnswer: q.options[q.correctAnswer],
        points: 1
      }));

      await quizzesAPI.create({ ...form, questions: formattedQuestions });
      toast.success('Quiz created!');
      setShowList(true);
      fetchQuizzes();
      // Reset form
      setForm({ title: '', description: '', course: '', duration: 30, isActive: true });
      setQuestions([{ question: '', options: ['', '', '', ''], correctAnswer: 0, type: 'mcq', points: 1 }]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create quiz');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this quiz?')) return;
    try {
      await quizzesAPI.delete(id);
      toast.success('Quiz deleted');
      fetchQuizzes();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  if (showResults) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => { setShowResults(false); setShowList(true); }} className="text-muted hover:text-heading text-sm">← Back</button>
            <div>
              <h1 className="text-2xl font-bold text-heading">{selectedQuiz?.title}</h1>
              <p className="text-sm text-muted mt-1">{selectedQuiz?.course?.name || 'No course'} - Student Results</p>
            </div>
          </div>
          <button onClick={downloadResults} disabled={loadingResults} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50">
            ⬇️ Download Results
          </button>
        </div>

        {loadingResults ? (
          <div className="flex justify-center h-40"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>
        ) : results.length === 0 ? (
          <div className="text-center py-12 bg-surface rounded-card border border-border">
            <p className="text-muted text-lg">No student submissions yet</p>
          </div>
        ) : (
          <div className="bg-surface rounded-card shadow-card border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-border">
                  <tr>
                    <th className="text-left px-6 py-3 text-sm font-medium text-muted">Student Name</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-muted">Enrollment Number</th>
                    <th className="text-center px-6 py-3 text-sm font-medium text-muted">Score</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-muted">Submitted Date</th>
                    <th className="text-center px-6 py-3 text-sm font-medium text-muted">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {results.map((result, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-3 text-sm text-heading font-medium">{result.student?.name || 'N/A'}</td>
                      <td className="px-6 py-3 text-sm text-muted">{result.student?.enrollmentNumber || 'N/A'}</td>
                      <td className="px-6 py-3 text-sm text-heading font-bold text-center">{result.totalScore}/{result.maxScore}</td>
                      <td className="px-6 py-3 text-sm text-muted">{new Date(result.submittedAt).toLocaleDateString()}</td>
                      <td className="px-6 py-3 text-center">
                        <button 
                          onClick={() => deleteStudentResponse(result._id)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (showList) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-heading">Quiz</h1>
            <p className="text-muted mt-1">Create and manage quizzes</p>
          </div>
          <button onClick={() => setShowList(false)} className="btn-primary">Create New Quiz</button>
        </div>

        {existingQuizzes.length === 0 ? (
          <div className="text-center py-12 bg-surface rounded-card border border-border">
            <p className="text-muted text-lg">No quizzes yet</p>
            <button onClick={() => setShowList(false)} className="text-blue-600 hover:underline mt-2">Create your first quiz</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {existingQuizzes.map(q => (
              <div 
                key={q._id} 
                onClick={() => fetchResults(q._id)}
                className="bg-surface rounded-card shadow-card border border-border p-5 cursor-pointer hover:shadow-lg transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-heading">{q.title}</h3>
                    <p className="text-sm text-muted mt-1">{q.course?.name || 'No course'}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${q.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {q.isActive !== false ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex gap-3 mt-3 text-sm text-muted">
                  <span>{q.questions?.length || 0} questions</span>
                  <span>•</span>
                  <span>{q.duration || 30} min</span>
                </div>
                <div className="flex gap-2 mt-4">
                  <button 
                    onClick={(e) => { e.stopPropagation(); toggleQuizStatus(q._id, q.isActive); }} 
                    className={`text-sm font-medium px-3 py-1 rounded transition-colors ${
                      q.isActive 
                        ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {q.isActive ? '✓ Active' : '✗ Inactive'}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(q._id); }} className="text-red-600 hover:text-red-800 text-sm">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => setShowList(true)} className="text-muted hover:text-heading">← Back</button>
        <div>
          <h1 className="text-2xl font-bold text-heading">Create Quiz</h1>
          <p className="text-muted mt-1">Build a new quiz for your students</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-surface rounded-card shadow-card border border-border p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-heading mb-1">Quiz Title *</label>
            <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="form-input w-full" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-heading mb-1">Course *</label>
            <select value={form.course} onChange={e => setForm(f => ({ ...f, course: e.target.value }))} className="form-input w-full" required>
              <option value="">Select course</option>
              {assignedCourses.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
            {assignedCourses.length === 0 && (
              <p className="text-xs text-red-600 mt-1">You are not assigned to any courses. Contact your department admin to assign you to courses.</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-heading mb-1">Duration (minutes)</label>
              <input type="number" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: parseInt(e.target.value) || 30 }))} className="form-input w-full" min="1" />
            </div>
            <div>
              <label className="block text-sm font-medium text-heading mb-1">Status</label>
              <select value={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.value === 'true' }))} className="form-input w-full">
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-heading mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="form-input w-full" rows={2} />
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-4">
          {questions.map((q, qIdx) => (
            <div key={qIdx} className="bg-surface rounded-card shadow-card border border-border p-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-heading">Question {qIdx + 1}</h3>
                {questions.length > 1 && (
                  <button type="button" onClick={() => removeQuestion(qIdx)} className="text-red-600 hover:text-red-800 text-sm">Remove</button>
                )}
              </div>
              <input
                type="text"
                value={q.question}
                onChange={e => updateQuestion(qIdx, 'question', e.target.value)}
                className="form-input w-full mb-3"
                placeholder="Enter question text"
              />
              <div className="space-y-2">
                {q.options.map((opt, oIdx) => (
                  <div key={oIdx} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`correct-${qIdx}`}
                      checked={q.correctAnswer === oIdx}
                      onChange={() => updateQuestion(qIdx, 'correctAnswer', oIdx)}
                      className="text-blue-600"
                    />
                    <input
                      type="text"
                      value={opt}
                      onChange={e => updateOption(qIdx, oIdx, e.target.value)}
                      className="form-input flex-1"
                      placeholder={`Option ${String.fromCharCode(65 + oIdx)}`}
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted mt-2">Select the radio button for the correct answer</p>
            </div>
          ))}
        </div>

        <button type="button" onClick={addQuestion} className="w-full py-3 border-2 border-dashed border-border rounded-card text-muted hover:text-heading hover:border-blue-400 transition-colors">
          + Add Question
        </button>

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-50">
            {saving ? 'Saving...' : 'Create Quiz'}
          </button>
          <button type="button" onClick={() => setShowList(true)} className="px-4 py-2 border border-border rounded-btn hover:bg-gray-50">Cancel</button>
        </div>
      </form>
    </div>
  );
}
