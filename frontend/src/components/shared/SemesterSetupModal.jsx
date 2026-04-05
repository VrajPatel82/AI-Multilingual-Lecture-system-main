import { useState } from 'react';
import toast from 'react-hot-toast';

export default function SemesterSetupModal({ isOpen, user, onComplete }) {
  const [selectedSemester, setSelectedSemester] = useState('1');
  const [loading, setLoading] = useState(false);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Update user semester in localStorage
      const updatedUser = { ...user, currentSemester: parseInt(selectedSemester) };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      // Call onComplete callback
      toast.success(`Semester ${selectedSemester} set successfully!`);
      onComplete(updatedUser);
    } catch (err) {
      toast.error('Failed to set semester');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">📚</div>
          <h2 className="text-2xl font-bold text-heading">Welcome, {user.name}!</h2>
          <p className="text-muted mt-2">Select your current semester to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-heading mb-3">
              What is your current semester? *
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSelectedSemester(s.toString())}
                  className={`py-3 px-2 rounded-lg font-medium transition-all text-center ${
                    selectedSemester === s.toString()
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-gray-100 text-heading hover:bg-gray-200'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted mt-3">
              💡 You can only access lectures and labs from your current semester and previous semesters
            </p>
          </div>

          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <p className="text-sm text-blue-700">
              <span className="font-medium">Selected Semester:</span> {selectedSemester}
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Setting up...' : 'Continue to Dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
}
