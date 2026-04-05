import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { lecturesAPI, quizzesAPI, assignmentsAPI, coursesAPI, notificationsAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ lectures: 0, labs: 0, quizzes: 0, assignments: 0, courses: 0 });
  const [recentLectures, setRecentLectures] = useState([]);
  const [recentLabs, setRecentLabs] = useState([]);
  const [upcomingQuizzes, setUpcomingQuizzes] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Get student's enrolled courses from user object
      const enrolledCourseIds = (user?.courses || [])
        .map(c => typeof c === 'string' ? c : c._id)
        .slice(0, 5);
      
      const courseParams = enrolledCourseIds.length > 0 ? enrolledCourseIds.join(',') : undefined;

      const [lecturesRes, labsRes, quizzesRes, assignmentsRes, notifRes] = await Promise.allSettled([
        lecturesAPI.getStudentContent({ limit: 5, sort: '-createdAt', type: 'lecture' }), // Gets all accessible semesters
        lecturesAPI.getStudentContent({ limit: 5, sort: '-createdAt', type: 'lab' }), // Gets all accessible semesters
        courseParams ? quizzesAPI.getAll({ limit: 5, sort: '-createdAt', course: courseParams }) : Promise.resolve({ data: { data: [] } }),
        courseParams ? assignmentsAPI.getAll({ limit: 5, course: courseParams }) : Promise.resolve({ data: { data: [] } }),
        notificationsAPI.getMy({ limit: 5 })
      ]);

      if (lecturesRes.status === 'fulfilled') {
        const ld = lecturesRes.value.data;
        setRecentLectures(ld.data || []);
        setStats(s => ({ ...s, lectures: ld.pagination?.total || (ld.data || []).length }));
      }
      if (labsRes.status === 'fulfilled') {
        const bd = labsRes.value.data;
        setRecentLabs(bd.data || []);
        setStats(s => ({ ...s, labs: bd.pagination?.total || (bd.data || []).length }));
      }
      if (quizzesRes.status === 'fulfilled') {
        const qd = quizzesRes.value.data;
        setUpcomingQuizzes(qd.data || []);
        setStats(s => ({ ...s, quizzes: qd.pagination?.total || (qd.data || []).length }));
      }
      if (assignmentsRes.status === 'fulfilled') {
        const ad = assignmentsRes.value.data;
        setStats(s => ({ ...s, assignments: ad.pagination?.total || (ad.data || []).length }));
      }
      // Set courses count from enrolled courses
      setStats(s => ({ ...s, courses: enrolledCourseIds.length }));
      if (notifRes.status === 'fulfilled') {
        const nd = notifRes.value.data;
        setNotifications(nd.data || []);
      }
    } catch (err) {
      toast.error('Failed to load dashboard data');
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-heading">Welcome back, {user?.name || 'Student'}!</h1>
        <p className="text-muted mt-1">Here&apos;s an overview of your academic activity.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Courses', value: stats.courses, icon: '📚', color: 'bg-blue-50 text-blue-700', link: '/student/lectures' },
          { label: 'Lectures', value: stats.lectures, icon: '🎓', color: 'bg-green-50 text-green-700', link: '/student/lectures' },
          { label: 'Labs', value: stats.labs, icon: '🧪', color: 'bg-purple-50 text-purple-700', link: '/student/labs' },
          { label: 'Quizzes', value: stats.quizzes, icon: '📝', color: 'bg-indigo-50 text-indigo-700', link: '/student/quiz' },
          { label: 'Assignments', value: stats.assignments, icon: '📋', color: 'bg-amber-50 text-amber-700', link: '/student/assignments' }
        ].map(stat => (
          <Link to={stat.link} key={stat.label} className="bg-surface rounded-card shadow-card p-5 hover:shadow-lg transition-shadow border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted">{stat.label}</p>
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
              </div>
              <span className={`text-3xl ${stat.color} p-3 rounded-xl`}>{stat.icon}</span>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Lectures */}
        <div className="bg-surface rounded-card shadow-card border border-border">
          <div className="p-4 border-b border-border flex justify-between items-center">
            <h2 className="text-lg font-semibold text-heading">Recent Lectures</h2>
            <Link to="/student/lectures" className="text-sm text-blue-600 hover:underline">View All</Link>
          </div>
          <div className="p-4">
            {recentLectures.length === 0 ? (
              <p className="text-muted text-center py-4">No lectures available yet.</p>
            ) : (
              <div className="space-y-3">
                {recentLectures.slice(0, 5).map(lecture => (
                  <Link to={`/student/lectures/${lecture._id}`} key={lecture._id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-bold text-sm">
                      {lecture.title?.[0] || 'L'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-heading truncate">{lecture.title}</p>
                      <p className="text-xs text-muted">{lecture.course?.name || 'General'} • {new Date(lecture.createdAt).toLocaleDateString()}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Labs */}
        <div className="bg-surface rounded-card shadow-card border border-border">
          <div className="p-4 border-b border-border flex justify-between items-center">
            <h2 className="text-lg font-semibold text-heading">Recent Labs</h2>
            <Link to="/student/labs" className="text-sm text-purple-600 hover:underline">View All</Link>
          </div>
          <div className="p-4">
            {recentLabs.length === 0 ? (
              <p className="text-muted text-center py-4">No labs available yet.</p>
            ) : (
              <div className="space-y-3">
                {recentLabs.slice(0, 5).map(lab => (
                  <Link to={`/student/labs/${lab._id}`} key={lab._id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 font-bold text-sm">
                      {lab.title?.[0] || 'L'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-heading truncate">{lab.title}</p>
                      <p className="text-xs text-muted">{lab.course?.name || 'General'} • {new Date(lab.createdAt).toLocaleDateString()}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Quizzes */}
        <div className="bg-surface rounded-card shadow-card border border-border">
          <div className="p-4 border-b border-border flex justify-between items-center">
            <h2 className="text-lg font-semibold text-heading">Recent Quizzes</h2>
            <Link to="/student/quiz" className="text-sm text-blue-600 hover:underline">View All</Link>
          </div>
          <div className="p-4">
            {upcomingQuizzes.length === 0 ? (
              <p className="text-muted text-center py-4">No quizzes available yet.</p>
            ) : (
              <div className="space-y-3">
                {upcomingQuizzes.slice(0, 5).map(quiz => (
                  <Link to={`/student/quiz/${quiz._id}`} key={quiz._id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 font-bold text-sm">
                      {quiz.title?.[0] || 'Q'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-heading truncate">{quiz.title}</p>
                      <p className="text-xs text-muted">
                        {quiz.questions?.length || 0} questions • {quiz.duration || 30} min
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${quiz.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {quiz.isActive !== false ? 'Active' : 'Closed'}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-surface rounded-card shadow-card border border-border">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-heading">Recent Notifications</h2>
        </div>
        <div className="p-4">
          {notifications.length === 0 ? (
            <p className="text-muted text-center py-4">No new notifications.</p>
          ) : (
            <div className="space-y-2">
              {notifications.map(notif => (
                <div key={notif._id} className={`p-3 rounded-lg ${notif.isRead ? 'bg-gray-50' : 'bg-blue-50'}`}>
                  <p className="text-sm font-medium text-heading">{notif.title}</p>
                  <p className="text-xs text-muted mt-1">{notif.message}</p>
                  <p className="text-xs text-muted mt-1">{new Date(notif.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
