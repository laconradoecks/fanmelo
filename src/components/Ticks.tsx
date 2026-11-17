// SVG marks copied from fanmelo-waitlist.html.

export const GreenTick = ({ size = 20, fill = '#0E7A4E', sw = '2.4', join = true }: { size?: number; fill?: string; sw?: string; join?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="11" fill={fill} />
    <path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="#fff" strokeWidth={sw} strokeLinecap="round" strokeLinejoin={join ? 'round' : undefined} />
  </svg>
)

export const GreyCross = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A39CB8" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
)

const s = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, 'aria-hidden': true }

export const IconSearch = () => (
  <svg {...s}><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
)
export const IconBadge = () => (
  <svg {...s} strokeLinejoin="round">
    <path d="M12 2l2.5 2.3 3.4-.4.9 3.3 3 1.7-1.3 3.1 1.3 3.1-3 1.7-.9 3.3-3.4-.4L12 22l-2.5-2.3-3.4.4-.9-3.3-3-1.7 1.3-3.1-1.3-3.1 3-1.7.9-3.3 3.4.4z" />
    <path d="M8.5 12.2l2.4 2.4 4.6-4.8" />
  </svg>
)
export const IconStats = () => (
  <svg {...s}><path d="M3 20h18" /><path d="M6 16V10M11 16V6M16 16v-4M21 16V8" /></svg>
)
export const IconCard = () => (
  <svg {...s}><rect x="2" y="6" width="20" height="13" rx="3" /><path d="M2 10h20" /><path d="M6 15h4" /></svg>
)
export const IconHeart = () => (
  <svg {...s}><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 1 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z" /></svg>
)
export const IconProof = () => (
  <svg {...s}><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
)
export const IconMail = () => (
  <svg {...s} strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M3.5 6.5l8.5 6.5 8.5-6.5" /></svg>
)
