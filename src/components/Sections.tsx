import { GreenTick, GreyCross, IconBadge, IconCard, IconHeart, IconMail, IconProof, IconSearch, IconStats } from './Ticks'

export function Header() {
  return (
    <header>
      <div className="wrap top">
        <a className="brandrow" href="#top" aria-label="FANMELO home">
          <span className="brand">FAN<span className="m">M</span>ELO</span>
        </a>
        <a className="navcta" href="#join">Join the waitlist</a>
      </div>
    </header>
  )
}

export function Story() {
  return (
    <section className="story" id="why">
      <div className="wrap">
        <span className="eyebrow">Why FANMELO</span>
        <h2>Everyone posts. Few get paid.</h2>
        <div className="beats">
          <div className="beat"><div className="k">Every day</div><p>Millions of us post short videos, chasing likes and followers.</p></div>
          <div className="beat"><div className="k">1M laughs</div><p>Some do it for real. Alex makes a million people laugh. For him, it's a job, not a hobby.</p></div>
          <div className="beat"><div className="k">Still short</div><p>To the apps he looks like everyone else. Millions of likes, and still struggling to pay for a camera, rent or studio time.</p></div>
        </div>
        <div className="punch">
          <p>His fans get the laughs.<br /><span>Alex gets the bills.</span></p>
          <small>FANMELO lets the people who enjoy his work help with what he really needs.</small>
        </div>
        <p className="note-ex">Alex is an example creator.</p>
      </div>
    </section>
  )
}

export function HowItWorks() {
  return (
    <section id="how">
      <div className="wrap">
        <div className="sec-head">
          <span className="eyebrow">How it works</span>
          <h2>Three steps. No awkward asks.</h2>
          <p className="lead">Fans see exactly what their money buys, so giving feels like being part of the story.</p>
        </div>
        <div className="grid3">
          <div className="card"><div className="num">1</div><h3>List a real need</h3><p>A product, a bill or a goal, with one line on why you need it. No reason, no need.</p></div>
          <div className="card"><div className="num">2</div><h3>Share one link</h3><p>Put fanmelo.com/you in your TikTok, Instagram and YouTube bio, or share your QR code.</p></div>
          <div className="card"><div className="num">3</div><h3>Fans chip in. You show proof.</h3><p>Progress fills as fans give. When it's bought, post the receipt and a thank-you your fans can share.</p></div>
        </div>
      </div>
    </section>
  )
}

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

export function Compare() {
  return (
    <section className="trust" id="different">
      <div className="wrap">
        <div className="sec-head">
          <span className="eyebrow">Not another wishlist</span>
          <h2>Fans don't fund wishes. They back needs.</h2>
        </div>
        <div className="compare">
          <div className="col no">
            <h3>A typical wishlist</h3>
            <ul>{no.map((t) => <li key={t}><GreyCross />{t}</li>)}</ul>
          </div>
          <div className="col yes">
            <h3>A FANMELO need</h3>
            <ul>{yes.map((t) => <li key={t}><GreenTick size={18} fill="#17A46B" sw="2.6" join={false} />{t}</li>)}</ul>
          </div>
        </div>
      </div>
    </section>
  )
}

export function Creators() {
  return (
    <section id="creators">
      <div className="wrap">
        <div className="sec-head">
          <span className="eyebrow">Built for creators</span>
          <h2>Everything you need to get your needs met.</h2>
        </div>
        <div className="grid4">
          <div className="card"><div className="ico"><IconSearch /></div><h3>Research built in</h3><p>Not sure what to ask for? Find the right product at the right price, then add it as a need.</p></div>
          <div className="card"><div className="ico"><IconBadge /></div><h3>Verified creator badge</h3><p>A quick social check proves it's really you, so fans trust your page from the first visit.</p></div>
          <div className="card"><div className="ico"><IconStats /></div><h3>Page stats</h3><p>See how many people opened your page, where they came from and how many became backers.</p></div>
          <div className="card"><div className="ico"><IconCard /></div><h3>Paid in your currency</h3><p>Fans' support is paid out straight to your bank or mobile money by our licensed payment partners. You get the full amount fans give.</p></div>
        </div>
      </div>
    </section>
  )
}

export function Fans() {
  return (
    <section className="trust" id="fans">
      <div className="wrap">
        <div className="sec-head">
          <span className="eyebrow">For fans</span>
          <h2>Give to something real.</h2>
          <p className="lead">Back the creators who keep you going, and see exactly what your money did.</p>
        </div>
        <div className="grid3">
          <div className="card"><div className="ico"><IconHeart /></div><h3>Chip in any amount</h3><p>Pick an amount, type your own, or finish the goal. Pay the way you already pay where you live.</p></div>
          <div className="card"><div className="ico"><IconProof /></div><h3>See the proof</h3><p>Creators post a receipt or photo once a need is bought. Not bought? Report it and we review it for a refund.</p></div>
          <div className="card"><div className="ico"><IconMail /></div><h3>Hear back</h3><p>Get a thank-you from the creator and updates on what you helped make happen.</p></div>
        </div>
      </div>
    </section>
  )
}

export function Faq() {
  return (
    <section id="faq">
      <div className="wrap">
        <div className="sec-head">
          <span className="eyebrow">Questions</span>
          <h2>Good to know</h2>
        </div>
        <div className="faq">
          <details><summary>When does FANMELO open?</summary><p>We're opening in waves, country by country, so payments, payouts and ID checks work properly where you live. Join the waitlist and we'll email you the day your spot opens.</p></details>
          <details><summary>What does it cost creators?</summary><p>Creating a page is free. A small fee is added on top of what fans give, so creators receive the full amount fans chip in.</p></details>
          <details><summary>What can I list as a need?</summary><p>Products like a camera or laptop, bills like rent or studio time (with the provider's invoice), or goals. Every need needs a reason. Adult items and anything offered in return for money aren't allowed.</p></details>
          <details><summary>How do fans know their money is used well?</summary><p>Product prices are checked against real stores, creators are ID-verified, and every funded need needs proof of purchase. Payments are handled by licensed payment companies, and needs that aren't bought can be reported for a refund.</p></details>
        </div>
      </div>
    </section>
  )
}

const YEAR = new Date().getFullYear()

export function Footer() {
  return (
    <footer>
      <div className="wrap foot">
        <div>
          <div className="brandrow" style={{ marginBottom: 8 }}>
            <span className="brand" style={{ height: 24, width: 106 }}>FAN<span className="m">M</span>ELO</span>
          </div>
          <div>© <span id="yr">{YEAR}</span> FANMELO · Where fans contribute towards creators' needs · A Yosaki company · <a href="/privacy/" style={{ color: 'inherit' }}>Privacy</a></div>
        </div>
        <nav className="socials" aria-label="FANMELO on social media">
          <a href="https://www.tiktok.com/@fanmelo">TikTok</a>
          <a href="https://www.instagram.com/fanmelo">Instagram</a>
          <a href="https://x.com/fanmelo">X</a>
          <a href="https://www.youtube.com/@fanmelo">YouTube</a>
        </nav>
      </div>
    </footer>
  )
}
