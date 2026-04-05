import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { lecturesAPI, quizzesAPI, coursesAPI, assignmentsAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function ProfessorDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ lectures: 0, quizzes: 0, courses: 0, assignments: 0 });
  const [recentLectures, setRecentLectures] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      if (!user?.id) {
        console.log('[Dashboard] No user ID, skipping fetch');
        setLoading(false);
        return;
      }

      console.log('[Dashboard] Fetching for professor:', user.name, 'Courses:', user.courses);

      // Fetch all data in parallel
      const [lectRes, quizRes, courseRes, assignRes] = await Promise.all([
        lecturesAPI.getAll({ uploadedBy: user.id, limit: 100 }).catch(e => ({ error: e })),
        quizzesAPI.getAll({ createdBy: user.id, limit: 100 }).catch(e => ({ error: e })),
        coursesAPI.getAll({ limit: 100 }).catch(e => ({ error: e })),
        assignmentsAPI.getAll({ createdBy: user.id, limit: 100 }).catch(e => ({ error: e }))
      ]);

      // Count lectures
      const lectureCount = (lectRes.data?.data || []).length;
      console.log('[Dashboard] Lectures:', lectureCount);
      const recentLecsList = (lectRes.data?.data || []).slice(0, 5);
      setRecentLectures(recentLecsList);

      // Count quizzes  
      const quizCount = (quizRes.data?.data || []).length;
      console.log('[Dashboard] Quizzes:', quizCount);

      // Count courses - direct from user.courses
      const courseCount = user?.courses?.length || 0;
      console.log('[Dashboard] Courses assigned:', courseCount);

      // Count assignments
      const assignmentCount = (assignRes.data?.data || []).length;
      console.log('[Dashboard] Assignments:', assignmentCount);

      // Update stats
      setStats({
        lectures: lectureCount,
        quizzes: quizCount,
        courses: courseCount,
        assignments: assignmentCount
      });

    } catch (err) {
      console.error('[Dashboard] Error:', err);
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-heading">Welcome, {user?.name || 'Professor'}!</h1>
        <p className="text-muted mt-1">Manage your lectures, quizzes, and students</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Lectures', value: stats.lectures, icon: '🎬', link: '/professor/my-lectures' },
          { label: 'Quizzes', value: stats.quizzes, icon: '📝', link: '/professor/quiz-builder' },
          { label: 'Courses', value: stats.courses, icon: '📚', link: '/professor/my-lectures' },
          { label: 'Assignments', value: stats.assignments, icon: '📋', link: '/professor/assignments' }
        ].map(s => (
          <Link to={s.link} key={s.label} className="bg-surface rounded-card shadow-card p-5 hover:shadow-lg transition-shadow border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted">{s.label}</p>
                <p className="text-2xl font-bold mt-1">{s.value}</p>
              </div>
              <span className="text-3xl">{s.icon}</span>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Lectures */}
        <div className="bg-surface rounded-card shadow-card border border-border">
          <div className="p-4 border-b border-border flex justify-between items-center">
            <h2 className="text-lg font-semibold text-heading">Recent Lectures</h2>
            <Link to="/professor/my-lectures" className="text-sm text-blue-600 hover:underline">View All</Link>
          </div>
          <div className="p-4">
            {recentLectures.length === 0 ? (
              <p className="text-muted text-center py-4">No lectures yet. <Link to="/professor/upload" className="text-blue-600 hover:underline">Upload one</Link></p>
            ) : (
              <div className="space-y-3">
                {recentLectures.map(l => (
                  <div key={l._id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-bold text-sm">{l.title?.[0]}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-heading truncate">{l.title}</p>
                      <p className="text-xs text-muted">{l.course?.name || 'General'} • {new Date(l.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-surface rounded-card shadow-card border border-border">
          <div className="p-4 border-b border-border">
            <h2 className="text-lg font-semibold text-heading">Quick Actions</h2>
          </div>
          <div className="p-4 grid grid-cols-2 gap-3">
            {[
              { label: 'Upload Lecture', link: '/professor/upload', icon: '📤' },
              { label: 'Create Quiz', link: '/professor/quiz-builder', icon: '📝' },
              { label: 'View Students', link: '/professor/students', icon: '👥' },
              { label: 'Analytics', link: '/professor/analytics', icon: '📊' }
            ].map(a => (
              <Link key={a.label} to={a.link} className="p-4 border border-border rounded-lg hover:bg-gray-50 text-center transition-colors">
                <span className="text-2xl">{a.icon}</span>
                <p className="text-sm font-medium text-heading mt-2">{a.label}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
