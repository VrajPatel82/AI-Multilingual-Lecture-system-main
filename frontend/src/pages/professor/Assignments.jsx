import { useState, useEffect } from 'react';
import { assignmentsAPI, coursesAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function ProfAssignments() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', semester: '1', course: '', dueDate: '', totalMarks: 100 });
  const [search, setSearch] = useState('');
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [showSubmissionsModal, setShowSubmissionsModal] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [aRes] = await Promise.allSettled([
        assignmentsAPI.getAll({ createdBy: user.id })
      ]);
      if (aRes.status === 'fulfilled') setAssignments(aRes.value.data.data || []);
      // Use user.courses directly - it's already populated from auth
      if (user?.courses?.length) {
        setCourses(user.courses);
      } else {
        setCourses([]);
      }
    } catch (err) { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('title', form.title);
      formData.append('description', form.description);
      formData.append('semester', form.semester);
      formData.append('course', form.course);
      formData.append('dueDate', form.dueDate);
      formData.append('maxMarks', form.totalMarks);
      await assignmentsAPI.create(formData);
      toast.success('Assignment created');
      setForm({ title: '', description: '', semester: '1', course: '', dueDate: '', totalMarks: 100 });
      setShowForm(false);
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to create'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this assignment?')) return;
    try {
      await assignmentsAPI.delete(id);
      toast.success('Assignment deleted');
      fetchData();
    } catch (err) { toast.error('Failed to delete'); }
  };

  const handleDownloadSubmissions = (assignment) => {
    if (!assignment.submissions || assignment.submissions.length === 0) {
      toast.error('No submissions to download');
      return;
    }

    let csv = 'Student Name,Enrollment Number,Submitted At,Status,Marks,File Names\n';
    assignment.submissions.forEach(sub => {
      const studentName = sub.student?.name || 'Unknown';
      const enrollmentNumber = sub.student?.enrollmentNumber || 'N/A';
      const submittedAt = new Date(sub.submittedAt).toLocaleDateString();
      const status = sub.status || 'pending';
      const marks = sub.marks || '-';
      const fileNames = sub.files?.map(f => f.fileName).join('; ') || 'No files';
      csv += `"${studentName}","${enrollmentNumber}","${submittedAt}","${status}","${marks}","${fileNames}"\n`;
    });

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
    element.setAttribute('download', `${assignment.title}_submissions.csv`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success('Submissions downloaded as CSV');
  };

  const filtered = assignments.filter(a => a.title?.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-heading">Assignments</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary px-4 py-2 rounded-btn text-sm">
          {showForm ? 'Cancel' : '+ New Assignment'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-surface rounded-card shadow-card border border-border p-6 space-y-4">
          <h2 className="text-lg font-semibold text-heading">New Assignment</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Title *</label>
              <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="form-input w-full" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Semester *</label>
              <select value={form.semester} onChange={e => setForm({...form, semester: e.target.value, course: ''})} className="form-input w-full" required>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>Semester {s}</option>)}
              </select>
              <p className="text-xs text-muted mt-1">Select semester first, then choose a course from that semester</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Course *</label>
              <select value={form.course} onChange={e => setForm({...form, course: e.target.value})} className="form-input w-full" required>
                <option value="">Select course for Semester {form.semester}</option>
                {courses.filter(c => !c.semester || c.semester == form.semester).map(c => <option key={c._id} value={c._id}>{c.name} ({c.code})</option>)}
              </select>
              {courses.length === 0 && (
                <p className="text-xs text-red-600 mt-1">You are not assigned to any courses. Contact your department admin to assign you to courses.</p>
              )}
              {courses.length > 0 && courses.filter(c => !c.semester || c.semester == form.semester).length === 0 && (
                <p className="text-xs text-amber-600 mt-1">No assigned courses for Semester {form.semester}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Due Date *</label>
              <input type="datetime-local" value={form.dueDate} onChange={e => setForm({...form, dueDate: e.target.value})} className="form-input w-full" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Total Marks</label>
              <input type="number" value={form.totalMarks} onChange={e => setForm({...form, totalMarks: parseInt(e.target.value)})} className="form-input w-full" min={1} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="form-input w-full" rows={3} />
            </div>
          </div>
          <button type="submit" className="btn-primary px-4 py-2 rounded-btn text-sm">Create Assignment</button>
        </form>
      )}

      <input type="text" placeholder="Search assignments..." value={search} onChange={e => setSearch(e.target.value)} className="form-input w-full max-w-md" />

      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="bg-surface rounded-card shadow-card border border-border p-12 text-center text-muted">No assignments</div>
        ) : (
          filtered.map(a => (
            <div key={a._id} className="bg-surface rounded-card shadow-card border border-border p-5">
              <div className="flex justify-between items-start">
                <div className="flex-1 cursor-pointer" onClick={() => {
                  setSelectedAssignment(a);
                  setShowSubmissionsModal(true);
                }}>
                  <h3 className="font-semibold text-heading hover:text-blue-600">{a.title}</h3>
                  <p className="text-sm text-muted mt-1">{a.description}</p>
                  <div className="flex items-center gap-4 mt-3 text-xs text-muted">
                    <span>Course: {a.course?.name || 'N/A'}</span>
                    <span>Due: {a.dueDate ? new Date(a.dueDate).toLocaleDateString() : 'N/A'}</span>
                    <span>Marks: {a.totalMarks}</span>
                    <span className="cursor-pointer text-blue-600 font-medium hover:underline">Submissions: {a.submissions?.length || 0} →</span>
                  </div>
                </div>
                <button onClick={() => handleDelete(a._id)} className="text-red-600 hover:text-red-800 text-sm">Delete</button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Submissions Modal */}
      {showSubmissionsModal && selectedAssignment && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-heading">Submissions - {selectedAssignment.title}</h2>
              <button onClick={() => setShowSubmissionsModal(false)} className="text-2xl text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <div className="overflow-y-auto flex-1 p-6">
              {!selectedAssignment.submissions || selectedAssignment.submissions.length === 0 ? (
                <div className="text-center py-12 text-muted">
                  <p>No submissions yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedAssignment.submissions.map((sub, idx) => (
                    <div key={idx} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-semibold text-heading">{sub.student?.name || 'Unknown'}</h4>
                          <p className="text-sm text-muted">Enrollment: {sub.student?.enrollmentNumber || 'N/A'}</p>
                          <p className="text-sm text-muted">Submitted: {new Date(sub.submittedAt).toLocaleString()}</p>
                          {sub.isLate && <p className="text-xs text-red-600 font-medium mt-1">⚠️ Late Submission</p>}
                          {sub.marks !== null && <p className="text-sm text-green-600 mt-1">Marks: {sub.marks}</p>}
                        </div>
                        <div className="text-right">
                          <span className={`text-xs px-2 py-1 rounded-full ${sub.status === 'graded' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                            {sub.status}
                          </span>
                        </div>
                      </div>
                      {sub.files && sub.files.length > 0 && (
                        <div className="mt-3 border-t border-gray-100 pt-3">
                          <p className="text-xs font-medium text-gray-600 mb-2">📎 Submitted Files:</p>
                          <div className="space-y-1">
                            {sub.files.map((file, fidx) => (
                              <a key={fidx} href={file.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                                📄 {file.fileName}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                      {sub.feedback && (
                        <div className="mt-3 p-2 bg-blue-50 rounded border-l-4 border-blue-400">
                          <p className="text-xs text-blue-800"><strong>Feedback:</strong> {sub.feedback}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50 flex gap-3">
              <button
                onClick={() => handleDownloadSubmissions(selectedAssignment)}
                className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"
              >
                📥 Download All (CSV)
              </button>
              <button
                onClick={() => setShowSubmissionsModal(false)}
                className="px-4 py-2 border border-border rounded-lg hover:bg-gray-100 text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
