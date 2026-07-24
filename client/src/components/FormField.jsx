export default function FormField({ label, htmlFor, error, required, children }) {
  return (
    <div className="mb-4">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-rose-600 ml-1">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-sm text-rose-600">{error}</p>}
    </div>
  );
}
