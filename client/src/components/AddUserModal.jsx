import { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { isEmail } from '../lib/validate';
import Modal from './Modal';
import FormField from './FormField';
import useFormValidation from '../hooks/useFormValidation';

const inputClass =
  'block w-full rounded-md border border-gray-300 px-3 py-2 text-sm ' +
  'focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 ' +
  'disabled:bg-gray-50 disabled:text-gray-500';

const INITIAL = { name: '', email: '', password: '', role: 'member' };

function validateAddUser(form) {
  const next = {};
  if (!form.name.trim()) next.name = 'Name is required';
  if (!form.email.trim()) next.email = 'Email is required';
  else if (!isEmail(form.email)) next.email = 'Enter a valid email address';
  if (!form.password) next.password = 'Password is required';
  else if (form.password.length < 6) next.password = 'At least 6 characters';
  return next;
}

export default function AddUserModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState(INITIAL);
  // Server-side field errors (e.g. 409 email conflict) live separately from
  // client validation so they don't disappear when the user re-types.
  const [serverErrors, setServerErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const { visibleError, markTouched, markAllTouched, isValid, reset: resetValidation } =
    useFormValidation(form, validateAddUser);

  const setField = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    if (serverErrors[key]) {
      setServerErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  const reset = () => {
    setForm(INITIAL);
    setServerErrors({});
    resetValidation();
  };

  const handleClose = () => {
    if (submitting) return;
    reset();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    markAllTouched();
    if (!isValid) return;
    setServerErrors({});
    setSubmitting(true);
    try {
      await api.post('/auth/register', {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        role: form.role,
      });
      toast.success('User created');
      reset();
      onCreated?.();
      onClose();
    } catch (err) {
      if (err.response?.status === 409) {
        setServerErrors({ email: 'Email already in use' });
      }
      toast.error(err.response?.data?.message || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  const errorFor = (key) => serverErrors[key] || visibleError(key);

  return (
    <Modal open={open} onClose={handleClose} title="Add user">
      <form onSubmit={handleSubmit} noValidate>
        <FormField label="Name" htmlFor="new-name" error={errorFor('name')} required>
          <input
            id="new-name"
            type="text"
            className={inputClass}
            value={form.name}
            onChange={setField('name')}
            onBlur={markTouched('name')}
            autoFocus
            disabled={submitting}
          />
        </FormField>

        <FormField label="Email" htmlFor="new-email" error={errorFor('email')} required>
          <input
            id="new-email"
            type="email"
            className={inputClass}
            value={form.email}
            onChange={setField('email')}
            onBlur={markTouched('email')}
            autoComplete="off"
            disabled={submitting}
          />
        </FormField>

        <FormField label="Password" htmlFor="new-password" error={errorFor('password')} required>
          <input
            id="new-password"
            type="password"
            className={inputClass}
            value={form.password}
            onChange={setField('password')}
            onBlur={markTouched('password')}
            autoComplete="new-password"
            disabled={submitting}
          />
        </FormField>

        <FormField label="Role" htmlFor="new-role" required>
          <select
            id="new-role"
            className={inputClass}
            value={form.role}
            onChange={setField('role')}
            disabled={submitting}
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
        </FormField>

        <div className="flex items-center justify-end gap-2 mt-4">
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="px-4 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 text-sm rounded-md bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitting ? 'Creating…' : 'Create user'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
