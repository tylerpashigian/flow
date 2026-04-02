import React, { useState } from 'react'
import { twMerge } from 'tailwind-merge'
import { HugeiconsIcon } from '@hugeicons/react'
import { ClockIcon, Plus, StarIcon } from '@hugeicons/core-free-icons'

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
  sidebarData: SidebarData
}

export type SidebarData = {
  user: {
    id: string
    name: string
  }
  recentItems: Array<{
    id: string
    title: string
  }>
  projects: Array<{
    id: string
    name: string
  }>
}

export function SidebarLayout({ content, sidebarData }: Props) {
  // State to manage the open/closed state of the sidebar.
  // `isOn` is true when the sidebar is open (slid out of view) and false when closed (visible).
  const [isOn, setIsOn] = useState(false)

  // Toggles the sidebar state between open and closed.
  const handleToggle = () => {
    setIsOn(!isOn)
  }

  return (
    // Main container for the entire page layout.
    <main className="flex-1 w-full relative flex h-full min-h-0 flex-col overflow-y-hidden p-2 transition-all duration-200 ease-in-out px-20">
      {/* Desktop Content */}
      <div className="h-full w-full flex-col flex min-h-0 flex-1">
        {/* Header Section */}
        <div className="flex flex-row items-center gap-4 p-4">
          {/* Brand Logo */}
          <img src="/logo.png" className="h-6 w-6" />
          {/* Decorative Separator */}
          <div className="bg-primary h-6 w-px -skew-12" />
          {/* Brand Name/Title */}
          <p className="text-h3 text-subdued">{sidebarData.user.name}</p>
        </div>

        {/* Main Content Wrapper */}
        {/*
            This div is the parent container for the sidebar and the main content.
            The `group` class is crucial here. It allows child elements to change their style
            based on the state of this parent container (e.g., when it's hovered).
            We use this with the `:has()` pseudo-class to create a "reverse" group hover effect.
        */}
        <div className="group flex min-h-0 w-full flex-1 flex-row gap-4 p-2 transition-all duration-200 ease-in-out max-w-full overflow-hidden">
          {/* --- Sidebar Section --- */}
          {/*
              This is the fixed part of the sidebar that slides in and out.
              `twMerge` is used to conditionally apply classes.
              When `isOn` is true, '-ml-[272px]' is applied to slide it off-screen to the left.
          */}
          <div
            className={twMerge(
              'bg-background relative h-full min-w-3xs rounded-xl p-2 transition-all duration-200 ease-in-out',
              isOn && '-ml-[272px]',
            )}
          >
            {/* --- Hover-Reveal Sidebar Content --- */}
            {/*
                This inner div is the floating panel that appears when the sidebar is "open" (`isOn`).
                It becomes visible and slides into view when the trigger element is hovered.
                - `isOn` state: Applies base styles for the floating panel (size, position, etc.).
                - `group-has-[.sidebar-icon-trigger:hover]:ml-[240px]`: This is the key.
                  If the parent `.group` has a descendant `.sidebar-icon-trigger` that is being hovered,
                  this panel will slide into view.
                - `group-has-[.sidebar-wrapper:hover]:ml-[240px]`: This allows the panel to *stay* open
                  if the user moves their cursor onto the panel itself after triggering it.
                - `!isOn`: Hides the panel when the sidebar is in its default closed state.
            */}
            <div
              className={twMerge(
                'sidebar-wrapper border-border absolute left-0 h-full w-full rounded-lg transition-all duration-200 ease-in-out',
                isOn &&
                  'bg-background rounded-lg-primary z-10 h-11/12 w-3xs translate-y-12 border p-2 pl-6 group-has-[.sidebar-icon-trigger:hover]:ml-[240px] group-has-[.sidebar-wrapper:hover]:ml-[240px]',
                !isOn && 'ml-0 h-full border-transparent bg-transparent',
              )}
            >
              {/* Content inside the hoverable panel */}
              <div className="flex h-full flex-col gap-2">
                {/* New Chat Button */}
                <button className="bg-button-bg hover:bg-button-hover text-body-sm flex w-full items-center justify-center gap-2 rounded-lg py-2 transition-colors duration-0">
                  <HugeiconsIcon
                    icon={Plus}
                    className="text-subdued"
                    size={16}
                  />
                  New Chat
                </button>

                {/* Navigation Menu */}
                <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
                  {/* Recent Section */}
                  <div className="mt-2 mb-2">
                    <button className="hover:bg-button-hover text-subdued text-body-xs flex w-full items-center gap-2 rounded-lg px-3 py-2 transition-colors duration-0">
                      <HugeiconsIcon icon={ClockIcon} size={14} />
                      <span>Recent</span>
                    </button>
                  </div>

                  {/* Chat History Items */}
                  <div className="space-y-1">
                    {sidebarData.recentItems.map((chat) => (
                      <button
                        key={chat.id}
                        id={`recent-${chat.id}`}
                        className="hover:bg-button-hover text-body-xs group flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors duration-0"
                      >
                        <span className="text-subdued truncate">
                          {chat.title}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="mt-2 mb-2">
                    <button className="hover:bg-button-hover text-subdued text-body-xs flex w-full items-center gap-2 rounded-lg px-3 py-2 transition-colors duration-0">
                      <HugeiconsIcon icon={StarIcon} size={14} />
                      <span>Projects</span>
                    </button>
                  </div>

                  <div className="space-y-1">
                    {sidebarData.projects.map((project) => (
                      <button
                        key={project.id}
                        id={`project-${project.id}`}
                        className="hover:bg-button-hover text-body-xs group flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors duration-0"
                      >
                        <span className="text-subdued truncate">
                          {project.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </nav>
              </div>
            </div>
          </div>

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
                <SidebarIcon className="text-subdued" isCollapsed={isOn} />
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
