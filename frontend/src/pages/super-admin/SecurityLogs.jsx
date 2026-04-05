import { useState, useEffect } from 'react';
import { auditLogsAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function SuperSecurityLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [search, setSearch] = useState('');

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchLogs(); }, [page]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await auditLogsAPI.getAll({ page, limit: 20, search });
      const data = res.data;
      setLogs(data.data || []);
      setPagination(data.pagination || {});
    } catch (err) { toast.error('Failed to load audit logs'); }
    finally { setLoading(false); }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const actionColors = {
    login: 'bg-green-100 text-green-700',
    logout: 'bg-gray-100 text-gray-700',
    create: 'bg-blue-100 text-blue-700',
    update: 'bg-amber-100 text-amber-700',
    delete: 'bg-red-100 text-red-700'
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-heading">Security & Audit Logs</h1>
        <p className="text-muted mt-1">Track all system activities</p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <input type="text" placeholder="Search logs..." value={search} onChange={e => setSearch(e.target.value)} className="form-input flex-1 max-w-md" />
        <button type="submit" className="btn-primary px-4 py-2 rounded-btn text-sm">Search</button>
      </form>

      {loading ? (
        <div className="flex justify-center items-center h-32"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
      ) : (
        <div className="bg-surface rounded-card shadow-card border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted">Time</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted">User</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted">Action</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted">Resource</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted">Details</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-muted">No audit logs found</td></tr>
                ) : (
                  logs.map(log => (
                    <tr key={log._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-muted whitespace-nowrap">
                        {new Date(log.createdAt || log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div>
                          <span className="font-medium">{log.user?.name || log.userName || '—'}</span>
                          {log.user?.email && <p className="text-xs text-muted">{log.user.email}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${actionColors[log.action] || 'bg-gray-100 text-gray-700'}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">{log.resource || log.resourceType || '—'}</td>
                      <td className="px-4 py-3 text-sm text-muted max-w-xs truncate">{log.details || log.description || '—'}</td>
                      <td className="px-4 py-3 text-sm text-muted">{log.ipAddress || log.ip || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {(pagination.totalPages > 1) && (
            <div className="p-4 border-t border-border flex items-center justify-between">
              <p className="text-sm text-muted">
                Page {pagination.currentPage || page} of {pagination.totalPages}
              </p>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1.5 border border-border rounded-btn text-sm disabled:opacity-50 hover:bg-gray-50">
                  Previous
                </button>
                <button onClick={() => setPage(p => p + 1)} disabled={page >= (pagination.totalPages || 1)} className="px-3 py-1.5 border border-border rounded-btn text-sm disabled:opacity-50 hover:bg-gray-50">
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
