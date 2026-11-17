import Brand from './Brand'

const YEAR = new Date().getFullYear()

const socials = [
  ['TikTok', 'https://www.tiktok.com/@fanmelo'],
  ['Instagram', 'https://www.instagram.com/fanmelo'],
  ['X', 'https://x.com/fanmelo'],
  ['YouTube', 'https://www.youtube.com/@fanmelo'],
]

export default function Footer() {
  return (
    <footer className="footer">
      <div className="wrap footer-row">
        <div>
          <Brand />
          <p>© {YEAR} FANMELO · Where fans contribute towards creators' needs</p>
        </div>
        <nav className="socials" aria-label="FANMELO on social media">
          {socials.map(([name, href]) => (
            <a key={name} href={href} rel="noopener">
              {name}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  )
}
