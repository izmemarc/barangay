'use client'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-4">
      <h2 className="text-xl font-semibold text-gray-900">Admin panel error</h2>
      <p className="text-sm text-gray-600 text-center max-w-md">
        {error.message || 'Failed to load the admin panel. Please try again.'}
      </p>
      <button
        onClick={reset}
        className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:opacity-90 transition-opacity"
      >
        Try again
      </button>
    </div>
  )
}
