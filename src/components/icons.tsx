type P = { size?: number }

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

export const Check = ({ size = 20 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="11" fill="currentColor" />
    <path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const Cross = ({ size = 18 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...stroke} strokeWidth={2.4}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
)

export const Arrow = ({ size = 18 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...stroke} strokeWidth={2.4}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
)

export const Search = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" {...stroke}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-4-4" />
  </svg>
)

export const Badge = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" {...stroke}>
    <path d="M12 2l2.5 2.3 3.4-.4.9 3.3 3 1.7-1.3 3.1 1.3 3.1-3 1.7-.9 3.3-3.4-.4L12 22l-2.5-2.3-3.4.4-.9-3.3-3-1.7 1.3-3.1-1.3-3.1 3-1.7.9-3.3 3.4.4z" />
    <path d="M8.5 12.2l2.4 2.4 4.6-4.8" />
  </svg>
)

export const Stats = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" {...stroke}>
    <path d="M3 20h18" />
    <path d="M6 16V10M11 16V6M16 16v-4M21 16V8" />
  </svg>
)

export const Card = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" {...stroke}>
    <rect x="2" y="6" width="20" height="13" rx="3" />
    <path d="M2 10h20M6 15h4" />
  </svg>
)

export const Heart = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" {...stroke}>
    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 1 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z" />
  </svg>
)

export const Proof = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" {...stroke}>
    <path d="M9 11l3 3L22 4" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </svg>
)

export const Mail = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" {...stroke}>
    <rect x="3" y="5" width="18" height="14" rx="2.5" />
    <path d="M3.5 6.5l8.5 6.5 8.5-6.5" />
  </svg>
)
