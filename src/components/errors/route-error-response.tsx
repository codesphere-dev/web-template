import type { ErrorResponse } from "react-router";

export default function RouteErrorResponse({
  error,
}: {
  error: ErrorResponse;
}) {
  return (
    <div className="h-screen flex flex-col justify-center items-center gap-3">
      <div className="route-error-header">
        <h1 className="text-9xl font-bold">Ooops!</h1>
      </div>
      <h3 className="text-2xl font-bold">
        {error.status} - {error.statusText}
      </h3>
      <p>{error.data}</p>
    </div>
  );
}
