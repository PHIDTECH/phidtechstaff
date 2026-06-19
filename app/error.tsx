"use client";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-2xl w-full bg-white rounded-xl shadow border border-red-100 p-8">
        <h1 className="text-xl font-bold text-red-600 mb-2">Application Error</h1>
        <p className="text-sm text-gray-500 mb-4">An unexpected error occurred. Details below:</p>
        <pre className="bg-red-50 border border-red-100 rounded-lg p-4 text-xs text-red-800 overflow-auto whitespace-pre-wrap break-all">
          {error?.message ?? "Unknown error"}
          {"\n\n"}
          {error?.stack ?? ""}
        </pre>
        {error?.digest && (
          <p className="text-xs text-gray-400 mt-2">Digest: {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
