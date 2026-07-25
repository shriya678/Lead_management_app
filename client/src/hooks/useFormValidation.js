import { useState } from 'react';

// Live per-field validation. `validate(form) -> {fieldName: 'error string'}`.
// A field's error is HIDDEN until the field has been blurred once (touched)
// or the form has been submit-attempted — avoids "Name is required" flashing
// on every field the moment the page renders.
export default function useFormValidation(form, validate) {
  const [touched, setTouched] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const errors = validate(form);

  const markTouched = (key) => () => {
    setTouched((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
  };

  const markAllTouched = () => setSubmitAttempted(true);

  const visibleError = (key) =>
    touched[key] || submitAttempted ? errors[key] : undefined;

  const isValid = Object.keys(errors).length === 0;

  const reset = () => {
    setTouched({});
    setSubmitAttempted(false);
  };

  return {
    errors,
    visibleError,
    markTouched,
    markAllTouched,
    isValid,
    reset,
  };
}
