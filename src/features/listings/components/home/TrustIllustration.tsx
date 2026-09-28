// The three points beside it, drawn as one scene: a listing open on a phone,
// the seller's reply above it, the verified badge and the meeting place. Same
// rules as the sell band's drawing — flat panels, hairline strokes, gold used
// once per element and never as a second hue.
export default function TrustIllustration() {
  return (
    <svg
      className="ws-trustart"
      viewBox="0 0 320 260"
      role="img"
      aria-label="A listing open on a phone, with a reply from the seller, a verified badge and a meeting point."
    >
      <ellipse className="ws-trustart__shadow" cx="160" cy="240" rx="108" ry="5" />

      <g className="ws-trustart__phone">
        <rect className="ws-trustart__body" x="104" y="40" width="112" height="180" rx="16" />
        <rect className="ws-trustart__screen" x="114" y="54" width="92" height="152" rx="9" />
        <rect className="ws-trustart__photo" x="122" y="64" width="76" height="52" rx="5" />
        <rect className="ws-trustart__line" x="122" y="126" width="52" height="6" rx="3" />
        <rect className="ws-trustart__line ws-trustart__line--dim" x="122" y="138" width="34" height="6" rx="3" />
        <rect className="ws-trustart__price" x="122" y="156" width="46" height="13" rx="6.5" />
        <rect className="ws-trustart__line ws-trustart__line--dim" x="122" y="180" width="62" height="6" rx="3" />
      </g>

      <g className="ws-trustart__float ws-trustart__float--chat">
        <path
          className="ws-trustart__chat"
          d="M228 26h56a10 10 0 0 1 10 10v30a10 10 0 0 1-10 10h-28l-14 12V76h-14a10 10 0 0 1-10-10V36a10 10 0 0 1 10-10Z"
        />
        <circle className="ws-trustart__dot" cx="244" cy="51" r="3.5" />
        <circle className="ws-trustart__dot" cx="256" cy="51" r="3.5" />
        <circle className="ws-trustart__dot" cx="268" cy="51" r="3.5" />
      </g>

      <g className="ws-trustart__float ws-trustart__float--badge">
        <path
          className="ws-trustart__shield"
          d="M52 108 86 121v24c0 20-14 32-34 37-20-5-34-17-34-37v-24Z"
        />
        <path className="ws-trustart__check" d="M38 144l10 10 19-20" />
      </g>

      <g className="ws-trustart__pin">
        <path
          className="ws-trustart__pinbody"
          d="M252 128c11 0 20 8.8 20 19.7 0 14-20 30.3-20 30.3s-20-16.3-20-30.3c0-10.9 9-19.7 20-19.7Z"
        />
        <circle className="ws-trustart__pinhole" cx="252" cy="147" r="7" />
      </g>
    </svg>
  );
}
