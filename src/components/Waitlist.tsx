import { useEffect, useRef, useState, type FormEvent } from 'react'
import { CountLine } from './Hero'
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
  const trapRef = useRef<HTMLInputElement>(null)

  // Guess country after hydration so server and client HTML match.
  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- must run after hydration
    setCountry((c) => c || guessCountry())
  }, [])

  // Hero quick-join: focus the country once we've scrolled here.
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
    const res = await join({ email: clean, role, handle: cleanHandle(handle), country, website: trapRef.current?.value ?? '' })
    setBusy(false)
    if (res === 'ok') setDone(true)
    else setError(MESSAGES[res])
  }

  return (
    <section className="join" id="join">
      <div className="wrap">
        <div style={{ textAlign: 'center' }}>
          <span className="eyebrow" style={{ color: '#E7B6FF' }}>Early access</span>
          <h2>Claim your spot before everyone else.</h2>
          <p className="lead">Creators get their page link first. Fans get told the moment their favourite creators are live.</p>
          <CountLine count={count} id="countForm" />
        </div>
        <div className="formcard">
          <form id="wlForm" noValidate onSubmit={submit} style={done ? { display: 'none' } : undefined}>
            {/* Bot trap: hidden from people and screen readers; bots that fill it in are ignored by the server. */}
            <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
              <label htmlFor="website">Website</label>
              <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" ref={trapRef} defaultValue="" />
            </div>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                ref={emailRef}
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@email.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="field">
              <span className="lbl" id="roleLbl">I'm a</span>
              <div className="seg" role="radiogroup" aria-labelledby="roleLbl">
                <input type="radio" name="role" id="rCreator" value="creator" checked={role === 'creator'} onChange={() => setRole('creator')} />
                <label htmlFor="rCreator">Creator</label>
                <input type="radio" name="role" id="rFan" value="fan" checked={role === 'fan'} onChange={() => setRole('fan')} />
                <label htmlFor="rFan">Fan</label>
              </div>
            </div>
            <div className="field">
              <label htmlFor="handle">
                TikTok, Instagram or YouTube handle <span className="opt">(optional)</span>
              </label>
              <input id="handle" type="text" autoComplete="off" placeholder="@yourname" maxLength={60} value={handle} onChange={(e) => setHandle(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="country">Country</label>
              <select id="country" ref={countryRef} required value={country} onChange={(e) => setCountry(e.target.value)}>
                <option value="">Choose your country</option>
                {COUNTRIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <button className="btn" type="submit" id="submitBtn" disabled={busy} style={{ width: '100%' }}>
              {busy ? 'Joining…' : 'Join the waitlist'}
            </button>
            <div className="err" id="fErr" role="alert">{error}</div>
            <p className="note">We'll only email you about FANMELO access. No spam.</p>
          </form>
          <div className="success" id="success" role="status" tabIndex={-1} ref={successRef} style={done ? { display: 'block' } : undefined}>
            <div className="tick">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12l5 5L20 7" />
              </svg>
            </div>
            <h2>You're on the list</h2>
            <p className="lead" style={{ margin: '10px auto 0' }} id="successMsg">
              We'll email you when your spot opens. Share FANMELO with your fans to move up.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
