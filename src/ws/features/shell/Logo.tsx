import Image from "next/image";
import Link from "next/link";

/* The supplied WorldStore mark and wordmark. The SVG is also the source for the app
   icons, so the header, footer, favicon and installed app stay consistent. */
export function Logo() {
  return (
    <Link href="/" className="ws-logo" aria-label="WorldStore home">
      <span className="ws-logo__tile" aria-hidden="true">
        <Image src="/worldstore-mark.svg" alt="" width={32} height={32} unoptimized />
      </span>
      <span className="ws-logo__name" aria-hidden="true">
        WorldStore
      </span>
    </Link>
  );
}
