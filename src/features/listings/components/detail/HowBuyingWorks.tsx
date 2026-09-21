import { HandCoins, MessageCircle, ShieldCheck } from 'lucide-react';

const STEPS = [
  {
    Icon: MessageCircle,
    title: 'Message the seller',
    copy: 'Ask if it is still available, and agree a price.',
  },
  {
    Icon: ShieldCheck,
    title: 'Meet and check it',
    copy: 'Meet somewhere public and inspect the item in person.',
  },
  {
    Icon: HandCoins,
    title: 'Pay the seller directly',
    copy: 'Only pay once you are happy. WorldStore never takes payment.',
  },
];

/**
 * Buyers arrive expecting an "Add to cart" button. There isn't one, so the
 * page says what happens instead, next to the only action it offers.
 */
export default function HowBuyingWorks() {
  return (
    <section className="ws-card ws-howbuy" aria-labelledby="how-buying-works">
      <h2 className="ws-title" id="how-buying-works">How buying works</h2>
      <ol className="ws-howbuy__steps">
        {STEPS.map(({ Icon, title, copy }) => (
          <li key={title} className="ws-howbuy__step">
            <span className="ws-howbuy__icon" aria-hidden>
              <Icon size={16} />
            </span>
            <span>
              <span className="ws-howbuy__title">{title}</span>
              <span className="ws-howbuy__copy">{copy}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
