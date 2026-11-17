export default function Brand({ className = '' }: { className?: string }) {
  return (
    <span className={`brand ${className}`}>
      FAN<span className="brand-m">M</span>ELO
    </span>
  )
}
