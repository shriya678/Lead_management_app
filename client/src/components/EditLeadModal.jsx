import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { isEmail, isIndianPhone } from '../lib/validate';
import Modal from './Modal';
import FormField from './FormField';
import useFormValidation from '../hooks/useFormValidation';

const inputClass =
  'block w-full rounded-md border border-gray-300 px-3 py-2 text-sm ' +
  'focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 ' +
  'disabled:bg-gray-50 disabled:text-gray-500';

const SOURCES = ['website', 'referral', 'ad', 'other'];

// Mirrors server whitelist (leadsController: ADMIN_UPDATABLE / MEMBER_UPDATABLE),
// minus status which lives in the inline StatusSelect.
const ADMIN_FIELDS = ['name', 'email', 'phone', 'company', 'source'];
const MEMBER_FIELDS = ['phone', 'company'];

function makeValidator(allowed) {
  return function validate(form) {
    const next = {};
    if (allowed.includes('name') && !form.name?.trim()) {
      next.name = 'Name is required';
    }
    if (allowed.includes('email')) {
      if (!form.email?.trim()) next.email = 'Email is required';
      else if (!isEmail(form.email)) next.email = 'Enter a valid email address';
    }
    if (allowed.includes('phone') && form.phone?.trim() && !isIndianPhone(form.phone)) {
      next.phone = 'Enter a valid Indian phone (10 digits, optional +91)';
    }
    return next;
  };
}

export default function EditLeadModal({ open, onClose, lead, isAdmin, onSaved }) {
  const allowed = isAdmin ? ADMIN_FIELDS : MEMBER_FIELDS;
  const validate = makeValidator(allowed);

  const [form, setForm] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const { visibleError, markTouched, markAllTouched, isValid, reset: resetValidation } =
    useFormValidation(form, validate);

  useEffect(() => {
    if (!open || !lead) return;
    const initial = {};
    for (const key of allowed) {
      initial[key] = lead[key] || (key === 'source' ? 'website' : '');
    }
    setForm(initial);
    resetValidation();
  }, [open, lead, isAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

  const setField = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleClose = () => {
    if (submitting) return;
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    markAllTouched();
    if (!isValid) return;

    // Diff — only send fields that actually changed. Empty string on an
    // optional field means "clear it" (null), so backend unsets it.
    const updates = {};
    for (const key of allowed) {
      const current = lead[key] ?? '';
      const submitted = String(form[key] ?? '').trim();
      if (submitted === current) continue;
      updates[key] = submitted === '' ? null : submitted;
    }

    if (Object.keys(updates).length === 0) {
      toast('No changes');
      onClose();
      return;
    }

    setSubmitting(true);
    try {
      await api.patch(`/leads/${lead.id}`, updates);
      toast.success('Lead updated');
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update lead');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Edit lead">
      <form onSubmit={handleSubmit} noValidate>
        {allowed.includes('name') && (
          <FormField label="Name" htmlFor="edit-name" error={visibleError('name')} required>
            <input
              id="edit-name"
              type="text"
              className={inputClass}
              value={form.name || ''}
              onChange={setField('name')}
              onBlur={markTouched('name')}
              autoFocus
              disabled={submitting}
            />
          </FormField>
        )}

        {allowed.includes('email') && (
          <FormField label="Email" htmlFor="edit-email" error={visibleError('email')} required>
            <input
              id="edit-email"
              type="email"
              className={inputClass}
              value={form.email || ''}
              onChange={setField('email')}
              onBlur={markTouched('email')}
              autoComplete="off"
              disabled={submitting}
            />
          </FormField>
        )}

        {allowed.includes('phone') && (
          <FormField label="Phone" htmlFor="edit-phone" error={visibleError('phone')}>
            <input
              id="edit-phone"
              type="tel"
              className={inputClass}
              value={form.phone || ''}
              onChange={setField('phone')}
              onBlur={markTouched('phone')}
              placeholder="e.g. +91 98765 43210"
              maxLength={17}
              disabled={submitting}
            />
          </FormField>
        )}

        {allowed.includes('company') && (
          <FormField label="Company" htmlFor="edit-company">
            <input
              id="edit-company"
              type="text"
              className={inputClass}
              value={form.company || ''}
              onChange={setField('company')}
              disabled={submitting}
            />
          </FormField>
        )}

        {allowed.includes('source') && (
          <FormField label="Source" htmlFor="edit-source">
            <select
              id="edit-source"
              className={inputClass}
              value={form.source || 'website'}
              onChange={setField('source')}
              disabled={submitting}
            >
              {SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </FormField>
        )}

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
            {submitting ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
