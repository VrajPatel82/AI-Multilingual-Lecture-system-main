import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function StudentProfile() {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', bio: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await authAPI.getProfile();
      const p = res.data.user || res.data;
      setProfile(p);
      setForm({ 
        name: p.name || '', 
        phone: p.phone || '', 
        bio: p.bio || ''
      });
    } catch (err) {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await authAPI.updateProfile(form);
      const updated = res.data.user || res.data;
      setProfile(updated);
      setEditing(false);
      toast.success('Profile updated');
      // Update context and localStorage
      updateUser({ 
        name: updated.name
      });
    } catch (err) {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
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
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-heading">My Profile</h1>
        <p className="text-muted mt-1">Manage your account information</p>
      </div>

      <div className="bg-surface rounded-card shadow-card border border-border p-6">
        {/* Avatar */}
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
            {(profile?.name || user?.name || 'U')[0].toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-heading">{profile?.name || user?.name}</h2>
            <p className="text-muted">{profile?.email || user?.email}</p>
            <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full capitalize">
              {profile?.role || user?.role}
            </span>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-heading mb-1">Full Name</label>
            {editing ? (
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="form-input w-full"
              />
            ) : (
              <p className="text-body p-2 bg-gray-50 rounded-lg">{profile?.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-heading mb-1">Email</label>
            <p className="text-body p-2 bg-gray-50 rounded-lg">{profile?.email}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-heading mb-1">Phone</label>
            {editing ? (
              <input
                type="text"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="form-input w-full"
                placeholder="Enter phone number"
              />
            ) : (
              <p className="text-body p-2 bg-gray-50 rounded-lg">{profile?.phone || 'Not set'}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-heading mb-1">Bio</label>
            {editing ? (
              <textarea
                value={form.bio}
                onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                className="form-input w-full"
                rows={3}
                placeholder="Tell us about yourself"
              />
            ) : (
              <p className="text-body p-2 bg-gray-50 rounded-lg">{profile?.bio || 'No bio set'}</p>
            )}
          </div>

          {profile?.institution && (
            <div>
              <label className="block text-sm font-medium text-heading mb-1">Institution</label>
              <p className="text-body p-2 bg-gray-50 rounded-lg">{profile.institution.name || 'N/A'}</p>
            </div>
          )}

          {profile?.department && (
            <div>
              <label className="block text-sm font-medium text-heading mb-1">Department</label>
              <p className="text-body p-2 bg-gray-50 rounded-lg">{profile.department.name || 'N/A'}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-heading mb-1">Current Semester</label>
            <p className="text-body p-2 bg-gray-50 rounded-lg">Semester {profile?.currentSemester || 1}</p>
            <p className="text-xs text-muted mt-1">Contact your department administrator to change your semester</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-heading mb-1">Member Since</label>
            <p className="text-body p-2 bg-gray-50 rounded-lg">{new Date(profile?.createdAt).toLocaleDateString()}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          {editing ? (
            <>
              <button onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button onClick={() => setEditing(false)} className="px-4 py-2 border border-border rounded-btn hover:bg-gray-50">
                Cancel
              </button>
            </>
          ) : (
            <button onClick={() => setEditing(true)} className="btn-primary">
              Edit Profile
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
