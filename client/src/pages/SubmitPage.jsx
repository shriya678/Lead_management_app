import { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { isEmail } from '../lib/validate';
import FormField from '../components/FormField';

const SOURCES = [
  { value: 'website', label: 'Website' },
  { value: 'referral', label: 'Referral' },
  { value: 'ad', label: 'Ad' },
  { value: 'other', label: 'Other' },
];

const INITIAL = {
  name: '',
  email: '',
  phone: '',
  company: '',
  source: 'website',
  website: '',
};

const inputClass =
  'block w-full rounded-md border border-gray-300 px-3 py-2 text-sm ' +
  'focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 ' +
  'disabled:bg-gray-50 disabled:text-gray-500';

export default function SubmitPage() {
  const [form, setForm] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const setField = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = 'Name is required';
    if (!form.email.trim()) next.email = 'Email is required';
    else if (!isEmail(form.email)) next.email = 'Enter a valid email address';
    return next;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const v = validate();
    if (Object.keys(v).length > 0) {
      setErrors(v);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      await api.post('/public/leads', {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim() || undefined,
        company: form.company.trim() || undefined,
        source: form.source,
        website: form.website,
      });
      setSubmitted(true);
      toast.success('Submitted — thanks!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Server error, try again');
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setForm(INITIAL);
    setErrors({});
    setSubmitted(false);
  };

  if (submitted) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 text-center">
        <h1 className="text-2xl font-semibold text-gray-900">Thanks — we&apos;ll be in touch.</h1>
        <p className="mt-2 text-gray-500">
          Your submission has been received. Someone from our team will reach out soon.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex items-center px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
        >
          Submit another
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
      <h1 className="text-2xl font-semibold text-gray-900">Submit a lead</h1>
      <p className="mt-1 text-sm text-gray-500 mb-6">
        Tell us a bit about yourself — someone will get in touch soon.
      </p>

      <form onSubmit={handleSubmit} noValidate>
        <FormField label="Name" htmlFor="name" error={errors.name} required>
          <input
            id="name"
            type="text"
            className={inputClass}
            value={form.name}
            onChange={setField('name')}
            autoComplete="name"
            disabled={submitting}
          />
        </FormField>

        <FormField label="Email" htmlFor="email" error={errors.email} required>
          <input
            id="email"
            type="email"
            className={inputClass}
            value={form.email}
            onChange={setField('email')}
            autoComplete="email"
            disabled={submitting}
          />
        </FormField>

        <FormField label="Phone" htmlFor="phone">
          <input
            id="phone"
            type="tel"
            className={inputClass}
            value={form.phone}
            onChange={setField('phone')}
            autoComplete="tel"
            disabled={submitting}
          />
        </FormField>

        <FormField label="Company" htmlFor="company">
          <input
            id="company"
            type="text"
            className={inputClass}
            value={form.company}
            onChange={setField('company')}
            autoComplete="organization"
            disabled={submitting}
          />
        </FormField>

        <FormField label="How did you hear about us?" htmlFor="source">
          <select
            id="source"
            className={inputClass}
            value={form.source}
            onChange={setField('source')}
            disabled={submitting}
          >
            {SOURCES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </FormField>

        {/* Honeypot — real users never see or fill this; bots often do. */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: '-9999px',
            width: '1px',
            height: '1px',
            overflow: 'hidden',
          }}
        >
          <label htmlFor="website">Website (leave blank)</label>
          <input
            id="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={form.website}
            onChange={setField('website')}
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 w-full inline-flex justify-center items-center px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Submitting…' : 'Submit'}
        </button>
      </form>
    </div>
  );
}
