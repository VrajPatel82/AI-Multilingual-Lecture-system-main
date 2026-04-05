import { useState, useEffect } from 'react';
import { notificationsAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function StudentNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchNotifications(); }, []);

  const fetchNotifications = async () => {
    try {
      const res = await notificationsAPI.getMy();
      setNotifications(res.data.data || []);
    } catch (err) { toast.error('Failed to load notifications'); }
    finally { setLoading(false); }
  };

  const markRead = async (id) => {
    try {
      await notificationsAPI.markRead(id);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch (err) { /* ignore */ }
  };

  const markAllRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      toast.success('All marked as read');
    } catch (err) { toast.error('Failed to mark all read'); }
  };

  const handleDelete = async (id) => {
    try {
      await notificationsAPI.delete(id);
      setNotifications(prev => prev.filter(n => n._id !== id));
      toast.success('Notification removed');
    } catch (err) { toast.error('Failed to delete'); }
  };

  const unread = notifications.filter(n => !n.isRead).length;

  if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-heading">Notifications</h1>
          {unread > 0 && <p className="text-muted mt-1">{unread} unread notification{unread !== 1 ? 's' : ''}</p>}
        </div>
        {unread > 0 && (
          <button onClick={markAllRead} className="px-4 py-2 border border-border rounded-btn text-sm hover:bg-gray-50">
            Mark All Read
          </button>
        )}
      </div>

      <div className="space-y-2">
        {notifications.length === 0 ? (
          <div className="bg-surface rounded-card shadow-card border border-border p-12 text-center text-muted">No notifications</div>
        ) : (
          notifications.map(n => (
            <div key={n._id} onClick={() => !n.isRead && markRead(n._id)}
              className={`bg-surface rounded-card border p-4 cursor-pointer transition-colors ${n.isRead ? 'border-border' : 'border-blue-300 bg-blue-50'}`}>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {!n.isRead && <div className="w-2 h-2 bg-blue-600 rounded-full"></div>}
                    <h3 className="font-medium text-sm">{n.title}</h3>
                  </div>
                  <p className="text-sm text-muted mt-1">{n.message}</p>
                  <p className="text-xs text-muted mt-2">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(n._id); }} className="text-red-500 hover:text-red-700 text-sm ml-2">✕</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
