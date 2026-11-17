import type { ReactNode } from 'react'
import { Badge, Card, Check, Cross, Heart, Mail, Proof, Search, Stats } from './icons'

function SectionHead({ eyebrow, title, lead }: { eyebrow: string; title: ReactNode; lead?: string }) {
  return (
    <div className="sec-head reveal">
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      {lead && <p className="lead">{lead}</p>}
    </div>
  )
}

export function Story() {
  const beats = [
    { k: 'Every day', p: 'Millions of us post short videos, chasing likes and followers.' },
    { k: '1M laughs', p: "Some do it for real. Alex makes a million people laugh. For him, it's a job, not a hobby." },
    {
      k: 'Still short',
      p: 'To the apps he looks like everyone else. Millions of likes, and still struggling to pay for a camera, rent or studio time.',
    },
  ]
  return (
    <section className="dark story" id="why">
      <div className="wrap">
        <SectionHead eyebrow="Why FANMELO" title="Everyone posts. Few get paid." />
        <ol className="beats">
          {beats.map((b, i) => (
            <li className="beat reveal" key={b.k}>
              <span className="beat-n">0{i + 1}</span>
              <div className="beat-k">{b.k}</div>
              <p>{b.p}</p>
            </li>
          ))}
        </ol>
        <div className="punch reveal">
          <p>
            His fans get the laughs.
            <br />
            <span>Alex gets the bills.</span>
          </p>
          <small>FANMELO lets the people who enjoy his work help with what he really needs.</small>
        </div>
        <p className="note-ex">Alex is an example creator.</p>
      </div>
    </section>
  )
}

export function HowItWorks() {
  const steps = [
    { t: 'List a real need', p: 'A product, a bill or a goal, with one line on why you need it. No reason, no need.' },
    { t: 'Share one link', p: 'Put fanmelo.com/you in your TikTok, Instagram and YouTube bio, or share your QR code.' },
    {
      t: 'Fans chip in. You show proof.',
      p: "Progress fills as fans give. When it's bought, post the receipt and a thank-you your fans can share.",
    },
  ]
  return (
    <section id="how">
      <div className="wrap">
        <SectionHead
          eyebrow="How it works"
          title="Three steps. No awkward asks."
          lead="Fans see exactly what their money buys, so giving feels like being part of the story."
        />
        <ol className="steps">
          {steps.map((s, i) => (
            <li className="card step reveal" key={s.t}>
              <div className="step-n">{i + 1}</div>
              <h3>{s.t}</h3>
              <p>{s.p}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

export function Compare() {
  const no = [
    'Browse a shop and add anything that looks good',
    'No reason, no goal, no story',
    "Fans can't tell if a price is fair",
    'Nothing to show the money was used well',
  ]
  const yes = [
    'Something you actually need, with the reason why',
    'Products, bills like rent or studio time, or goals',
    'Every product price checked against real stores',
    'Proof of purchase, checked by FANMELO',
  ]
  return (
    <section className="soft" id="different">
      <div className="wrap">
        <SectionHead eyebrow="Not another wishlist" title="Fans don't fund wishes. They back needs." />
        <div className="compare">
          <div className="col col-no reveal">
            <h3>A typical wishlist</h3>
            <ul>
              {no.map((t) => (
                <li key={t}>
                  <span className="x"><Cross /></span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="col col-yes reveal">
            <h3>A FANMELO need</h3>
            <ul>
              {yes.map((t) => (
                <li key={t}>
                  <span className="ok-bright"><Check size={18} /></span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}

export function Creators() {
  const items = [
    { icon: <Search />, t: 'Research built in', p: 'Not sure what to ask for? Find the right product at the right price, then add it as a need.' },
    { icon: <Badge />, t: 'Verified creator badge', p: "A quick social check proves it's really you, so fans trust your page from the first visit." },
    { icon: <Stats />, t: 'Page stats', p: 'See how many people opened your page, where they came from and how many became backers.' },
    {
      icon: <Card />,
      t: 'Paid in your currency',
      p: "Fans' support is paid out straight to your bank or mobile money by our licensed payment partners. You get the full amount fans give.",
    },
  ]
  return (
    <section id="creators">
      <div className="wrap">
        <SectionHead eyebrow="Built for creators" title="Everything you need to get your needs met." />
        <div className="bento">
          {items.map((it) => (
            <div className="card reveal" key={it.t}>
              <div className="ico">{it.icon}</div>
              <h3>{it.t}</h3>
              <p>{it.p}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function Fans() {
  const items = [
    { icon: <Heart />, t: 'Chip in any amount', p: 'Pick an amount, type your own, or finish the goal. Pay the way you already pay where you live.' },
    {
      icon: <Proof />,
      t: 'See the proof',
      p: 'Creators post a receipt or photo once a need is bought. Not bought? Report it and we review it for a refund.',
    },
    { icon: <Mail />, t: 'Hear back', p: 'Get a thank-you from the creator and updates on what you helped make happen.' },
  ]
  return (
    <section className="soft" id="fans">
      <div className="wrap">
        <SectionHead
          eyebrow="For fans"
          title="Give to something real."
          lead="Back the creators who keep you going, and see exactly what your money did."
        />
        <div className="grid3">
          {items.map((it) => (
            <div className="card reveal" key={it.t}>
              <div className="ico">{it.icon}</div>
              <h3>{it.t}</h3>
              <p>{it.p}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function Faq() {
  const qs = [
    {
      q: 'When does FANMELO open?',
      a: "We're opening in waves, country by country, so payments, payouts and ID checks work properly where you live. Join the waitlist and we'll email you the day your spot opens.",
    },
    {
      q: 'What does it cost creators?',
      a: 'Creating a page is free. A small fee is added on top of what fans give, so creators receive the full amount fans chip in.',
    },
    {
      q: 'What can I list as a need?',
      a: "Products like a camera or laptop, bills like rent or studio time (with the provider's invoice), or goals. Every need needs a reason. Adult items and anything offered in return for money aren't allowed.",
    },
    {
      q: 'How do fans know their money is used well?',
      a: "Product prices are checked against real stores, creators are ID-verified, and every funded need needs proof of purchase. Payments are handled by licensed payment companies, and needs that aren't bought can be reported for a refund.",
    },
  ]
  return (
    <section id="faq">
      <div className="wrap faq-grid">
        <SectionHead eyebrow="Questions" title="Good to know" />
        <div className="faq">
          {qs.map((x) => (
            <details key={x.q}>
              <summary>{x.q}</summary>
              <p>{x.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
