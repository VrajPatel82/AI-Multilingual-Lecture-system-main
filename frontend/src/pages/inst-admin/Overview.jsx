import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { adminAPI, notificationsAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function InstOverview() {
  const { user } = useAuth();
  const [stats, setStats] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [statsRes, notifRes] = await Promise.allSettled([
        adminAPI.getStats(),
        notificationsAPI.getMy({ limit: 5 })
      ]);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data.data || statsRes.value.data);
      if (notifRes.status === 'fulfilled') setNotifications(notifRes.value.data.data || []);
    } catch (err) { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  };

  if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-heading">Institution Overview</h1>
        <p className="text-muted mt-1">Welcome back, {user?.name}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Departments', value: stats.totalDepartments || stats.departments || 0, icon: '🏢' },
          { label: 'Courses', value: stats.totalCourses || stats.courses || 0, icon: '📚' },
          { label: 'Professors', value: stats.totalProfessors || stats.professors || 0, icon: '👨‍🏫' },
          { label: 'Students', value: stats.totalStudents || stats.students || 0, icon: '🎓' }
        ].map(s => (
          <div key={s.label} className="bg-surface rounded-card shadow-card border border-border p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted">{s.label}</p>
                <p className="text-2xl font-bold mt-1">{s.value}</p>
              </div>
              <span className="text-3xl">{s.icon}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface rounded-card shadow-card border border-border">
          <div className="p-4 border-b border-border"><h2 className="text-lg font-semibold text-heading">Quick Actions</h2></div>
          <div className="p-4 grid grid-cols-2 gap-3">
            {[
              { label: 'Departments', link: '/inst-admin/departments', icon: '🏢' },
              { label: 'Dept Admins', link: '/inst-admin/dept-admins', icon: '👤' },
              { label: 'Policies', link: '/inst-admin/policies', icon: '📋' },
              { label: 'Analytics', link: '/inst-admin/analytics', icon: '📊' }
            ].map(a => (
              <Link key={a.label} to={a.link} className="p-4 border border-border rounded-lg hover:bg-gray-50 text-center transition-colors">
                <span className="text-2xl">{a.icon}</span>
                <p className="text-sm font-medium mt-2">{a.label}</p>
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-surface rounded-card shadow-card border border-border">
          <div className="p-4 border-b border-border"><h2 className="text-lg font-semibold text-heading">Recent Notifications</h2></div>
          <div className="p-4">
            {notifications.length === 0 ? (
              <p className="text-muted text-center py-4">No notifications</p>
            ) : (
              <div className="space-y-2">
                {notifications.map(n => (
                  <div key={n._id} className={`p-3 rounded-lg ${n.isRead ? 'bg-gray-50' : 'bg-blue-50'}`}>
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="text-xs text-muted mt-1">{n.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
