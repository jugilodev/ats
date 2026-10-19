export default function FormMessage({ error, message }) {
  if (!error && !message) return null;

  return (
    <p className={`message ${error ? "error" : "success"}`} role="status">
      {error || message}
    </p>
  );
}
