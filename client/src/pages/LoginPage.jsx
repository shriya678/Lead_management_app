import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { isEmail } from '../lib/validate';
import FormField from '../components/FormField';
import useFormValidation from '../hooks/useFormValidation';

const inputClass =
  'block w-full rounded-md border border-gray-300 px-3 py-2 text-sm ' +
  'focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 ' +
  'disabled:bg-gray-50 disabled:text-gray-500';

function validateLogin(form) {
  const next = {};
  if (!form.email.trim()) next.email = 'Email is required';
  else if (!isEmail(form.email)) next.email = 'Enter a valid email address';
  if (!form.password) next.password = 'Password is required';
  return next;
}

export default function LoginPage() {
  const { token, login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const from = location.state?.from || '/leads';

  const [form, setForm] = useState({ email: '', password: '' });
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { visibleError, markTouched, markAllTouched, isValid } = useFormValidation(
    form,
    validateLogin
  );

  if (token) return <Navigate to={from} replace />;

  const setField = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    if (serverError) setServerError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    markAllTouched();
    if (!isValid) return;
    setServerError('');
    setSubmitting(true);
    try {
      await login(form.email.trim().toLowerCase(), form.password);
      toast.success('Signed in');
      navigate(from, { replace: true });
    } catch (err) {
      const msg =
        err.response?.status === 401
          ? 'Invalid email or password'
          : err.response?.data?.message || 'Server error, try again';
      setServerError(msg);
      setForm((prev) => ({ ...prev, password: '' }));
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white border border-gray-200 rounded-lg shadow-sm p-6">
      <h1 className="text-2xl font-semibold text-gray-900">Log in</h1>
      <p className="mt-1 text-sm text-gray-500 mb-6">
        Sign in with your team credentials.
      </p>

      <form onSubmit={handleSubmit} noValidate>
        <FormField label="Email" htmlFor="email" error={visibleError('email')} required>
          <input
            id="email"
            type="email"
            className={inputClass}
            value={form.email}
            onChange={setField('email')}
            onBlur={markTouched('email')}
            autoComplete="username"
            autoFocus
            disabled={submitting}
          />
        </FormField>

        <FormField label="Password" htmlFor="password" error={visibleError('password')} required>
          <input
            id="password"
            type="password"
            className={inputClass}
            value={form.password}
            onChange={setField('password')}
            onBlur={markTouched('password')}
            autoComplete="current-password"
            disabled={submitting}
          />
        </FormField>

        {serverError && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-md text-sm text-rose-700">
            {serverError}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 w-full inline-flex justify-center items-center px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="mt-4 text-xs text-center text-gray-500">
          Need access? Contact your admin.
        </p>
      </form>

      <div className="mt-6 p-3 bg-gray-50 border border-gray-200 rounded-md text-xs text-gray-600">
        <p className="font-medium text-gray-700 mb-1">
          Demo credentials{' '}
          <span className="text-gray-400 font-normal">(training-task only)</span>
        </p>
        <p>
          <span className="inline-block w-14 font-mono">admin</span>
          admin@demo.com · Admin@123
        </p>
        <p>
          <span className="inline-block w-14 font-mono">member</span>
          member@demo.com · Member@123
        </p>
      </div>
    </div>
  );
}
