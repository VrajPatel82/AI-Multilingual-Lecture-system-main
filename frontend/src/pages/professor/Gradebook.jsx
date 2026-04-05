import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { gradebookAPI, coursesAPI, usersAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function ProfGradebook() {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [gradebook, setGradebook] = useState(null);
  const [studentGrades, setStudentGrades] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingGradebook, setLoadingGradebook] = useState(false);

  // Component setup
  const [showComponentForm, setShowComponentForm] = useState(false);
  const [components, setComponents] = useState([{ name: '', weightage: '', maxMarks: '' }]);

  // Grade entry
  const [showGradeForm, setShowGradeForm] = useState(false);
  const [students, setStudents] = useState([]);
  const [gradeForm, setGradeForm] = useState({ student: '', componentName: '', marksObtained: '' });

  useEffect(() => { fetchCourses(); }, [user?.courses]);

  const fetchCourses = async () => {
    try {
      // Use user.courses directly - it's already populated from auth
      if (user?.courses?.length) {
        setCourses(user.courses);
      } else {
        setCourses([]);
      }
    } catch (err) { 
      toast.error('Failed to load courses');
    }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (selectedCourse) {
      fetchGradebook();
      fetchCourseStudents();
    } else {
      setGradebook(null);
      setStudentGrades([]);
      setStats(null);
      setStudents([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCourse]);

  const fetchGradebook = async () => {
    setLoadingGradebook(true);
    try {
      const res = await gradebookAPI.getCourse(selectedCourse);
      setGradebook(res.data.gradebook || null);
      setStudentGrades(res.data.studentGrades || []);
      setStats(res.data.stats || null);
    } catch (err) {
      if (err.response?.status === 404) {
        setGradebook(null);
        setStudentGrades([]);
        setStats(null);
      } else {
        toast.error('Failed to load gradebook');
      }
    }
    finally { setLoadingGradebook(false); }
  };

  const fetchCourseStudents = async () => {
    try {
      // Get all students
      const allStudentsRes = await usersAPI.getAll({ role: 'student', limit: 200 });
      const allStudents = allStudentsRes.data.data || [];
      
      // Filter to students in the selected course
      const selectedCourseData = courses.find(c => c._id === selectedCourse);
      if (selectedCourseData && selectedCourseData.enrolledStudents) {
        const enrolledIds = selectedCourseData.enrolledStudents.map(s => 
          typeof s === 'string' ? s : s._id
        );
        const courseStudents = allStudents.filter(s => enrolledIds.includes(s._id));
        setStudents(courseStudents);
      }
    } catch (err) { /* students list optional */ }
  };

  const handleSetComponents = async (e) => {
    e.preventDefault();
    const parsed = components.map(c => ({
      name: c.name,
      weightage: parseFloat(c.weightage),
      maxMarks: parseInt(c.maxMarks)
    }));

    const totalWeight = parsed.reduce((sum, c) => sum + c.weightage, 0);
    if (totalWeight !== 100) {
      toast.error(`Total weightage must be 100% (currently ${totalWeight}%)`);
      return;
    }

    try {
      await gradebookAPI.setComponents(selectedCourse, { components: parsed });
      toast.success('Grade components saved');
      setShowComponentForm(false);
      fetchGradebook();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save components'); }
  };

  const handleEnterGrade = async (e) => {
    e.preventDefault();
    try {
      await gradebookAPI.enterGrades(selectedCourse, {
        grades: [{
          student: gradeForm.student,
          componentName: gradeForm.componentName,
          marksObtained: parseFloat(gradeForm.marksObtained)
        }]
      });
      toast.success('Grade entered');
      setGradeForm({ student: '', componentName: '', marksObtained: '' });
      setShowGradeForm(false);
      fetchGradebook();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to enter grade'); }
  };

  const addComponentRow = () => {
    setComponents([...components, { name: '', weightage: '', maxMarks: '' }]);
  };

  const removeComponentRow = (idx) => {
    setComponents(components.filter((_, i) => i !== idx));
  };

  const updateComponent = (idx, field, value) => {
    const updated = [...components];
    updated[idx] = { ...updated[idx], [field]: value };
    setComponents(updated);
  };

  const openComponentForm = () => {
    if (gradebook?.components?.length) {
      setComponents(gradebook.components.map(c => ({
        name: c.name,
        weightage: c.weightage.toString(),
        maxMarks: c.maxMarks.toString()
      })));
    } else {
      setComponents([{ name: '', weightage: '', maxMarks: '' }]);
    }
    setShowComponentForm(true);
  };

  if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-heading">Gradebook</h1>
        {selectedCourse && (
          <div className="flex gap-2">
            <button onClick={openComponentForm} className="border border-border px-4 py-2 rounded-btn text-sm hover:bg-gray-50">
              {gradebook ? 'Edit Components' : 'Setup Components'}
            </button>
            {gradebook && (
              <button onClick={() => setShowGradeForm(!showGradeForm)} className="btn-primary px-4 py-2 rounded-btn text-sm">
                {showGradeForm ? 'Cancel' : '+ Enter Grade'}
              </button>
            )}
          </div>
        )}
      </div>

      <select value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)} className="form-input w-full max-w-md">
        <option value="">Select Course</option>
        {courses.map(c => <option key={c._id} value={c._id}>{c.name} ({c.code})</option>)}
      </select>

      {/* Component Setup Form */}
      {showComponentForm && (
        <form onSubmit={handleSetComponents} className="bg-surface rounded-card shadow-card border border-border p-6 space-y-4">
          <h2 className="text-lg font-semibold text-heading">Grade Components (total weightage must = 100%)</h2>
          {components.map((comp, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input type="text" value={comp.name} onChange={e => updateComponent(i, 'name', e.target.value)} className="form-input w-full" required placeholder="e.g., Midterm Exam" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Weightage (%) *</label>
                <input type="number" value={comp.weightage} onChange={e => updateComponent(i, 'weightage', e.target.value)} className="form-input w-full" required min={0} max={100} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Max Marks *</label>
                <input type="number" value={comp.maxMarks} onChange={e => updateComponent(i, 'maxMarks', e.target.value)} className="form-input w-full" required min={1} />
              </div>
              <div>
                {components.length > 1 && (
                  <button type="button" onClick={() => removeComponentRow(i)} className="text-red-600 hover:text-red-800 text-sm px-3 py-2">Remove</button>
                )}
              </div>
            </div>
          ))}
          <div className="flex gap-3">
            <button type="button" onClick={addComponentRow} className="border border-border px-4 py-2 rounded-btn text-sm hover:bg-gray-50">+ Add Component</button>
            <button type="submit" className="btn-primary px-4 py-2 rounded-btn text-sm">Save Components</button>
            <button type="button" onClick={() => setShowComponentForm(false)} className="text-muted text-sm px-4 py-2">Cancel</button>
          </div>
        </form>
      )}

      {/* Grade Entry Form */}
      {showGradeForm && gradebook && (
        <form onSubmit={handleEnterGrade} className="bg-surface rounded-card shadow-card border border-border p-6 space-y-4">
          <h2 className="text-lg font-semibold text-heading">Enter Grade</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Student *</label>
              <select value={gradeForm.student} onChange={e => setGradeForm({...gradeForm, student: e.target.value})} className="form-input w-full" required>
                <option value="">Select student</option>
                {students.map(s => <option key={s._id} value={s._id}>{s.name} ({s.email})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Component *</label>
              <select value={gradeForm.componentName} onChange={e => setGradeForm({...gradeForm, componentName: e.target.value})} className="form-input w-full" required>
                <option value="">Select component</option>
                {gradebook.components.map(c => <option key={c.name} value={c.name}>{c.name} (Max: {c.maxMarks})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Marks Obtained *</label>
              <input type="number" value={gradeForm.marksObtained} onChange={e => setGradeForm({...gradeForm, marksObtained: e.target.value})} className="form-input w-full" required min={0} />
            </div>
          </div>
          <button type="submit" className="btn-primary px-4 py-2 rounded-btn text-sm">Enter Grade</button>
        </form>
      )}

      {!selectedCourse ? (
        <div className="bg-surface rounded-card shadow-card border border-border p-12 text-center text-muted">Select a course to view gradebook</div>
      ) : loadingGradebook ? (
        <div className="flex justify-center items-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
      ) : !gradebook ? (
        <div className="bg-surface rounded-card shadow-card border border-border p-12 text-center text-muted">
          <p className="text-lg mb-2">No gradebook set up for this course</p>
          <p className="text-sm">Click &quot;Setup Components&quot; to define grade components first.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="bg-surface rounded-card shadow-card border border-border p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">{stats.totalStudents}</p>
                <p className="text-xs text-muted mt-1">Students</p>
              </div>
              <div className="bg-surface rounded-card shadow-card border border-border p-4 text-center">
                <p className="text-2xl font-bold text-green-600">{stats.average}%</p>
                <p className="text-xs text-muted mt-1">Average</p>
              </div>
              <div className="bg-surface rounded-card shadow-card border border-border p-4 text-center">
                <p className="text-2xl font-bold text-purple-600">{stats.highest}%</p>
                <p className="text-xs text-muted mt-1">Highest</p>
              </div>
              <div className="bg-surface rounded-card shadow-card border border-border p-4 text-center">
                <p className="text-2xl font-bold text-amber-600">{stats.lowest}%</p>
                <p className="text-xs text-muted mt-1">Lowest</p>
              </div>
              <div className="bg-surface rounded-card shadow-card border border-border p-4 text-center">
                <p className="text-2xl font-bold text-green-600">{stats.passCount}</p>
                <p className="text-xs text-muted mt-1">Pass</p>
              </div>
              <div className="bg-surface rounded-card shadow-card border border-border p-4 text-center">
                <p className="text-2xl font-bold text-red-600">{stats.failCount}</p>
                <p className="text-xs text-muted mt-1">Fail</p>
              </div>
            </div>
          )}

          {/* Components overview */}
          <div className="bg-surface rounded-card shadow-card border border-border p-5">
            <h3 className="text-sm font-semibold text-heading mb-3">Components</h3>
            <div className="flex flex-wrap gap-3">
              {gradebook.components.map(c => (
                <span key={c.name} className="bg-blue-50 text-blue-700 text-xs px-3 py-1.5 rounded-full">
                  {c.name} ({c.weightage}% · Max {c.maxMarks})
                </span>
              ))}
            </div>
          </div>

          {/* Student grades table */}
          <div className="bg-surface rounded-card shadow-card border border-border overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted">Student</th>
                  {gradebook.components.map(c => (
                    <th key={c.name} className="text-center px-4 py-3 text-sm font-medium text-muted">{c.name}</th>
                  ))}
                  <th className="text-center px-4 py-3 text-sm font-medium text-muted">Total (%)</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-muted">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {studentGrades.length === 0 ? (
                  <tr><td colSpan={gradebook.components.length + 3} className="text-center py-8 text-muted">No grades entered yet</td></tr>
                ) : (
                  studentGrades.map((sg, i) => (
                    <tr key={sg.student?._id || i} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium">{sg.student?.name || 'N/A'}</td>
                      {gradebook.components.map(c => {
                        const comp = sg.components?.[c.name];
                        return (
                          <td key={c.name} className="px-4 py-3 text-center text-sm">
                            {comp ? `${comp.obtained}/${comp.max}` : '—'}
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 text-center text-sm font-semibold">{sg.totalWeighted}%</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          sg.letterGrade === 'A+' || sg.letterGrade === 'A' ? 'bg-green-100 text-green-700' :
                          sg.letterGrade === 'B' ? 'bg-blue-100 text-blue-700' :
                          sg.letterGrade === 'C' ? 'bg-amber-100 text-amber-700' :
                          sg.letterGrade === 'F' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>{sg.letterGrade}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
