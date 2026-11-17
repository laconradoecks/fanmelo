import { useEffect, useRef, useState, type FormEvent } from 'react'
import { COUNTRIES, EMAIL_RE, cleanHandle, guessCountry, join, type Count, type JoinResult, type Role } from '../waitlist'

type Props = {
  email: string
  setEmail: (v: string) => void
  role: Role
  setRole: (r: Role) => void
  count: Count | null
  focusKey: number
}

const MESSAGES: Record<Exclude<JoinResult, 'ok'>, string> = {
  duplicate: 'This email is already on the list.',
  invalid: 'Enter a valid email address.',
  closed: 'Sign-ups are not open on this link yet. Please check back soon.',
  network: 'Could not connect. Check your connection and try again.',
  error: 'Something went wrong. Please try again.',
}

export default function Waitlist({ email, setEmail, role, setRole, count, focusKey }: Props) {
  const [handle, setHandle] = useState('')
  const [country, setCountry] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const countryRef = useRef<HTMLSelectElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const successRef = useRef<HTMLDivElement>(null)

  // Guess country after hydration so server and client HTML match.
  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- must run after hydration
    setCountry((c) => c || guessCountry())
  }, [])

  // Hero quick-join: move focus to the next field once we've scrolled here.
  useEffect(() => {
    if (!focusKey) return
    const t = setTimeout(() => countryRef.current?.focus({ preventScroll: true }), 450)
    return () => clearTimeout(t)
  }, [focusKey])

  useEffect(() => {
    if (done) successRef.current?.focus()
  }, [done])

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    const clean = email.trim().toLowerCase()
    if (!EMAIL_RE.test(clean)) {
      setError(MESSAGES.invalid)
      emailRef.current?.focus()
      return
    }
    if (!country) {
      setError('Choose your country.')
      countryRef.current?.focus()
      return
    }
    setBusy(true)
    const res = await join({ email: clean, role, handle: cleanHandle(handle), country })
    setBusy(false)
    if (res === 'ok') setDone(true)
    else setError(MESSAGES[res])
  }

  return (
    <section className="dark join" id="join">
      <div className="wrap">
        <div className="join-head reveal">
          <span className="eyebrow">Early access</span>
          <h2>Claim your spot before everyone else.</h2>
          <p className="lead">
            Creators get their page link first. Fans get told the moment their favourite creators are live.
          </p>
          {count && (
            <p className="count" aria-live="polite">
              <b>{count.value}</b> {count.label}
            </p>
          )}
        </div>

        <div className="formcard">
          {done ? (
            <div className="success" role="status" tabIndex={-1} ref={successRef}>
              <div className="success-tick" aria-hidden="true">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12l5 5L20 7" />
                </svg>
              </div>
              <h2>You're on the list</h2>
              <p className="lead">We'll email you when your spot opens. Share FANMELO with your fans to move up.</p>
            </div>
          ) : (
            <form onSubmit={submit} noValidate>
              <div className="field">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  ref={emailRef}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <fieldset className="field">
                <legend className="lbl">I'm a</legend>
                <div className="seg">
                  {(['creator', 'fan'] as const).map((r) => (
                    <label key={r} className={role === r ? 'on' : ''}>
                      <input type="radio" name="role" value={r} checked={role === r} onChange={() => setRole(r)} />
                      {r === 'creator' ? 'Creator' : 'Fan'}
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="field">
                <label htmlFor="handle">
                  TikTok, Instagram or YouTube handle <span className="opt">(optional)</span>
                </label>
                <input
                  id="handle"
                  type="text"
                  autoComplete="off"
                  placeholder="@yourname"
                  maxLength={60}
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                />
              </div>

              <div className="field">
                <label htmlFor="country">Country</label>
                <select id="country" ref={countryRef} value={country} onChange={(e) => setCountry(e.target.value)}>
                  <option value="">Choose your country</option>
                  {COUNTRIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>

              <button className="btn btn-block" type="submit" disabled={busy}>
                {busy ? 'Joining…' : 'Join the waitlist'}
              </button>
              <div className="err" role="alert">
                {error}
              </div>
              <p className="note">We'll only email you about FANMELO access. No spam.</p>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
