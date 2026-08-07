import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function baseProps({ size = 24, className, ...props }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true as const,
    ...props,
  };
}

export function IconPlane(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M3.5 12.5 L21 9.5 L21.5 11 L12.5 14 L10.5 20.5 L8.5 20.5 L9.5 14 L4.5 13.5 Z" />
      <path d="M9.5 14 L4 16.5" />
    </svg>
  );
}

export function IconSuitcase(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <rect x="4" y="8" width="16" height="12" rx="2.5" />
      <path d="M9 8 V6.5 A2.5 2.5 0 0 1 11.5 4 H12.5 A2.5 2.5 0 0 1 15 6.5 V8" />
      <path d="M4 13 H20" />
      <path d="M8 12.5 V13.5 M16 12.5 V13.5" />
    </svg>
  );
}

export function IconCompass(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M14.8 9.2 L13.2 13.2 L9.2 14.8 L10.8 10.8 Z" />
      <circle cx="12" cy="12" r="1" />
    </svg>
  );
}

export function IconTower(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M8 21 H16" />
      <path d="M10 21 V17 H14 V21" />
      <path d="M9 17 L8 11 H16 L15 17" />
      <path d="M10 11 V8 H14 V11" />
      <path d="M11 8 L12 4 L13 8" />
      <path d="M7 9 H9 M15 9 H17" />
    </svg>
  );
}

export function IconBadge(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <circle cx="12" cy="10" r="6.5" />
      <path d="M9.5 15.5 L8 21 L12 18.5 L16 21 L14.5 15.5" />
      <path d="M10 10 L11.2 12.2 L13.8 8.5" />
    </svg>
  );
}

export function IconGlobe(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <circle cx="12" cy="12" r="9" />
      <ellipse cx="12" cy="12" rx="4" ry="9" />
      <path d="M3.5 12 H20.5" />
      <path d="M5 7.5 H19 M5 16.5 H19" />
    </svg>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5 L10.8 15.2 L16.2 9.2" />
    </svg>
  );
}

export function IconWing(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M3 14 C8 10, 14 8, 21 7" />
      <path d="M5 17 C10 13, 15 11, 20 10" />
      <path d="M7 20 C11 16.5, 15 14.5, 19 13.5" />
    </svg>
  );
}

export function IconAlert(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M12 4 L21 19.5 H3 Z" />
      <path d="M12 10 V14" />
      <path d="M12 16.5 V17" />
    </svg>
  );
}

export function IconHome(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M4 11.5 L12 4.5 L20 11.5" />
      <path d="M7 10.5 V19.5 H17 V10.5" />
      <path d="M10.5 19.5 V14 H13.5 V19.5" />
    </svg>
  );
}
