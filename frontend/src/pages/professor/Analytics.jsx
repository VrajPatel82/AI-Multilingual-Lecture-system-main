import { useState, useEffect } from 'react';
import { coursesAPI, analyticsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function ProfessorAnalytics() {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState('1');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [courseAnalytics, setCourseAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchCourses(); }, []);

  useEffect(() => {
    if (selectedCourse) fetchCourseAnalytics();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCourse]);

  const fetchCourses = async () => {
    try {
      // Use user.courses directly - it's already populated from auth
      const assignedCourses = user?.courses?.length ? user.courses : [];
      
      setCourses(assignedCourses);
      if (assignedCourses.length > 0) setSelectedCourse(assignedCourses[0]._id);
    } catch (err) {
      toast.error('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const fetchCourseAnalytics = async () => {
    try {
      const res = await analyticsAPI.getCourse(selectedCourse);
      setCourseAnalytics(res.data.data || res.data);
    } catch (err) {
      setCourseAnalytics(null);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-heading">Analytics</h1>
        <p className="text-muted mt-1">View performance analytics for your courses</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Semester</label>
          <select value={selectedSemester} onChange={e => { setSelectedSemester(e.target.value); setSelectedCourse(''); }} className="form-input w-full sm:w-48">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>Semester {s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Course</label>
          <select value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)} className="form-input w-full sm:w-48">
            <option value="">Select a course</option>
            {courses.filter(c => !c.semester || c.semester == selectedSemester).map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
          {courses.filter(c => !c.semester || c.semester == selectedSemester).length === 0 && (
            <p className="text-xs text-amber-600 mt-1">No courses for Semester {selectedSemester}</p>
          )}
        </div>
      </div>

      {!courseAnalytics ? (
        <div className="text-center py-12 bg-surface rounded-card border border-border">
          <p className="text-muted">Select a course to view analytics</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-surface rounded-card shadow-card border border-border p-5">
              <p className="text-sm text-muted">Total Students</p>
              <p className="text-2xl font-bold text-heading mt-1">{courseAnalytics.totalStudents || 0}</p>
            </div>
            <div className="bg-surface rounded-card shadow-card border border-border p-5">
              <p className="text-sm text-muted">Avg Attendance</p>
              <p className="text-2xl font-bold text-heading mt-1">{courseAnalytics.avgAttendance ? `${Math.round(courseAnalytics.avgAttendance)}%` : 'N/A'}</p>
            </div>
            <div className="bg-surface rounded-card shadow-card border border-border p-5">
              <p className="text-sm text-muted">Avg Quiz Score</p>
              <p className="text-2xl font-bold text-heading mt-1">{courseAnalytics.avgQuizScore ? `${Math.round(courseAnalytics.avgQuizScore)}%` : 'N/A'}</p>
            </div>
            <div className="bg-surface rounded-card shadow-card border border-border p-5">
              <p className="text-sm text-muted">Lectures</p>
              <p className="text-2xl font-bold text-heading mt-1">{courseAnalytics.totalLectures || 0}</p>
            </div>
          </div>

          {/* Quiz Performance */}
          {courseAnalytics.quizPerformance && courseAnalytics.quizPerformance.length > 0 && (
            <div className="bg-surface rounded-card shadow-card border border-border">
              <div className="p-4 border-b border-border">
                <h2 className="text-lg font-semibold text-heading">Quiz Performance</h2>
              </div>
              <div className="p-4 space-y-3">
                {courseAnalytics.quizPerformance.map((qp, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <div>
                      <p className="font-medium text-heading">{qp.title || qp.quiz?.title || `Quiz ${idx+1}`}</p>
                      <p className="text-xs text-muted">{qp.attempts || 0} attempts</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-blue-600">{Math.round(qp.avgScore || 0)}%</p>
                      <p className="text-xs text-muted">avg score</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Attendance Trend */}
          {courseAnalytics.attendanceTrend && courseAnalytics.attendanceTrend.length > 0 && (
            <div className="bg-surface rounded-card shadow-card border border-border">
              <div className="p-4 border-b border-border">
                <h2 className="text-lg font-semibold text-heading">Attendance Trend</h2>
              </div>
              <div className="p-4">
                <div className="flex items-end gap-1 h-32">
                  {courseAnalytics.attendanceTrend.map((at, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center">
                      <div className="w-full bg-blue-500 rounded-t" style={{ height: `${at.percentage || 0}%` }}></div>
                      <span className="text-xs text-muted mt-1 truncate w-full text-center">{at.date ? new Date(at.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }) : idx+1}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
