export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-border px-4 py-6">
      <div className="page-wrap flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
        <p className="m-0 text-sm">&copy; {year} | Flow</p>
        <p className="font-bold text-sm m-0">Built with TanStack Start</p>
      </div>
    </footer>
  )
}
