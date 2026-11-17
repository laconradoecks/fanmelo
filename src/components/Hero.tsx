import { useState, type FormEvent } from 'react'
import PhoneMock from './PhoneMock'
import { GreenTick } from './Ticks'
import { EMAIL_RE, type Count, type Role } from '../waitlist'

type Props = {
  count: Count | null
  onQuickJoin: (email: string) => void
  onPickRole: (role: Role) => void
}

export function CountLine({ count }: { count: Count | null }) {
  return (
    <div className="count" aria-live="polite" style={count ? { display: 'block' } : undefined}>
      {count && (
        <>
          <b>{count.value}</b> {count.label}
        </>
      )}
    </div>
  )
}

export default function Hero({ count, onQuickJoin, onPickRole }: Props) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    const v = email.trim()
    if (!EMAIL_RE.test(v)) {
      setError('Enter a valid email address.')
      document.getElementById('qEmail')?.focus()
      return
    }
    setError('')
    onQuickJoin(v)
  }

  return (
    <section className="hero">
      <div className="wrap hero-grid">
        <div>
          <div className="pill"><i aria-hidden="true"></i>Early access · opening in waves</div>
          <h1>Your fans can finally help with what you need.</h1>
          <p className="lead">
            Get a free web page and upload your needs. Share the link in your bio and videos. Your fans chip in to make
            your dreams come true. It's that simple.
          </p>
          <form className="quick" onSubmit={submit} noValidate>
            <label htmlFor="qEmail" className="sr">Email address</label>
            <input
              id="qEmail"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@email.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button className="btn" type="submit">Get early access</button>
          </form>
          <div className="err" role="alert">{error}</div>
          <CountLine count={count} />
          <a className="fanlink" href="#join" onClick={() => onPickRole('fan')}>
            I'm a fan – tell me when it opens
          </a>
          <div className="ticks">
            <span><GreenTick />Needs, not wishlists – every need has a reason</span>
            <span><GreenTick />Prices checked, purchases proven</span>
            <span><GreenTick />Get paid locally, in your own currency</span>
          </div>
        </div>

        <PhoneMock />
      </div>
    </section>
  )
}
