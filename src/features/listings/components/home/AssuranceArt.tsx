export type AssuranceArtName = "chat" | "verified" | "meet";

const SCENES: Record<AssuranceArtName, React.ReactNode> = {
  chat: (
    <>
      <path
        className="ws-art__panel"
        d="M14 22h44a8 8 0 0 1 8 8v22a8 8 0 0 1-8 8H32l-12 10V60h-6a8 8 0 0 1-8-8V30a8 8 0 0 1 8-8Z"
      />
      <rect className="ws-art__line" x="24" y="34" width="26" height="5" rx="2.5" />
      <rect className="ws-art__line ws-art__line--dim" x="24" y="45" width="16" height="5" rx="2.5" />
      <path
        className="ws-art__accent"
        d="M62 8h32a8 8 0 0 1 8 8v18a8 8 0 0 1-8 8H78l-10 8v-8h-6a8 8 0 0 1-8-8V16a8 8 0 0 1 8-8Z"
      />
      <circle className="ws-art__onaccent" cx="72" cy="25" r="3" />
      <circle className="ws-art__onaccent" cx="82" cy="25" r="3" />
      <circle className="ws-art__onaccent" cx="92" cy="25" r="3" />
    </>
  ),
  verified: (
    <>
      <path
        className="ws-art__panel"
        d="M56 10 88 22v22c0 18-13 29-32 34C37 73 24 62 24 44V22Z"
      />
      <path className="ws-art__check" d="M43 43l9 9 18-19" />
      <g className="ws-art__accent-fill">
        <path d="M20 20l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4-3.9-3.8 5.4-.8Z" />
        <path d="M92 20l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4-3.9-3.8 5.4-.8Z" />
      </g>
    </>
  ),
  meet: (
    <>
      <rect className="ws-art__panel" x="8" y="34" width="60" height="42" rx="6" />
      <rect className="ws-art__band" x="8" y="48" width="60" height="10" />
      <path className="ws-art__seam" d="M38 34v42" />
      <path
        className="ws-art__accent"
        d="M88 8c9.4 0 17 7.5 17 16.8C105 36.8 88 51 88 51S71 36.8 71 24.8C71 15.5 78.6 8 88 8Z"
      />
      <circle className="ws-art__onaccent" cx="88" cy="24" r="6" />
    </>
  ),
};

export default function AssuranceArt({ name }: { name: AssuranceArtName }) {
  return (
    <svg className="ws-art" viewBox="0 0 112 84" aria-hidden focusable="false">
      {SCENES[name]}
    </svg>
  );
}
