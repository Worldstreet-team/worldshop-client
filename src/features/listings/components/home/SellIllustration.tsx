const SCALLOPS = Array.from({ length: 14 }, () => "a 7 7 0 0 1 -14 0").join(" ");
const AWNING = `M62 78 H258 V94 ${SCALLOPS} Z`;

export default function SellIllustration() {
  return (
    <svg
      className="ws-sellart"
      viewBox="0 0 320 220"
      role="img"
      aria-label="A shopfront with a listing in the window, a price tag, and a message from a buyer."
    >
      <defs>
        <clipPath id="ws-sellart-awning">
          <path d={AWNING} />
        </clipPath>
      </defs>

      <ellipse className="ws-sellart__shadow" cx="160" cy="196" rx="104" ry="5" />

      <g className="ws-sellart__sign">
        <rect className="ws-sellart__post" x="150" y="62" width="4" height="18" />
        <rect className="ws-sellart__post" x="166" y="62" width="4" height="18" />
        <rect className="ws-sellart__panel" x="122" y="34" width="76" height="30" rx="6" />
        <rect className="ws-sellart__mark" x="136" y="46" width="26" height="6" rx="3" />
        <rect className="ws-sellart__mark ws-sellart__mark--dim" x="167" y="46" width="14" height="6" rx="3" />
      </g>

      <rect className="ws-sellart__body" x="70" y="92" width="180" height="100" rx="7" />

      <g className="ws-sellart__awning">
        <path className="ws-sellart__awningfill" d={AWNING} />
        <g clipPath="url(#ws-sellart-awning)">
          <rect className="ws-sellart__stripe" x="76" y="76" width="14" height="26" />
          <rect className="ws-sellart__stripe" x="104" y="76" width="14" height="26" />
          <rect className="ws-sellart__stripe" x="132" y="76" width="14" height="26" />
          <rect className="ws-sellart__stripe" x="160" y="76" width="14" height="26" />
          <rect className="ws-sellart__stripe" x="188" y="76" width="14" height="26" />
          <rect className="ws-sellart__stripe" x="216" y="76" width="14" height="26" />
          <rect className="ws-sellart__stripe" x="244" y="76" width="14" height="26" />
        </g>
      </g>

      <g className="ws-sellart__door">
        <rect className="ws-sellart__doorbody" x="92" y="130" width="46" height="62" rx="5" />
        <circle className="ws-sellart__knob" cx="129" cy="162" r="3" />
      </g>

      <g className="ws-sellart__window">
        <rect className="ws-sellart__windowbody" x="156" y="118" width="80" height="58" rx="6" />
        <rect className="ws-sellart__photo" x="165" y="127" width="62" height="24" rx="3" />
        <rect className="ws-sellart__line" x="165" y="157" width="38" height="5" rx="2.5" />
        <rect className="ws-sellart__line ws-sellart__line--dim" x="165" y="166" width="24" height="5" rx="2.5" />
      </g>

      <g className="ws-sellart__float ws-sellart__float--tag">
        <path
          className="ws-sellart__tagbody"
          d="M28 114 H56 a8 8 0 0 1 8 8 v24 a8 8 0 0 1-8 8 H28 L12 140 a8 8 0 0 1 0-12 Z"
        />
        <circle className="ws-sellart__taghole" cx="33" cy="134" r="4" />
        <rect className="ws-sellart__line" x="42" y="131" width="16" height="5" rx="2.5" />
      </g>

      <g className="ws-sellart__float ws-sellart__float--chat">
        <path
          className="ws-sellart__chatbody"
          d="M254 24h46a8 8 0 0 1 8 8v26a8 8 0 0 1-8 8h-24l-12 11V66h-10a8 8 0 0 1-8-8V32a8 8 0 0 1 8-8Z"
        />
        <circle className="ws-sellart__dot" cx="267" cy="45" r="3" />
        <circle className="ws-sellart__dot" cx="279" cy="45" r="3" />
        <circle className="ws-sellart__dot" cx="291" cy="45" r="3" />
      </g>
    </svg>
  );
}
