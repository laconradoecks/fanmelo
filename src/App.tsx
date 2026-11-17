import { useEffect, useState } from 'react'
import Header from './components/Header'
import Hero from './components/Hero'
import { Compare, Creators, Faq, Fans, HowItWorks, Story } from './components/Sections'
import Waitlist from './components/Waitlist'
import Footer from './components/Footer'
import { fetchCount, type Count, type Role } from './waitlist'

export default function App() {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('creator')
  const [count, setCount] = useState<Count | null>(null)
  const [focusKey, setFocusKey] = useState(0)

  useEffect(() => {
    fetchCount().then(setCount)
  }, [])

  function quickJoin(v: string) {
    setEmail(v)
    document.getElementById('join')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setFocusKey((k) => k + 1)
  }

  return (
    <>
      <a className="skip" href="#join">
        Skip to waitlist
      </a>
      <Header />
      <main>
        <Hero count={count} onQuickJoin={quickJoin} onPickRole={setRole} />
        <Story />
        <HowItWorks />
        <Compare />
        <Creators />
        <Fans />
        <Faq />
        <Waitlist
          email={email}
          setEmail={setEmail}
          role={role}
          setRole={setRole}
          count={count}
          focusKey={focusKey}
        />
      </main>
      <Footer />
    </>
  )
}
