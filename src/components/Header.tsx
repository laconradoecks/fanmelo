import { useEffect, useState } from 'react'
import Brand from './Brand'

export default function Header() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={`header${scrolled ? ' is-scrolled' : ''}`}>
      <div className="wrap header-row">
        <a href="#top" className="brand-link" aria-label="FANMELO home">
          <Brand />
        </a>
        <nav className="nav" aria-label="Main">
          <a href="#how">How it works</a>
          <a href="#creators">Creators</a>
          <a href="#fans">Fans</a>
          <a href="#faq">FAQ</a>
        </nav>
        <a className="btn btn-sm" href="#join">
          Join the waitlist
        </a>
      </div>
    </header>
  )
}
