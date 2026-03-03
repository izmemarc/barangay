export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Disable page-wrapper fade-in animation so the admin overlay is visible immediately
          (otherwise opacity:0 on #page-wrapper hides everything for ~0.4s,
           exposing the body dot-pattern background) */}
      <style dangerouslySetInnerHTML={{ __html: '#page-wrapper { animation: none !important; }' }} />
      {children}
    </>
  )
}
