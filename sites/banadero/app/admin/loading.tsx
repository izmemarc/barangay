export default function AdminLoading() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F9FAFB' }}>
      <div className="w-full max-w-md mx-4 rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col items-center gap-4 pb-2 pt-2">
          <div className="w-16 h-16 rounded-full bg-gray-200 animate-pulse" />
          <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-48 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="pt-4 space-y-4">
          <div className="h-10 bg-gray-100 rounded-md animate-pulse" />
          <div className="h-10 bg-gray-200 rounded-md animate-pulse" />
        </div>
      </div>
    </div>
  )
}
