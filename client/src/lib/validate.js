const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^(\+91)?\d{10}$/;

export function isEmail(value) {
  return EMAIL_RE.test(String(value || '').trim());
}

// Indian mobile format: 10 digits, optionally prefixed with +91.
// Spaces, hyphens, and parentheses are stripped before checking.
export function isIndianPhone(value) {
  const cleaned = String(value || '').replace(/[\s\-()]/g, '');
  return PHONE_RE.test(cleaned);
}
