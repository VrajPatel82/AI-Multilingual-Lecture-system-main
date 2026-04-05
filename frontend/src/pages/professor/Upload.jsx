import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { lecturesAPI, coursesAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function ProfessorUpload() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [assignedCourses, setAssignedCourses] = useState([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'lecture',
    subject: '',
    experimentTitle: '',
    course: '',
    semester: '1',
    language: 'en'
  });
  const [file, setFile] = useState(null);
  const [attachment, setAttachment] = useState(null);
  const [uploading, setUploading] = useState(false);

  const isTranscribableFile = (f) => {
    if (!f) return false;
    const ext = f.name.split('.').pop().toLowerCase();
    return ['mp4', 'webm', 'mov', 'mp3', 'wav', 'ogg', 'm4a', 'flac', 'mpeg', 'mpga'].includes(ext);
  };

  useEffect(() => {
    fetchCourses();
  }, []);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title) return toast.error('Title is required');
    if (!form.course) return toast.error('Please select a course');
    if (!form.semester) return toast.error('Please select a semester');
    if (form.type === 'lab' && !form.subject) return toast.error('Subject is required for labs');
    if (!file) return toast.error('Please upload a file');

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('title', form.title);
      formData.append('description', form.description);
      formData.append('type', form.type);
      formData.append('course', form.course);
      formData.append('semester', form.semester);
      formData.append('language', form.language);

      if (form.type === 'lab') {
        formData.append('subject', form.subject);
        if (form.experimentTitle) formData.append('experimentTitle', form.experimentTitle);
      }

      if (file) formData.append('file', file);
      if (attachment) formData.append('attachment', attachment);

      await lecturesAPI.create(formData);
      toast.success(`${form.type === 'lab' ? 'Lab' : 'Lecture'} uploaded successfully!`);
      navigate(form.type === 'lab' ? '/professor/my-labs' : '/professor/my-lectures');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-heading">📚 Professor Upload - Create Content</h1>
        <p className="text-muted mt-1">Upload a new {form.type === 'lab' ? 'lab session' : 'lecture'} recording or material for your students</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-surface rounded-card shadow-card border border-border p-6 space-y-5">
        {/* Type Selection */}
        <div>
          <label className="block text-sm font-medium text-heading mb-1">Content Type *</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="lecture"
                checked={form.type === 'lecture'}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="w-4 h-4"
              />
              <span className="text-sm text-heading">Lecture</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="lab"
                checked={form.type === 'lab'}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="w-4 h-4"
              />
              <span className="text-sm text-heading">Lab Session</span>
            </label>
          </div>
        </div>

        {/* Semester (move to top - select this first) */}
        <div>
          <label className="block text-sm font-medium text-heading mb-1">Semester *</label>
          <select
            value={form.semester}
            onChange={e => setForm(f => ({ ...f, semester: e.target.value, course: '' }))}
            className="form-input w-full"
            required
          >
            {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
              <option key={s} value={s}>Semester {s}</option>
            ))}
          </select>
          <p className="text-xs text-muted mt-1">Select the semester first, then choose a course from that semester</p>
        </div>

        {/* Course (filtered by semester and assigned courses) */}
        <div>
          <label className="block text-sm font-medium text-heading mb-1">Course *</label>
          <select
            value={form.course}
            onChange={e => setForm(f => ({ ...f, course: e.target.value }))}
            className="form-input w-full"
            required
          >
            <option value="">Select course for Semester {form.semester}</option>
            {assignedCourses.filter(c => !c.semester || c.semester == form.semester).map(c => (
              <option key={c._id} value={c._id}>{c.name} ({c.code})</option>
            ))}
          </select>
          {assignedCourses.length === 0 && (
            <p className="text-xs text-red-600 mt-1">You are not assigned to any courses. Contact your department admin to assign you to courses.</p>
          )}
          {assignedCourses.length > 0 && assignedCourses.filter(c => !c.semester || c.semester == form.semester).length === 0 && (
            <p className="text-xs text-amber-600 mt-1">No assigned courses for Semester {form.semester}.</p>
          )}
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-heading mb-1">
            {form.type === 'lab' ? 'Experiment Title' : 'Lecture Title'} *
          </label>
          <input
            type="text"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            className="form-input w-full"
            placeholder={form.type === 'lab' ? 'Enter experiment title' : 'Enter lecture title'}
            required
          />
        </div>

        {/* Subject (for labs - appears after selecting semester & course) */}
        {form.type === 'lab' && (
          <div>
            <label className="block text-sm font-medium text-heading mb-1">Subject *</label>
            <input
              type="text"
              value={form.subject}
              onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
              className="form-input w-full"
              placeholder={`Enter subject name for Semester ${form.semester}`}
              required
            />
            <p className="text-xs text-muted mt-1">Subject should be relevant to Semester {form.semester}</p>
          </div>
        )}

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-heading mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            className="form-input w-full"
            rows={3}
            placeholder={form.type === 'lab' ? 'Enter lab session description' : 'Enter lecture description'}
          />
        </div>

        {/* Language */}
        <div>
          <label className="block text-sm font-medium text-heading mb-1">Language</label>
          <select
            value={form.language}
            onChange={e => setForm(f => ({ ...f, language: e.target.value }))}
            className="form-input w-full"
          >
            <option value="en">English</option>
            <option value="hi">Hindi</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
          </select>
        </div>

        {/* Primary File Upload (Video/Audio) */}
        <div>
          <label className="block text-sm font-medium text-heading mb-1">
            {form.type === 'lab' ? 'Lab Recording / Media *' : 'Lecture File (Video, Audio, PDF) *'}
          </label>
          <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-blue-400 transition-colors">
            <input
              type="file"
              onChange={e => setFile(e.target.files[0])}
              className="hidden"
              id="file-upload"
              accept="video/*,audio/*,.pdf"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              {file ? (
                <div>
                  <p className="text-xs font-medium text-heading">{file.name}</p>
                  <p className="text-[10px] text-muted mt-0.5">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                </div>
              ) : (
                <div>
                  <p className="text-xs text-muted">Click to upload main video/audio</p>
                </div>
              )}
            </label>
          </div>
        </div>

        {/* Optional Attachment (PDF/Lab Manual) */}
        <div>
          <label className="block text-sm font-medium text-heading mb-1">
            {form.type === 'lab' ? 'Lab Manual / PDF (Optional)' : 'Additional Material (Optional PDF)'}
          </label>
          <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center hover:border-purple-300 transition-colors">
            <input
              type="file"
              onChange={e => setAttachment(e.target.files[0])}
              className="hidden"
              id="attachment-upload"
              accept=".pdf"
            />
            <label htmlFor="attachment-upload" className="cursor-pointer">
              {attachment ? (
                <div>
                  <p className="text-xs font-medium text-purple-700">{attachment.name}</p>
                </div>
              ) : (
                <div>
                  <p className="text-xs text-muted">Click to upload PDF manual/attachment</p>
                </div>
              )}
            </label>
          </div>
        </div>

        {/* Transcription Info */}
        {file && isTranscribableFile(file) && (
          <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <span className="text-xl mt-0.5">🎙️</span>
            <div>
              <p className="text-sm font-medium text-blue-800">Auto-Transcription Enabled</p>
              <p className="text-xs text-blue-600 mt-0.5">
                This audio/video file will be automatically transcribed using AI (Groq Whisper).
                The transcription will be available to students once processing is complete.
              </p>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        {uploading && (
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={uploading}
            className="btn-primary flex-1 disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : `Upload ${form.type === 'lab' ? 'Lab' : 'Lecture'}`}
          </button>
          <button
            type="button"
            onClick={() => navigate('/professor')}
            className="px-4 py-2 border border-border rounded-btn hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
