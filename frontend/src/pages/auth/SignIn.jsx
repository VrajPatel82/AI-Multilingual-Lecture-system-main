import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import SemesterSetupModal from '../../components/shared/SemesterSetupModal'
import toast from 'react-hot-toast'

const MOCK_CREDENTIALS = [
  { role: 'Super Admin', email: 'admin@superadmin.com', password: 'Password@123' },
  { role: 'Inst Admin', email: 'admin@iitb.ac.in', password: 'Password@123' },
  { role: 'Dept Admin', email: 'hod.cse@iitb.ac.in', password: 'Password@123' },
  { role: 'Professor', email: 'vikram@iitb.ac.in', password: 'Password@123' },
  { role: 'Student', email: 'rahul@iitb.ac.in', password: 'Password@123' }
]

const signInImage = "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=670&h=590&fit=crop"

export default function SignIn() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [remember, setRemember] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showSemesterModal, setShowSemesterModal] = useState(false)
  const [loginUser, setLoginUser] = useState(null)

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const userData = await login(formData.email, formData.password)
      
      // For students without currentSemester set, show modal
      if (userData.role === 'student' && (!userData.currentSemester || userData.currentSemester < 1)) {
        setLoginUser(userData)
        setShowSemesterModal(true)
        return
      }
      
      toast.success('Welcome back!')
      navigateUser(userData)
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid credentials'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const navigateUser = (userData) => {
    switch (userData.role) {
      case 'student': navigate('/student/dashboard'); break
      case 'professor': navigate('/professor/dashboard'); break
      case 'dept_admin': navigate('/dept-admin/overview'); break
      case 'inst_admin': navigate('/inst-admin/overview'); break
      case 'super_admin': navigate('/super-admin/overview'); break
      default: navigate('/student/dashboard')
    }
  }

  const handleSemesterSetupComplete = (updatedUser) => {
    setShowSemesterModal(false)
    toast.success('Semester set! Redirecting...')
    setTimeout(() => navigateUser(updatedUser), 500)
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-[#f2f7ff] to-white">
      <div className="flex w-[1440px] max-w-full min-h-screen items-center justify-center px-8">
        {/* Left image */}
        <div className="hidden lg:block w-[670px] h-[590px] rounded-[20px] overflow-hidden shrink-0 mr-8">
          <img
            src={signInImage}
            alt="Learning illustration"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Right form */}
        <div className="relative w-full max-w-[540px] rounded-[20px] p-12 bg-surface shadow-card border border-border">
          <h1 className="text-[44px] font-extrabold text-heading text-center mb-2">
            Welcome Back!
          </h1>
          <p className="text-[16px] font-medium text-muted text-center mb-12">
            Sign in to access your learning portal
          </p>

          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-heading mb-2">Email</label>
              <input
                type="email"
                name="email"
                placeholder="rahul.v@iitb.ac.in"
                value={formData.email}
                onChange={handleChange}
                required
                className="form-input w-full"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-heading mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="form-input w-full pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted hover:text-heading transition-colors"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-4.803m5.596-3.856a3.375 3.375 0 11-4.753 4.753m4.753-4.753L3.596 3.596m16.807 16.807L9.404 9.404m0 0L6.343 6.343" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Remember & Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="w-4 h-4 accent-blue-600"
                />
                <span className="text-sm text-body">Remember me</span>
              </label>
              <a href="#" className="text-sm text-blue-600 hover:underline">
                Forgot password?
              </a>
            </div>

            {/* Sign in button */}
            <button
              type="submit"
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>

            {/* Sign up link */}
            <p className="text-center text-sm text-body">
              Don&apos;t have an account?{' '}
              <Link to="/signup" className="text-blue-600 font-medium hover:underline">
                Sign up
              </Link>
            </p>
          </form>

          {/* Demo Credentials */}
          <div className="mt-6 pt-4 border-t border-border">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Demo Credentials</h3>
            <ul className="space-y-2">
              {MOCK_CREDENTIALS.map((account) => (
                <li key={account.role} className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-heading">{account.role}</span>
                  <span className="text-muted">{account.email} / {account.password}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Semester Setup Modal */}
      <SemesterSetupModal 
        isOpen={showSemesterModal}
        user={loginUser}
        onComplete={handleSemesterSetupComplete}
      />
    </div>
  )
}
