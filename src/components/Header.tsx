import { Link } from '@tanstack/react-router'
import BetterAuthHeader from '../integrations/better-auth/header-user.tsx'
import ThemeToggle from './ThemeToggle'

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border px-4 backdrop-blur-lg w-full">
      <nav className="page-wrap flex flex-wrap items-center justify-between">
        <div className="flex gap-x-3 gap-y-2 py-3 sm:py-4 ">
          <h2 className="m-0 shrink-0 text-base font-semibold tracking-tight">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm no-underline sm:px-4 sm:py-2" // shadow-[0_8px_24px_rgba(30,90,72,0.08)]
            >
              <span className="h-2 w-2 rounded-full bg-success" />
              Flow
            </Link>
          </h2>

          <div className="ml-auto flex items-center gap-1.5 sm:ml-0 sm:gap-2">
            <ThemeToggle />
          </div>

          <div className="order-3 flex w-full flex-wrap items-center gap-x-4 gap-y-1 pb-1 text-sm font-semibold sm:order-2 sm:w-auto sm:flex-nowrap sm:pb-0">
            <Link
              to="/"
              className="nav-link"
              activeProps={{ className: 'nav-link is-active' }}
            >
              Home
            </Link>
            <Link
              to="/planner"
              className="nav-link"
              activeProps={{ className: 'nav-link is-active' }}
            >
              Planner
            </Link>
            <details className="relative w-full sm:w-auto">
              <summary className="nav-link list-none cursor-pointer">
                Demos
              </summary>
              <div className="mt-2 min-w-56 rounded-xl border border-border bg-white/90 p-2 shadow-lg sm:absolute sm:right-0">
                <a
                  href="/demo/prisma"
                  className="block rounded-lg px-3 py-2 text-sm text-muted-foreground no-underline transition hover:bg-background/80 hover:text-foreground"
                >
                  Prisma
                </a>
                <a
                  href="/demo/form/simple"
                  className="block rounded-lg px-3 py-2 text-sm text-muted-foreground no-underline transition hover:bg-background/80 hover:text-foreground"
                >
                  Simple Form
                </a>
                <a
                  href="/demo/form/address"
                  className="block rounded-lg px-3 py-2 text-sm text-muted-foreground no-underline transition hover:bg-background/80 hover:text-foreground"
                >
                  Address Form
                </a>
                <a
                  href="/demo/trpc-todo"
                  className="block rounded-lg px-3 py-2 text-sm text-muted-foreground no-underline transition hover:bg-background/80 hover:text-foreground"
                >
                  tRPC Todo
                </a>
                <a
                  href="/demo/better-auth"
                  className="block rounded-lg px-3 py-2 text-sm text-muted-foreground no-underline transition hover:bg-background/80 hover:text-foreground"
                >
                  Better Auth
                </a>
                <a
                  href="/demo/storybook"
                  className="block rounded-lg px-3 py-2 text-sm text-muted-foreground no-underline transition hover:bg-background/80 hover:text-foreground"
                >
                  Storybook
                </a>
                <a
                  href="/demo/tanstack-query"
                  className="block rounded-lg px-3 py-2 text-sm text-muted-foreground no-underline transition hover:bg-background/80 hover:text-foreground"
                >
                  TanStack Query
                </a>
              </div>
            </details>
          </div>
        </div>
        <BetterAuthHeader />
      </nav>
    </header>
  )
}
