import { Check } from './icons'

const needs = [
  { title: 'Camera kit', why: 'For filming my first comedy special.', raised: 540, goal: 748, fans: 31, checked: true },
  { title: '2 days studio time', why: "To record my special's audio.", raised: 114, goal: 300, fans: 12 },
  { title: 'Ring light', why: 'So you can actually see me.', raised: 89, goal: 89, done: true },
]

export default function PhoneMock() {
  return (
    <div
      className="mock"
      role="img"
      aria-label="Example FANMELO page for a comedian named Alex, showing a camera kit 72% funded and a ring light already bought"
    >
      <div className="phone" aria-hidden="true">
        <div className="screen">
          <div className="screen-cover" />
          <div className="screen-avatar">AL</div>
          <div className="screen-name">
            Alex <span className="ok"><Check size={15} /></span>
          </div>
          <div className="screen-sub">COMEDIAN · 1M FOLLOWERS</div>
          <div className="screen-needs">
            {needs.map((n) => {
              const pct = Math.round((n.raised / n.goal) * 100)
              return (
                <div className="need" key={n.title}>
                  <div className="need-title">{n.title}</div>
                  <div className="need-why">“{n.why}”</div>
                  {n.checked && <span className="tag-ok">✓ Price checked</span>}
                  <div className="bar">
                    <i style={{ transform: `scaleX(${pct / 100})` }} />
                  </div>
                  <div className="need-row">
                    {n.done ? (
                      <>
                        <span><b>${n.raised}</b> raised</span>
                        <span className="need-done">Bought · see proof</span>
                      </>
                    ) : (
                      <>
                        <span><b>${n.raised}</b> of ${n.goal} · {n.fans} fans</span>
                        <span className="chip">Chip in</span>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="float float-1" aria-hidden="true">
        <span className="dot dot-vio">♥</span>
        <span>
          Daniel chipped in $10<small>“Can't wait for the special!”</small>
        </span>
      </div>
      <div className="float float-2" aria-hidden="true">
        <span className="dot dot-ok">✓</span>
        <span>
          Proof posted<small>Receipt + unboxing</small>
        </span>
      </div>
    </div>
  )
}
