import type { SVGProps } from "react";

/** Shared line-icon set for the admin dashboard — thin stroke, no fill, so
 * they inherit color from context (nav, buttons, badges) via currentColor. */
type IconProps = SVGProps<SVGSVGElement>;

function Base({ children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      width="1em"
      height="1em"
      {...props}
    >
      {children}
    </svg>
  );
}

export function IconOverview(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.6" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6" />
    </Base>
  );
}

export function IconBookings(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M6.5 3h8l4 4v14h-12z" />
      <path d="M14.5 3v4h4" />
      <path d="M9 12.5h6M9 16h6" />
    </Base>
  );
}

export function IconCalendar(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="3" y="5" width="18" height="16" rx="2.2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </Base>
  );
}

export function IconGuests(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="9" cy="8" r="3.1" />
      <path d="M3.2 20c0-3.4 2.6-6.1 5.8-6.1S14.8 16.6 14.8 20" />
      <circle cx="17" cy="8.3" r="2.4" />
      <path d="M15.6 14.3c2.6.4 4.6 2.9 4.6 5.7" />
    </Base>
  );
}

export function IconAnalytics(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4 20V13M9.5 20V7M15 20v-9M20.5 20v-5" />
    </Base>
  );
}

export function IconDeals(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M11.2 3H4v7.2L14 20l7-7L11.2 3z" />
      <circle cx="8" cy="8" r="1.4" fill="currentColor" stroke="none" />
    </Base>
  );
}

export function IconSync(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M3.5 12a8.5 8.5 0 0 1 14.6-6l2.4 2.4" />
      <path d="M20.5 4v5h-5" />
      <path d="M20.5 12a8.5 8.5 0 0 1-14.6 6l-2.4-2.4" />
      <path d="M3.5 20v-5h5" />
    </Base>
  );
}

export function IconSettings(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="3.1" />
      <path d="M12 3v2.4M12 18.6V21M4.4 6.4l1.7 1.7M17.9 15.9l1.7 1.7M3 12h2.4M18.6 12H21M4.4 17.6l1.7-1.7M17.9 8.1l1.7-1.7" />
    </Base>
  );
}

export function IconLogout(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M9.5 21H5.8a1.8 1.8 0 0 1-1.8-1.8V4.8A1.8 1.8 0 0 1 5.8 3H9.5" />
      <path d="M16 16.5 21 12l-5-4.5" />
      <path d="M21 12H9.5" />
    </Base>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4.5 12.5l5 5 10-11" />
    </Base>
  );
}

export function IconX(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Base>
  );
}

export function IconMail(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3.5 6.5 12 13l8.5-6.5" />
    </Base>
  );
}

export function IconLock(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7.5a4 4 0 0 1 8 0V11" />
    </Base>
  );
}

export function IconLockOpen(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7.5a4 4 0 0 1 7.4-2.1" />
    </Base>
  );
}

export function IconCreditCard(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="2.5" y="5.5" width="19" height="13" rx="2.2" />
      <path d="M2.5 10h19" />
      <path d="M6 14.5h4" />
    </Base>
  );
}

export function IconReceipt(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M6 3h12v18l-2.5-1.6L13 21l-2.5-1.6L8 21l-2-1.6z" />
      <path d="M8.5 8h7M8.5 11.5h7" />
    </Base>
  );
}

export function IconTrash(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4 7h16" />
      <path d="M9 7V4.6c0-.6.5-1.1 1.1-1.1h3.8c.6 0 1.1.5 1.1 1.1V7" />
      <path d="M6 7l1 12.4c.05.9.8 1.6 1.7 1.6h6.6c.9 0 1.65-.7 1.7-1.6L18 7" />
      <path d="M10 11v6M14 11v6" />
    </Base>
  );
}

export function IconHandshake(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M8 12.5l2.6 2.6 5.4-5.6" />
    </Base>
  );
}

export function IconChevronLeft(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M14.5 5.5L8 12l6.5 6.5" />
    </Base>
  );
}

export function IconChevronRight(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M9.5 5.5L16 12l-6.5 6.5" />
    </Base>
  );
}
