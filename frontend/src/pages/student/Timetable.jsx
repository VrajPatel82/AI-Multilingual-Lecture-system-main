import { useState, useEffect } from 'react';
import { timetableAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function StudentTimetable() {
  const [timetable, setTimetable] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchTimetable(); }, []);

  const fetchTimetable = async () => {
    try {
      const res = await timetableAPI.getAll();
      setTimetable(res.data.data || []);
    } catch (err) { toast.error('Failed to load timetable'); }
    finally { setLoading(false); }
  };

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const byDay = days.reduce((acc, day) => {
    acc[day] = timetable.filter(t => t.dayOfWeek === day).sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
    return acc;
  }, {});

  if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-heading">My Timetable</h1>

      {timetable.length === 0 ? (
        <div className="bg-surface rounded-card shadow-card border border-border p-12 text-center text-muted">No timetable entries found</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {days.map(day => (
            <div key={day} className="bg-surface rounded-card shadow-card border border-border">
              <div className="p-3 border-b border-border bg-gray-50">
                <h3 className="font-semibold text-heading">{day}</h3>
              </div>
              <div className="p-3 space-y-2">
                {byDay[day].length === 0 ? (
                  <p className="text-sm text-muted text-center py-2">No classes</p>
                ) : (
                  byDay[day].map((t, i) => (
                    <div key={i} className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-sm">{t.course?.name || t.subject || 'N/A'}</span>
                        <span className="text-xs text-muted">{t.startTime} - {t.endTime}</span>
                      </div>
                      {t.room && <p className="text-xs text-muted mt-1">Room: {t.room}</p>}
                      {t.professor?.name && <p className="text-xs text-muted">Prof: {t.professor.name}</p>}
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
