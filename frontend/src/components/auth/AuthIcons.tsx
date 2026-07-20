/** Minimal TailAdmin icon set for auth forms */

export function ChevronLeftIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M12.7083 5L7.5 10.2083L12.7083 15.4167"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function EyeIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10 3.541c-2.76 0-5.03 1.52-6.71 3.3-.89.94-1.56 1.98-1.95 2.77a.85.85 0 0 0 0 .78c.39.79 1.06 1.83 1.95 2.77 1.68 1.78 3.95 3.3 6.71 3.3s5.03-1.52 6.71-3.3c.89-.94 1.56-1.98 1.95-2.77a.85.85 0 0 0 0-.78c-.39-.79-1.06-1.83-1.95-2.77-1.68-1.78-3.95-3.3-6.71-3.3Zm0 11.25c-2.08 0-3.88-1.15-5.3-2.51A11.6 11.6 0 0 1 3.2 10c.36-.66.95-1.58 1.5-2.28C6.12 6.36 7.92 5.21 10 5.21s3.88 1.15 5.3 2.51c.55.7 1.14 1.62 1.5 2.28-.36.66-.95 1.58-1.5 2.28-1.42 1.36-3.22 2.51-5.3 2.51Z"
      />
      <path d="M10 7.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z" />
    </svg>
  );
}

export function EyeCloseIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M3.28 2.22a.75.75 0 0 0-1.06 1.06l14.5 14.5a.75.75 0 1 0 1.06-1.06l-2.4-2.4c.9-.78 1.66-1.7 2.24-2.54.39-.79.39-1.71 0-2.5-.39-.79-1.06-1.83-1.95-2.77C13.99 4.73 11.76 3.25 9.05 3.25c-1.15 0-2.24.27-3.24.73L3.28 2.22Zm2.7 3.76 1.2 1.2A2.5 2.5 0 0 1 11.5 11.5l1.2 1.2A4 4 0 0 0 5.98 5.98ZM9.05 4.75c2.03 0 3.78 1.12 5.16 2.44.55.68 1.12 1.56 1.47 2.2-.35.64-.92 1.52-1.47 2.2-.29.35-.6.69-.94 1L9.8 9.11a2.5 2.5 0 0 0-2.43-2.43L5.9 5.2c.95-.3 1.99-.45 3.15-.45Z"
      />
      <path d="M2.49 8.2A12.3 12.3 0 0 0 1.33 10c.35.7.95 1.66 1.7 2.52C4.8 14.4 7.03 15.75 9.8 15.75c.66 0 1.3-.07 1.91-.2l-1.25-1.25c-.22.03-.44.05-.66.05-2.03 0-3.78-1.12-5.16-2.44a11.2 11.2 0 0 1-1.47-2.2c.14-.26.32-.57.52-.9L2.49 8.2Z" />
    </svg>
  );
}
