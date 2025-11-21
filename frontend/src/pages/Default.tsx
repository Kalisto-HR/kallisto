export function NotImplemented() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <h1 className="text-4xl font-bold text-primary mb-2">Not Implemented</h1>
      <p className="text-gray-600">This feature is on our TODO list 😅</p>
    </div>
  );
}

export function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <h1 className="text-5xl font-bold text-accent mb-4">404</h1>
      <p className="text-gray-600 text-center">
        Got lost? The page you are looking for doesn’t exist 😵‍💫
      </p>
      <a href="/" className="mt-4 text-primary font-semibold hover:underline">Go Home</a>
    </div>
  );
}
