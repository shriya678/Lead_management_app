import { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { isEmail, isIndianPhone } from '../lib/validate';
import FormField from '../components/FormField';
import useFormValidation from '../hooks/useFormValidation';

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

function validateSubmit(form) {
  const next = {};
  if (!form.name.trim()) next.name = 'Name is required';
  if (!form.email.trim()) next.email = 'Email is required';
  else if (!isEmail(form.email)) next.email = 'Enter a valid email address';
  if (form.phone.trim() && !isIndianPhone(form.phone)) {
    next.phone = 'Enter a valid Indian phone (10 digits, optional +91)';
  }
  return next;
}

function HeroImage() {
  return (
    <div className="hidden md:block relative bg-white overflow-hidden">
      <img
        src="/submit-hero.png"
        alt="Illustration"
        className="absolute inset-0 w-full h-full object-cover scale-110"
      />
    </div>
  );
}

export default function SubmitPage() {
  const [form, setForm] = useState(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { visibleError, markTouched, markAllTouched, isValid, reset: resetValidation } =
    useFormValidation(form, validateSubmit);

  const setField = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    markAllTouched();
    if (!isValid) return;
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
    resetValidation();
    setSubmitted(false);
  };

  return (
    <div className="w-full max-w-5xl">
      <div className="grid grid-cols-1 md:grid-cols-2 bg-white rounded-xl overflow-hidden min-h-[560px]">
        <HeroImage />

        {submitted ? (
          <div className="p-8 md:p-10 flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 rounded-full bg-green-100 border border-green-200 flex items-center justify-center mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-7 h-7 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Thanks — we&apos;ll be in touch.
            </h1>
            <p className="mt-2 text-gray-500 max-w-sm">
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
        ) : (
          <div className="p-6 md:p-8 lg:p-10">
            <h1 className="text-2xl font-semibold text-gray-900">Submit a lead</h1>
            <p className="mt-1 text-sm text-gray-500 mb-6">
              Tell us a bit about yourself — someone will get in touch soon.
            </p>

            <form onSubmit={handleSubmit} noValidate>
              <FormField label="Name" htmlFor="name" error={visibleError('name')} required>
                <input
                  id="name"
                  type="text"
                  className={inputClass}
                  value={form.name}
                  onChange={setField('name')}
                  onBlur={markTouched('name')}
                  autoComplete="name"
                  disabled={submitting}
                />
              </FormField>

              <FormField label="Email" htmlFor="email" error={visibleError('email')} required>
                <input
                  id="email"
                  type="email"
                  className={inputClass}
                  value={form.email}
                  onChange={setField('email')}
                  onBlur={markTouched('email')}
                  autoComplete="email"
                  disabled={submitting}
                />
              </FormField>

              <FormField label="Phone" htmlFor="phone" error={visibleError('phone')}>
                <input
                  id="phone"
                  type="tel"
                  className={inputClass}
                  value={form.phone}
                  onChange={setField('phone')}
                  onBlur={markTouched('phone')}
                  autoComplete="tel"
                  placeholder="e.g. +91 98765 43210"
                  maxLength={17}
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
        )}
      </div>
    </div>
  );
}
