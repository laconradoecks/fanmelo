export default function PhoneMock() {
  return (
    <div
      className="mockwrap"
      role="img"
      aria-label="Example FANMELO page for a comedian named Alex, showing a camera kit 72% funded and a ring light already bought"
    >
      <div className="phone" aria-hidden="true">
        <div className="screen">
          <div className="cover"></div>
          <div className="pav">AL</div>
          <div className="pname">
            Alex{' '}
            <svg width="16" height="16" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="11" fill="#0E7A4E" />
              <path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
            </svg>
          </div>
          <div className="psub">COMEDIAN · 1M FOLLOWERS</div>
          <div className="pneeds">
            <div className="need">
              <div className="t">Camera kit</div>
              <div className="w">"For filming my first comedy special."</div>
              <span className="tagok">✓ Price checked</span>
              <div className="bar"><i style={{ width: '72%' }}></i></div>
              <div className="r">
                <span><b>$540</b> of $748 · 31 fans</span>
                <span className="chip">Chip in</span>
              </div>
            </div>
            <div className="need">
              <div className="t">2 days studio time</div>
              <div className="w">"To record my special's audio."</div>
              <div className="bar"><i style={{ width: '38%' }}></i></div>
              <div className="r">
                <span><b>$114</b> of $300 · 12 fans</span>
                <span className="chip">Chip in</span>
              </div>
            </div>
            <div className="need">
              <div className="t">Ring light</div>
              <div className="w">"So you can actually see me."</div>
              <div className="bar"><i style={{ width: '100%' }}></i></div>
              <div className="r">
                <span><b>$89</b> raised</span>
                <span className="done">Bought · see proof</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="float f1" aria-hidden="true">
        <span className="dot" style={{ background: '#F3ECFF', color: '#8A3FE4' }}>♥</span>
        <span>Daniel chipped in $10<small>"Can't wait for the special!"</small></span>
      </div>
      <div className="float f2" aria-hidden="true">
        <span className="dot" style={{ background: '#E3F6EC', color: '#0E7A4E' }}>✓</span>
        <span>Proof posted<small>Receipt + unboxing</small></span>
      </div>
    </div>
  )
}
