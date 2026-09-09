"use client";

// Small, hand-rolled stroke icons — same approach as the reference project
// (inline SVGs, no icon-font/emoji dependency) so every glyph in the app
// shares one visual language.
import type { SVGProps } from "react";

function Icon({ children, ...props }: SVGProps<SVGSVGElement> & { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" {...props}>
      {children}
    </svg>
  );
}

export function PinIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M12 21s7-6.4 7-11.5A7 7 0 0 0 5 9.5C5 14.6 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.4" />
    </Icon>
  );
}

export function CalendarIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <rect x="3.5" y="5" width="17" height="16" rx="3" />
      <path d="M8 3v4M16 3v4M3.5 10h17" />
    </Icon>
  );
}

export function ClockIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </Icon>
  );
}

export function UserIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5 20c0-3.6 3.1-6.4 7-6.4s7 2.8 7 6.4" />
    </Icon>
  );
}

export function PhoneIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M5.5 4h3l1.5 4-2 1.5a12 12 0 0 0 6.5 6.5L16 14l4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 3.5 6.2 2 2 0 0 1 5.5 4Z" />
    </Icon>
  );
}

export function DirectionsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon strokeWidth={1.7} {...props}>
      <path d="M3 11l18-8-8 18-2-8-8-2z" strokeLinejoin="round" />
    </Icon>
  );
}

export function CloseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon strokeWidth={2.1} {...props}>
      <path d="M5 5l14 14M19 5L5 19" />
    </Icon>
  );
}

export function MegaphoneIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M4 10v4a1.5 1.5 0 0 0 1.5 1.5H7l3 4.5v-14L7 8.5H5.5A1.5 1.5 0 0 0 4 10Z" strokeLinejoin="round" />
      <path d="M10 8.5 19 5v14l-9-3.5" strokeLinejoin="round" />
      <path d="M20.5 10.5a3 3 0 0 1 0 3" />
    </Icon>
  );
}

export function PlusIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon strokeWidth={2.2} {...props}>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  );
}

export function ListIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M8 6h12M8 12h12M8 18h12" />
      <circle cx="4" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="4" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="4" cy="18" r="1" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function MapIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon strokeWidth={1.7} {...props}>
      <path d="M9 4.5 4 6.5v13l5-2 6 2 5-2v-13l-5 2-6-2Z" strokeLinejoin="round" />
      <path d="M9 4.5v13M15 6.5v13" />
    </Icon>
  );
}

export function SearchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-3.5-3.5" />
    </Icon>
  );
}

export function CrosshairIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="7" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function CheckCircleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.6 2.6L16 9.5" />
    </Icon>
  );
}

export function CheckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon strokeWidth={2.3} {...props}>
      <path d="M4 12.5l5 5L20 6.5" />
    </Icon>
  );
}

export function TrashIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M4.5 6.5h15M9 6.5V4.8a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1V6.5M18 6.5 17.2 19a2 2 0 0 1-2 1.8H8.8a2 2 0 0 1-2-1.8L6 6.5" />
    </Icon>
  );
}

export function RefreshIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3" />
      <path d="M18 3v4h-4M6 21v-4h4" />
    </Icon>
  );
}

export function CopyIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <rect x="8.5" y="8.5" width="11" height="11" rx="2" />
      <path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5" />
    </Icon>
  );
}

export function ShareIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M12 15V4M12 4 8 8M12 4l4 4" />
      <path d="M5 12v6.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V12" />
    </Icon>
  );
}

export function BowlIcon(props: SVGProps<SVGSVGElement>) {
  // Brand mark: a steaming bowl of food, standing in for the annadhanam
  // (food-offering) theme without leaning on a religious glyph/emoji.
  return (
    <Icon {...props}>
      <path d="M4 12.5h16a8 8 0 0 1-16 0Z" strokeLinejoin="round" />
      <path d="M9 5.5c-1 1-1 2 0 3M12.5 4.5c-1 1-1 2.2 0 3.4M16 5.5c-1 1-1 2 0 3" strokeWidth={1.6} />
    </Icon>
  );
}

export function CameraIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M4 8.5h3l1.5-2h7L17 8.5h3a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 20 19.5H4A1.5 1.5 0 0 1 2.5 18v-8A1.5 1.5 0 0 1 4 8.5Z" strokeLinejoin="round" />
      <circle cx="12" cy="14" r="3.2" />
    </Icon>
  );
}

export function MenuIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon strokeWidth={2} {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </Icon>
  );
}

export function ArrowRightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon strokeWidth={2.1} {...props}>
      <path d="M4 12h16M13 5l7 7-7 7" />
    </Icon>
  );
}

export function ArrowLeftIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon strokeWidth={2.1} {...props}>
      <path d="M20 12H4M11 5l-7 7 7 7" />
    </Icon>
  );
}

export function VerifiedIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon strokeWidth={2} {...props}>
      <path d="M12 3.5 14.4 5h3.1l1 3 2.5 1.9-1 3 1 3-2.5 1.9-1 3h-3.1L12 22.5 9.6 21H6.5l-1-3-2.5-1.9 1-3-1-3L5.5 8l1-3h3.1L12 3.5Z" strokeLinejoin="round" />
      <path d="M8.7 12.3l2.2 2.2 4.4-4.4" />
    </Icon>
  );
}

export function UsersIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <path d="M16 4.5c1.7.3 3 1.8 3 3.5s-1.3 3.2-3 3.5M21 20c0-2.8-2-5.1-4.7-5.7" />
    </Icon>
  );
}

export function HeartIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M12 20s-7.5-4.7-9.8-9.4C.7 7.2 2.4 4 5.7 4c2 0 3.4 1.1 4.3 2.4C10.9 5.1 12.3 4 14.3 4c3.3 0 5 3.2 3.5 6.6C15.5 15.3 12 20 12 20Z" strokeLinejoin="round" />
    </Icon>
  );
}

export function LeafIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <path d="M20 4C10 4 4 10 4 18v2h2c8 0 14-6 14-14V4Z" strokeLinejoin="round" />
      <path d="M6 20c4-6 8-9 13-13" />
    </Icon>
  );
}

export function LockIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Icon {...props}>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
      <path d="M7.5 10.5V7.5a4.5 4.5 0 0 1 9 0v3" />
    </Icon>
  );
}

export function CrownIcon(props: SVGProps<SVGSVGElement>) {
  // Brand mark for BappaSeva — a modaka/crown silhouette, kept simple so it
  // reads clearly at small sizes next to the wordmark.
  return (
    <Icon strokeWidth={1.7} {...props}>
      <path d="M4 17.5 3 9l4.5 3.5L12 6l4.5 6.5L21 9l-1 8.5Z" strokeLinejoin="round" />
      <path d="M4 17.5h16v2.2a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-2.2Z" strokeLinejoin="round" />
    </Icon>
  );
}

// Official multi-color Google "G" mark — unlike the rest of this file's
// stroke icons, this one needs real brand colors to read as "Google" at a
// glance, per Google's sign-in button branding guidelines.
export function GoogleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 48 48" {...props}>
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}
