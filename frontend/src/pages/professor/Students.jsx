import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { usersAPI, coursesAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function ProfessorStudents() {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { 
    fetchCoursesAndStudents(); 
  }, [user?.courses]);

  useEffect(() => {
    filterStudents();
  }, [search, courses]);

  const fetchCoursesAndStudents = async () => {
    setLoading(true);
    try {
      // Use professor's courses directly from auth context
      if (!user?.courses || user.courses.length === 0) {
        setStudents([]);
        setCourses([]);
        setLoading(false);
        return;
      }
      
      setCourses(user.courses);
      
      // Get course IDs for filtering students
      const profCourseIds = new Set(user.courses.map(c => 
        typeof c === 'string' ? c : c._id
      ));
      
      // Fetch all students
      const studRes = await usersAPI.getAll({ role: 'student', limit: 200 });
      const allStudents = studRes.data.data || [];
      
      // Filter to only students enrolled in professor's courses
      const profStudents = allStudents.filter(s => {
        if (!s.courses || !Array.isArray(s.courses)) return false;
        return s.courses.some(c => profCourseIds.has(typeof c === 'string' ? c : c._id));
      });
      
      setStudents(profStudents);
    } catch (err) {
      toast.error('Failed to load students');
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const filterStudents = () => {
    // Search filtering is applied at display level
  };

  // Filter students by search term
  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-heading">Students</h1>
        <p className="text-muted mt-1">View students enrolled in your courses</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <input type="text" placeholder="Search students..." value={search} onChange={e => setSearch(e.target.value)} className="form-input flex-1" />
      </div>

      {loading ? (
        <div className="flex justify-center h-40"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>
      ) : filteredStudents.length === 0 ? (
        <div className="text-center py-12 bg-surface rounded-card border border-border">
          <p className="text-muted text-lg">{students.length === 0 ? 'No students enrolled yet' : 'No students match your search'}</p>
        </div>
      ) : (
        <div className="bg-surface rounded-card shadow-card border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted">Name</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted">Email</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted">Department</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredStudents.map(s => (
                  <tr key={s._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">{s.name?.[0]}</div>
                        <span className="font-medium text-heading">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted">{s.email}</td>
                    <td className="px-4 py-3 text-sm text-muted">{s.department?.name || '—'}</td>
                    <td className="px-4 py-3 text-sm text-muted">{new Date(s.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
