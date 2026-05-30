import React, { useState } from 'react'
import { twMerge } from 'tailwind-merge'

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string
  isCollapsed?: boolean
}

const SidebarIcon: React.FC<IconProps> = ({
  size = 20,
  className = '',
  isCollapsed = false,
  ...props
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      xmlns="http://www.w3.org/2000/svg"
      className={className + ' sidebar-icon-trigger'}
      fill="currentColor"
      {...props}
    >
      <path d="M14 2a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zM2 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2z" />
      {/* <rect x="2" y="3" width="12" height="3" rx="1" /> */}
      <rect
        className={`${
          isCollapsed &&
          'w-[3px] group-has-[.sidebar-icon-trigger:hover]:w-[6px] group-has-[.sidebar-wrapper:hover]:w-[6px]'
        } ${
          !isCollapsed &&
          'w-[6px] group-has-[.sidebar-icon-trigger:hover]:w-[3px]'
        } transition-all duration-150 ease-in-out`}
        x="2"
        y="3"
        height="10"
        rx="1"
      />
    </svg>
  )
}

type Props = {
  content: React.ReactNode
  sidebarContent?: React.ReactNode
}

function SidebarNavigation({
  sidebarContent,
}: {
  sidebarContent?: React.ReactNode
}) {
  return (
    <div className="flex h-full flex-col gap-2">
      {sidebarContent ? (
        <div className="border-border flex flex-col gap-2 border-b pb-3 [&_[data-slot=button]]:w-full [&_[data-slot=button]]:justify-start">
          {sidebarContent}
        </div>
      ) : null}
    </div>
  )
}

export function SidebarLayout({ content, sidebarContent }: Props) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isHoverPreviewEnabled, setIsHoverPreviewEnabled] = useState(false)

  const handleToggle = () => {
    setIsHoverPreviewEnabled(false)
    setIsCollapsed((current) => !current)
  }

  return (
    // Main container for the entire page layout.
    <main className="flex-1 w-full relative flex h-full min-h-0 flex-col overflow-y-hidden p-2 transition-all duration-200 ease-in-out px-20">
      {/* Desktop Content */}
      <div className="h-full w-full flex-col flex min-h-0 flex-1">
        {/* Main Content Wrapper */}
        {/*
            This div is the parent container for the sidebar and the main content.
            The `group` class is crucial here. It allows child elements to change their style
            based on the state of this parent container (e.g., when it's hovered).
            We use this with the `:has()` pseudo-class to create a "reverse" group hover effect.
        */}
        <div className="group relative flex min-h-0 w-full flex-1 flex-row gap-4 p-2 transition-all duration-200 ease-in-out max-w-full overflow-hidden">
          {/* --- Sidebar Section --- */}
          {/*
              This is the fixed part of the sidebar that slides in and out.
              `twMerge` is used to conditionally apply classes.
              When `isOn` is true, '-ml-[272px]' is applied to slide it off-screen to the left.
          */}
          <div
            className={twMerge(
              'bg-background relative h-full min-w-3xs rounded-xl p-2 transition-all duration-200 ease-in-out',
              isCollapsed && '-ml-[272px]',
            )}
            onTransitionEnd={(event) => {
              if (event.currentTarget !== event.target) {
                return
              }

              if (event.propertyName !== 'margin-left') {
                return
              }

              setIsHoverPreviewEnabled(isCollapsed)
            }}
          >
            <SidebarNavigation sidebarContent={sidebarContent} />
          </div>

          {isCollapsed ? (
            <div
              className={twMerge(
                'sidebar-wrapper border-border bg-background absolute top-14 bottom-5 left-5 z-40 w-3xs rounded-xl border p-2 opacity-0 shadow-lg transition-all duration-200 ease-in-out -translate-x-3 pointer-events-none',
                isHoverPreviewEnabled &&
                  'group-has-[.sidebar-icon-trigger:hover]:pointer-events-auto group-has-[.sidebar-icon-trigger:hover]:translate-x-0 group-has-[.sidebar-icon-trigger:hover]:opacity-100 group-has-[.sidebar-wrapper:hover]:pointer-events-auto group-has-[.sidebar-wrapper:hover]:translate-x-0 group-has-[.sidebar-wrapper:hover]:opacity-100',
              )}
            >
              <SidebarNavigation sidebarContent={sidebarContent} />
            </div>
          ) : null}

          {/* --- Main Content Area --- */}
          {/* This is the main panel on the right side. */}
          <div className="bg-background border-border h-full w-full rounded-xl border transition-all duration-200 ease-in-out overflow-hidden flex min-h-0 flex-col">
            {/*
                  This div has the class `sidebar-icon-trigger`. It serves as the hover target.
                  When the user's cursor enters this div, the `group-has` condition is met,
                  which triggers the animation on the sidebar panel.
              */}
            <div className="sidebar-icon-trigger max-w-max p-2">
              {/* The actual button that toggles the sidebar's open/closed state on click. */}
              <button
                className="hover:bg-button-hover rounded-lg p-2"
                onClick={handleToggle}
              >
                <SidebarIcon
                  className="text-subdued"
                  isCollapsed={isCollapsed}
                />
              </button>
            </div>
            <div id="main-content" className="flex-1 min-h-0 overflow-hidden">
              {content}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
