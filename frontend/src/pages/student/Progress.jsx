import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { analyticsAPI, attendanceAPI, coursesAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function StudentProgress() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProgress();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchProgress = async () => {
    try {
      const [analyticsRes, coursesRes, attendanceRes] = await Promise.allSettled([
        analyticsAPI.getStudent(user.id),
        coursesAPI.getAll({ limit: 50 }),
        attendanceAPI.getStudentAttendance(user.id, { limit: 100 })
      ]);

      if (analyticsRes.status === 'fulfilled') {
        setAnalytics(analyticsRes.value.data.data || analyticsRes.value.data);
      }
      if (coursesRes.status === 'fulfilled') {
        setCourses(coursesRes.value.data.data || []);
      }
      if (attendanceRes.status === 'fulfilled') {
        setAttendance(attendanceRes.value.data.data || attendanceRes.value.data.attendance || []);
      }
    } catch (err) {
      toast.error('Failed to load progress data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const quizStats = analytics?.quizzes || {};
  const assignmentStats = analytics?.assignments || {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-heading">My Progress</h1>
        <p className="text-muted mt-1">Track your academic performance</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface rounded-card shadow-card border border-border p-5">
          <p className="text-sm text-muted">Courses Enrolled</p>
          <p className="text-2xl font-bold text-heading mt-1">{courses.length}</p>
        </div>
        <div className="bg-surface rounded-card shadow-card border border-border p-5">
          <p className="text-sm text-muted">Quizzes Taken</p>
          <p className="text-2xl font-bold text-heading mt-1">{quizStats.totalAttempted || 0}</p>
        </div>
        <div className="bg-surface rounded-card shadow-card border border-border p-5">
          <p className="text-sm text-muted">Avg Quiz Score</p>
          <p className="text-2xl font-bold text-heading mt-1">{quizStats.averageScore ? `${Math.round(quizStats.averageScore)}%` : 'N/A'}</p>
        </div>
        <div className="bg-surface rounded-card shadow-card border border-border p-5">
          <p className="text-sm text-muted">Assignments Done</p>
          <p className="text-2xl font-bold text-heading mt-1">{assignmentStats.totalSubmitted || 0}</p>
        </div>
      </div>

      {/* Courses Progress */}
      <div className="bg-surface rounded-card shadow-card border border-border">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-heading">Course Progress</h2>
        </div>
        <div className="p-4">
          {courses.length === 0 ? (
            <p className="text-muted text-center py-4">No courses enrolled</p>
          ) : (
            <div className="space-y-4">
              {courses.map(course => {
                const courseAttendance = attendance.filter(a =>
                  a.course?._id === course._id || a.course === course._id
                );
                const totalClasses = courseAttendance.length;
                const present = courseAttendance.filter(a => {
                  const record = a.students?.find(s => s.student === user.id || s.student?._id === user.id);
                  return record?.status === 'present';
                }).length;
                const attendancePercent = totalClasses > 0 ? Math.round((present / totalClasses) * 100) : 0;

                return (
                  <div key={course._id} className="p-4 border border-border rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <p className="font-medium text-heading">{course.name}</p>
                        <p className="text-xs text-muted">{course.code} • Semester {course.semester}</p>
                      </div>
                      <span className="text-sm font-medium text-blue-600">{attendancePercent}% attendance</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${attendancePercent >= 75 ? 'bg-green-500' : attendancePercent >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${attendancePercent}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Quiz Results */}
      {analytics?.quizResults && analytics.quizResults.length > 0 && (
        <div className="bg-surface rounded-card shadow-card border border-border">
          <div className="p-4 border-b border-border">
            <h2 className="text-lg font-semibold text-heading">Recent Quiz Results</h2>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              {analytics.quizResults.slice(0, 10).map((result, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div>
                    <p className="font-medium text-heading">{result.quiz?.title || 'Quiz'}</p>
                    <p className="text-xs text-muted">{new Date(result.submittedAt || result.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${result.percentage >= 70 ? 'text-green-600' : result.percentage >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                      {result.percentage || 0}%
                    </p>
                    <p className="text-xs text-muted">{result.score}/{result.totalMarks || result.total}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
