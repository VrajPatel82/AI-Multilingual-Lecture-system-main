import { useState, useEffect } from 'react';
import { lecturesAPI } from '../../services/api';
import toast from 'react-hot-toast';

/**
 * EditContentModal
 * A reusable modal for professors to edit Lab/Lecture details and files.
 */
export default function EditContentModal({ isOpen, onClose, content, onUpdate }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    subject: '',
    experimentTitle: '',
    semester: ''
  });
  const [file, setFile] = useState(null);
  const [attachment, setAttachment] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (content) {
      setForm({
        title: content.title || '',
        description: content.description || '',
        subject: content.subject || '',
        experimentTitle: content.experimentTitle || '',
        semester: content.semester || ''
      });
    }
  }, [content]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('title', form.title);
      formData.append('description', form.description);
      formData.append('semester', form.semester);
      
      if (content.type === 'lab') {
        formData.append('subject', form.subject);
        formData.append('experimentTitle', form.experimentTitle);
      }

      if (file) formData.append('file', file);
      if (attachment) formData.append('attachment', attachment);

      const res = await lecturesAPI.update(content._id, formData);
      toast.success('Content updated successfully!');
      onUpdate(res.data.lecture);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <h2 className="font-bold text-gray-900">Edit {content.type === 'lab' ? 'Lab' : 'Lecture'} Details</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition-colors">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              required
            />
          </div>

          {/* Semester - MOVE UP */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Semester *</label>
            <select
              value={form.semester}
              onChange={e => setForm({ ...form, semester: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                <option key={s} value={s}>Semester {s}</option>
              ))}
            </select>
            <p className="text-[10px] text-gray-400 mt-1">Select the semester first, then update subject accordingly</p>
          </div>

          {/* Type-Specific Fields (for Labs) */}
          {content.type === 'lab' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Subject</label>
                <input
                  type="text"
                  value={form.subject}
                  onChange={e => setForm({ ...form, subject: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm"
                  placeholder={`Subject for Semester ${form.semester}`}
                />
                <p className="text-[10px] text-gray-400 mt-1">Must match Semester {form.semester} curriculum</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Experiment Title</label>
                <input
                  type="text"
                  value={form.experimentTitle}
                  onChange={e => setForm({ ...form, experimentTitle: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm"
                />
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm min-h-[100px]"
            />
          </div>

          <div className="border-t border-gray-100 pt-4 mt-2 bg-amber-50/30 p-4 rounded-xl">
            <p className="text-[10px] font-bold text-amber-600 uppercase mb-3 text-center tracking-widest">Update Files (Only if needed)</p>
            
            <div className="space-y-4">
              {/* Primary File Update */}
              <div className="bg-white p-3 rounded-lg border border-gray-200">
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 flex justify-between">
                  <span>1. Primary Media / Video</span>
                  {content.fileName && <span className="text-blue-600 normal-case font-medium">Currently: {content.fileName}</span>}
                </label>
                <input
                  type="file"
                  onChange={e => setFile(e.target.files[0])}
                  className="text-xs w-full file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-[10px] file:font-semibold file:bg-blue-50 file:text-blue-700"
                  accept="video/*,audio/*,.pdf"
                />
                <p className="text-[9px] text-gray-400 mt-1 italic">⚠️ Warning: Selecting a new file here will <strong>REPLACE</strong> your current video/recording.</p>
              </div>

              {/* Attachment Update */}
              <div className="bg-white p-3 rounded-lg border border-gray-200">
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 flex justify-between">
                  <span>2. PDF Attachment (Manual / PPT)</span>
                  {content.attachmentName && <span className="text-purple-600 normal-case font-medium">Currently: {content.attachmentName}</span>}
                </label>
                <input
                  type="file"
                  onChange={e => setAttachment(e.target.files[0])}
                  className="text-xs w-full file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-[10px] file:font-semibold file:bg-purple-50 file:text-purple-700"
                  accept=".pdf,.ppt,.pptx"
                />
                <p className="text-[9px] text-gray-400 mt-1 italic">✅ Tip: Use this to add or update your Lab Manual without affecting the video.</p>
              </div>
            </div>
          </div>
        </form>

        <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-200 transition-all disabled:opacity-50"
          >
            {loading ? 'Updating...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
