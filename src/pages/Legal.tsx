import { Link } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';

/**
 * The three legal pages the footer links to. Until counsel supplies the real
 * documents these are honest plain-language summaries of how the marketplace
 * actually works (no payments on-platform, chat-based deals, local meetups) —
 * far better than the 404 these URLs used to land on.
 */

type Section = { heading: string; body: string[] };

const DOCS: Record<'terms' | 'privacy' | 'cookies', { title: string; intro: string; sections: Section[] }> = {
  terms: {
    title: 'Terms of Service',
    intro:
      'WorldStore is a marketplace: sellers list, buyers browse, and the two sides deal directly. These terms describe what that means for you.',
    sections: [
      {
        heading: 'What WorldStore is',
        body: [
          'Shop is a listings and messaging service. We do not sell the items you see, hold stock, process payments or arrange delivery. Every sale is agreed directly between the buyer and the seller, on their own terms.',
          'Because money never moves through the platform, WorldStore is not a party to any transaction and cannot refund, escrow or reverse one.',
        ],
      },
      {
        heading: 'Your account',
        body: [
          'You sign in with your WorldStreet account, which is shared across the WorldStreet ecosystem. You are responsible for what is posted from your account.',
          'Sellers must describe items accurately and only list what they are entitled to sell. Listings that are misleading, illegal or unsafe are removed, and repeat offenders lose their store.',
        ],
      },
      {
        heading: 'Dealing safely',
        body: [
          'Meet in public places, inspect the item before paying, and be wary of deals that ask you to pay before seeing the goods. Anything suspicious can be reported from the listing or store page — reports go straight to the moderation team.',
        ],
      },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    intro: 'What we collect, why we collect it, and the choices you have.',
    sections: [
      {
        heading: 'What we collect',
        body: [
          'Your WorldStreet account profile (name, email, phone if you add it), the listings and messages you create, and standard usage data such as pages visited and device type.',
          'Saved listings and your theme preference are stored only on your device, not on our servers.',
        ],
      },
      {
        heading: 'How it is used',
        body: [
          'To run the marketplace: showing your listings to buyers, delivering chat messages, ranking search results and keeping fraudulent actors out.',
          'We do not sell personal data. Contact details you place on a listing or store page are visible to anyone browsing — that is what they are for.',
        ],
      },
      {
        heading: 'Your choices',
        body: [
          'You can edit your profile at any time. To close your WorldStreet account entirely, contact support through the WorldStreet dashboard — closure removes your store and listings from the marketplace.',
        ],
      },
    ],
  },
  cookies: {
    title: 'Cookie Policy',
    intro: 'Shop keeps its use of browser storage small and functional.',
    sections: [
      {
        heading: 'What we store in your browser',
        body: [
          'A session token so you stay signed in, your theme choice (dark or light), listings you have saved, and whether you have hidden your wallet balance. None of these track you across other sites.',
          'We do not run third-party advertising cookies on Shop.',
        ],
      },
      {
        heading: 'Managing it',
        body: [
          'Clearing your browser storage signs you out and empties your saved listings on that device. Everything keeps working — you just start from a clean slate.',
        ],
      },
    ],
  },
};

export default function Legal({ doc }: { doc: keyof typeof DOCS }) {
  const { title, intro, sections } = DOCS[doc];
  usePageTitle(title);

  return (
    <div className="ws-wrap">
      <article className="ws-legal">
        <header>
          <h1 className="ws-h1">{title}</h1>
          <p className="ws-legal__intro">{intro}</p>
        </header>
        {sections.map((s) => (
          <section key={s.heading}>
            <h2 className="ws-title">{s.heading}</h2>
            {s.body.map((p, i) => <p key={i}>{p}</p>)}
          </section>
        ))}
        <footer className="ws-legal__foot">
          <p className="ws-caption ws-muted">
            Questions? Reach the team from your <a href="https://dashboard.worldstreetgold.com" target="_blank" rel="noopener noreferrer">WorldStreet dashboard</a>, or head back to the <Link to="/listings">marketplace</Link>.
          </p>
        </footer>
      </article>
    </div>
  );
}
