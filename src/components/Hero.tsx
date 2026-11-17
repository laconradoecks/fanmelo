import { useState, type FormEvent } from 'react'
import PhoneMock from './PhoneMock'
import { Arrow, Check } from './icons'
import { EMAIL_RE, type Count, type Role } from '../waitlist'

type Props = {
  count: Count | null
  onQuickJoin: (email: string) => void
  onPickRole: (role: Role) => void
}

const ticks = [
  'Needs, not wishlists – every need has a reason',
  'Prices checked, purchases proven',
  'Get paid locally, in your own currency',
]

export default function Hero({ count, onQuickJoin, onPickRole }: Props) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    const v = email.trim()
    if (!EMAIL_RE.test(v)) {
      setError('Enter a valid email address.')
      return
    }
    setError('')
    onQuickJoin(v)
  }

  return (
    <section className="hero" id="top">
      <div className="hero-glow" aria-hidden="true" />
      <div className="wrap hero-grid">
        <div className="hero-copy">
          <div className="pill">
            <i aria-hidden="true" />
            Early access · opening in waves
          </div>
          <h1>
            Your fans can finally help with what you <span className="grad-text">need.</span>
          </h1>
          <p className="lead">
            Get a free web page and upload your needs. Share the link in your bio and videos. Your fans chip in to
            make your dreams come true. It's that simple.
          </p>

          <form className="quick" onSubmit={submit} noValidate>
            <label htmlFor="q-email" className="sr">
              Email address
            </label>
            <input
              id="q-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!error}
              aria-describedby="q-err"
            />
            <button className="btn" type="submit">
              Get early access <Arrow />
            </button>
          </form>
          <div className="err" id="q-err" role="alert">
            {error}
          </div>
          {count && (
            <p className="count" aria-live="polite">
              <b>{count.value}</b> {count.label}
            </p>
          )}

          <a className="fan-link" href="#join" onClick={() => onPickRole('fan')}>
            I'm a fan – tell me when it opens
          </a>

          <ul className="ticks">
            {ticks.map((t) => (
              <li key={t}>
                <span className="ok"><Check /></span>
                {t}
              </li>
            ))}
          </ul>
        </div>

        <PhoneMock />
      </div>
    </section>
  )
}
