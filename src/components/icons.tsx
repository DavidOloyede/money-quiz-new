interface IconProps {
  className?: string
}

function base(className?: string) {
  return {
    className: className ?? 'w-5 h-5',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
}

export function UploadIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M12 16V4" />
      <path d="M8 8l4-4 4 4" />
      <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
    </svg>
  )
}

export function ChartIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M4 20h16" />
      <path d="M7 20v-6" />
      <path d="M12 20V8" />
      <path d="M17 20v-9" />
    </svg>
  )
}

export function QuizIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.6 9.2a2.4 2.4 0 114.2 1.6c-.8.8-1.8 1-1.8 2.2" />
      <path d="M12 16.6h.01" />
    </svg>
  )
}

export function TrashIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M4 7h16" />
      <path d="M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2" />
      <path d="M6 7v12a2 2 0 002 2h8a2 2 0 002-2V7" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  )
}

export function CheckIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M5 13l4 4L19 7" />
    </svg>
  )
}

export function XIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

export function UserIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
    </svg>
  )
}

export function LifeBuoyIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4" />
      <path d="M5.6 5.6l3.5 3.5M14.9 14.9l3.5 3.5M18.4 5.6l-3.5 3.5M9.1 14.9l-3.5 3.5" />
    </svg>
  )
}

export function ShieldIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M12 3l7 3v5c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6l7-3z" />
      <path d="M9.3 12l1.8 1.8L15 10" />
    </svg>
  )
}

export function DownloadIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M12 4v12" />
      <path d="M8 12l4 4 4-4" />
      <path d="M4 20h16" />
    </svg>
  )
}

export function SparkIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" />
    </svg>
  )
}

export function SettingsIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  )
}

export function SunIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  )
}

export function MoonIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  )
}

export function LinkIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
    </svg>
  )
}

export function RefreshIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M21 12a9 9 0 11-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  )
}

export function StarIcon({ className, filled }: IconProps & { filled?: boolean }) {
  return (
    <svg {...base(className)} fill={filled ? 'currentColor' : 'none'}>
      <path d="M12 3.5l2.55 5.17 5.7.83-4.13 4.02.98 5.68L12 16.9l-5.08 2.3.98-5.68L3.75 9.5l5.7-.83L12 3.5z" />
    </svg>
  )
}

export function TableIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18" />
      <path d="M9 10v9" />
      <path d="M15 10v9" />
    </svg>
  )
}

export function PencilIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M4 20h4l10-10a2 2 0 00-2.83-2.83L5.17 17.17 4 20z" />
      <path d="M13.5 6.5l4 4" />
    </svg>
  )
}

export function CoinLogo({ className }: IconProps) {
  return (
    <svg className={className ?? 'w-8 h-8'} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="14" fill="#059669" />
      <circle cx="16" cy="16" r="10.5" fill="#34d399" />
      <text
        x="16"
        y="21.5"
        fontSize="15"
        fontWeight="700"
        textAnchor="middle"
        fill="#064e3b"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
      >
        $
      </text>
    </svg>
  )
}
