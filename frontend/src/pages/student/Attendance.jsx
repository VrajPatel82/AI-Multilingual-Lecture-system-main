import { useState, useEffect } from 'react';
import { attendanceAPI, coursesAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function StudentAttendance() {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState('');

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [attRes, cRes] = await Promise.allSettled([
        attendanceAPI.getStudentAttendance(user?.id || user?._id),
        coursesAPI.getAll()
      ]);
      if (attRes.status === 'fulfilled') {
        const data = attRes.value.data;
        // Backend returns { records, stats } for student attendance
        setAttendance(data.records || data.data || []);
      }
      if (cRes.status === 'fulfilled') setCourses(cRes.value.data.data || []);
    } catch (err) { toast.error('Failed to load attendance'); }
    finally { setLoading(false); }
  };

  const filtered = selectedCourse ? attendance.filter(a => {
    const courseId = a.course?._id || a.course;
    return courseId === selectedCourse;
  }) : attendance;

  // Compute attendance stats from the nested students array
  const computeStats = () => {
    let total = 0, present = 0, absent = 0, late = 0;
    const userId = user?.id || user?._id;
    filtered.forEach(record => {
      const entry = record.students?.find(s => {
        const sid = s.student?._id || s.student;
        return sid === userId || sid?.toString() === userId;
      });
      if (entry) {
        total++;
        if (entry.status === 'present') present++;
        else if (entry.status === 'absent') absent++;
        else late++;
      }
    });
    return { total, present, absent, late };
  };

  const stats = computeStats();
  const pct = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;

  if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-heading">My Attendance</h1>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-surface rounded-card shadow-card border border-border p-5 text-center">
          <p className="text-3xl font-bold text-blue-600">{pct}%</p>
          <p className="text-sm text-muted mt-1">Overall</p>
        </div>
        <div className="bg-surface rounded-card shadow-card border border-border p-5 text-center">
          <p className="text-3xl font-bold text-green-600">{stats.present}</p>
          <p className="text-sm text-muted mt-1">Present</p>
        </div>
        <div className="bg-surface rounded-card shadow-card border border-border p-5 text-center">
          <p className="text-3xl font-bold text-red-600">{stats.absent}</p>
          <p className="text-sm text-muted mt-1">Absent</p>
        </div>
        <div className="bg-surface rounded-card shadow-card border border-border p-5 text-center">
          <p className="text-3xl font-bold text-amber-600">{stats.late}</p>
          <p className="text-sm text-muted mt-1">Late</p>
        </div>
      </div>

      <select value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)} className="form-input w-full max-w-md">
        <option value="">All Courses</option>
        {courses.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
      </select>

      <div className="bg-surface rounded-card shadow-card border border-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium text-muted">Date</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-muted">Course</th>
              <th className="text-center px-4 py-3 text-sm font-medium text-muted">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.length === 0 ? (
              <tr><td colSpan={3} className="text-center py-8 text-muted">No attendance records</td></tr>
            ) : (
              filtered.map((a, i) => {
                const userId = user?.id || user?._id;
                const entry = a.students?.find(s => {
                  const sid = s.student?._id || s.student;
                  return sid === userId || sid?.toString() === userId;
                });
                const status = entry?.status || 'N/A';
                return (
                  <tr key={a._id || i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{new Date(a.date || a.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-sm">{a.course?.name || 'N/A'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${status === 'present' ? 'bg-green-100 text-green-700' : status === 'late' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                        {status}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
