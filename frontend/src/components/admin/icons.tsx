// Adapted from TailAdmin (MIT License) - https://github.com/TailAdmin/free-nextjs-admin-dashboard

import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

export function GridIcon(props: IconProps) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M3.5 7.5C3.5 5.29086 5.29086 3.5 7.5 3.5H8.5C10.7091 3.5 12.5 5.29086 12.5 7.5V8.5C12.5 10.7091 10.7091 12.5 8.5 12.5H7.5C5.29086 12.5 3.5 10.7091 3.5 8.5V7.5Z"
        fill="currentColor"
      />
      <path
        opacity="0.5"
        d="M11.5 7.5C11.5 5.29086 13.2909 3.5 15.5 3.5H16.5C18.7091 3.5 20.5 5.29086 20.5 7.5V8.5C20.5 10.7091 18.7091 12.5 16.5 12.5H15.5C13.2909 12.5 11.5 10.7091 11.5 8.5V7.5Z"
        fill="currentColor"
      />
      <path
        opacity="0.5"
        d="M3.5 15.5C3.5 13.2909 5.29086 11.5 7.5 11.5H8.5C10.7091 11.5 12.5 13.2909 12.5 15.5V16.5C12.5 18.7091 10.7091 20.5 8.5 20.5H7.5C5.29086 20.5 3.5 18.7091 3.5 16.5V15.5Z"
        fill="currentColor"
      />
      <path
        d="M11.5 15.5C11.5 13.2909 13.2909 11.5 15.5 11.5H16.5C18.7091 11.5 20.5 13.2909 20.5 15.5V16.5C20.5 18.7091 18.7091 20.5 16.5 20.5H15.5C13.2909 20.5 11.5 18.7091 11.5 16.5V15.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function BookIcon(props: IconProps) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M4 5.5C4 4.11929 5.11929 3 6.5 3H19V18.5C19 19.3284 18.3284 20 17.5 20H6.5C5.11929 20 4 18.8807 4 17.5V5.5Z"
        fill="currentColor"
        opacity="0.35"
      />
      <path
        d="M6.5 3C5.11929 3 4 4.11929 4 5.5V17.5C4 18.3284 4.67157 19 5.5 19H17.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path d="M8 7H15M8 10.5H13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function QuizIcon(props: IconProps) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" {...props}>
      <rect x="4" y="4" width="16" height="16" rx="3" fill="currentColor" opacity="0.2" />
      <path
        d="M9 9.5C9 8.11929 10.1193 7 11.5 7H12.5C13.8807 7 15 8.11929 15 9.5C15 10.5 14.4 11.1 13.5 11.6L12.5 12.2V13.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <circle cx="12.5" cy="16" r="1" fill="currentColor" />
    </svg>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" {...props}>
      <circle cx="9" cy="8" r="3.25" fill="currentColor" />
      <path
        d="M3.5 18.5C3.5 15.7386 5.73858 13.5 8.5 13.5H9.5C12.2614 13.5 14.5 15.7386 14.5 18.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <circle cx="16.5" cy="8.5" r="2.5" fill="currentColor" opacity="0.45" />
      <path
        d="M15 13.75C17.2091 13.75 19 15.5409 19 17.75"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        opacity="0.6"
      />
    </svg>
  );
}

export function ChartIcon(props: IconProps) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M4 19H20" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <rect x="6" y="11" width="3" height="6" rx="1" fill="currentColor" />
      <rect x="10.5" y="7" width="3" height="10" rx="1" fill="currentColor" opacity="0.7" />
      <rect x="15" y="9" width="3" height="8" rx="1" fill="currentColor" opacity="0.45" />
    </svg>
  );
}

export function MediaIcon(props: IconProps) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" {...props}>
      <rect x="3.5" y="5" width="17" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="9" cy="11" r="1.75" fill="currentColor" />
      <path
        d="M7 17L11.2 13.5L13.5 15.5L16.5 12L20 17"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M12 15.5A3.5 3.5 0 1 0 12 8.5A3.5 3.5 0 0 0 12 15.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M19.4 13.1C19.5 12.7 19.5 12.3 19.5 12C19.5 11.7 19.5 11.3 19.4 10.9L21.1 9.6L19.1 6.1L17.1 6.8C16.7 6.5 16.2 6.2 15.7 6L15.3 4H11.8L11.4 6C10.9 6.2 10.4 6.5 10 6.8L8 6.1L6 9.6L7.7 10.9C7.6 11.3 7.6 11.7 7.6 12C7.6 12.3 7.6 12.7 7.7 13.1L6 14.4L8 17.9L10 17.2C10.4 17.5 10.9 17.8 11.4 18L11.8 20H15.3L15.7 18C16.2 17.8 16.7 17.5 17.1 17.2L19.1 17.9L21.1 14.4L19.4 13.1Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
        opacity="0.55"
      />
    </svg>
  );
}

export function UserCircleIcon(props: IconProps) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" {...props}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="10" r="3" fill="currentColor" />
      <path
        d="M6.5 18.2C7.6 16.3 9.6 15 12 15C14.4 15 16.4 16.3 17.5 18.2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CertIcon(props: IconProps) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M8 3.5H16C17.3807 3.5 18.5 4.61929 18.5 6V14.5L12 18.5L5.5 14.5V6C5.5 4.61929 6.61929 3.5 8 3.5Z"
        fill="currentColor"
        opacity="0.2"
      />
      <path
        d="M8 3.5H16C17.3807 3.5 18.5 4.61929 18.5 6V14.5L12 18.5L5.5 14.5V6C5.5 4.61929 6.61929 3.5 8 3.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M9 9H15M9 12H13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function MailIcon(props: IconProps) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" {...props}>
      <rect
        x="3.5"
        y="5.5"
        width="17"
        height="13"
        rx="2"
        fill="currentColor"
        opacity="0.15"
      />
      <rect
        x="3.5"
        y="5.5"
        width="17"
        height="13"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M4.5 7.5L12 12.5L19.5 7.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" {...props}>
      <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 7.5V12L15 14"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ChatIcon(props: IconProps) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M4 6.5C4 5.11929 5.11929 4 6.5 4H17.5C18.8807 4 20 5.11929 20 6.5V13.5C20 14.8807 18.8807 16 17.5 16H10L6 19.5V16H6.5C5.11929 16 4 14.8807 4 13.5V6.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ClipboardIcon(props: IconProps) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" {...props}>
      <rect x="5" y="4.5" width="14" height="16" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M9 4V3.5C9 2.67157 9.67157 2 10.5 2H13.5C14.3284 2 15 2.67157 15 3.5V4" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8.5 10.5H15.5M8.5 14H15.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M12 3L19 5.5V11C19 15.4183 15.9706 19.3111 12 20.5C8.02944 19.3111 5 15.4183 5 11V5.5L12 3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" {...props}>
      <rect x="4" y="5.5" width="16" height="14.5" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4 9.5H20M8 3.5V6.5M16 3.5V6.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
