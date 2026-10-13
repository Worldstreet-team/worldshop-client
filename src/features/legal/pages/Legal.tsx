import { Link } from 'react-router-dom';
import { usePageTitle } from '@/shared/hooks/usePageTitle';

/**
 * The legal pages and safety tips the footer links to. Until counsel supplies the real
 * documents these are honest plain-language summaries of how the marketplace
 * actually works (no payments on-platform, chat-based deals, local meetups) —
 * far better than the 404 these URLs used to land on.
 */

type Section = { heading: string; body: string[] };

const DOCS: Record<'terms' | 'privacy' | 'cookies' | 'safety', { title: string; intro: string; sections: Section[] }> = {
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
  // Written for how deals actually happen: buyer and seller agree terms in
  // chat and settle between themselves. Nothing here promises escrow or
  // buyer protection, because the platform does not hold payments.
  safety: {
    title: 'Safety Tips',
    intro:
      'Most deals on WorldStore go smoothly. These habits keep it that way, whether you are buying or selling.',
    sections: [
      {
        heading: 'Before you pay',
        body: [
          'See the item before you pay for it, in person or on a live video call. Check that it works and matches the photos and description.',
          'Never pay a deposit to "reserve" an item you have not seen, and be wary of prices far below what similar listings ask.',
          'Keep the conversation in WorldStore chat. It gives you a record of what was agreed, and it is what our team looks at if you report a problem.',
        ],
      },
      {
        heading: 'Meeting up',
        body: [
          'Meet in a busy public place during the day, such as a mall, a bank entrance or a police station car park. Bring someone with you for expensive items.',
          'Do not share your home address until you trust the other person, and do not carry more cash than the deal needs.',
        ],
      },
      {
        heading: 'Signs of a scam',
        body: [
          'Pressure to pay quickly, requests to move the conversation to another app, payment by gift card or crypto, or a "courier fee" for an item you have not seen.',
          'Sellers asking for your card details, PIN, one-time code or WorldStreet password. No genuine buyer or seller needs them, and WorldStore staff will never ask.',
        ],
      },
      {
        heading: 'Vehicles, phones and high-value items',
        body: [
          'For vehicles, check the registration documents and that the seller\'s name matches them, and have a mechanic inspect the car before you pay.',
          'For phones and laptops, check the device is not locked to someone else\'s account and that the serial number matches the box and receipt.',
        ],
      },
      {
        heading: 'If something goes wrong',
        body: [
          'Report the listing or the store from its page. Reports go straight to our moderation team, who can remove listings and close stores.',
          'If you have lost money, report it to your bank straight away and to the police, and keep the chat history as evidence.',
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
