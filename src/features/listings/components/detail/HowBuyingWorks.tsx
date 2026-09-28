import { HandCoins, MessageCircle, ShieldAlert, ShieldCheck, Truck } from 'lucide-react';

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

const TERMS = [
  {
    Icon: Truck,
    copy: 'Delivery and payment are agreed directly with the seller. Nothing is arranged for you.',
  },
  {
    Icon: ShieldAlert,
    copy: 'WorldStore does not handle payment, so there is no refund if a deal goes wrong. Never pay before you have seen the item.',
  },
];

/**
 * Buyers arrive expecting an "Add to cart" button. There isn't one, so this
 * says what happens instead. It has its own tab rather than a slot in the buy
 * box: everyone needs it once, nobody needs it beside the price every visit.
 */
export default function HowBuyingWorks({ heading = true }: { heading?: boolean }) {
  return (
    <section className="ws-howbuy" aria-labelledby={heading ? 'how-buying-works' : undefined}>
      {heading && (
        <h2 className="ws-howbuy__head" id="how-buying-works">
          How buying works
        </h2>
      )}

      <ol className="ws-howbuy__steps">
        {STEPS.map(({ Icon, title, copy }, i) => (
          <li key={title} className="ws-howbuy__step">
            <span className="ws-howbuy__icon" aria-hidden>
              <Icon size={16} />
            </span>
            <span>
              <span className="ws-howbuy__title">
                <span className="ws-howbuy__num ws-num" aria-hidden>{i + 1}.</span>
                {title}
              </span>
              <span className="ws-howbuy__copy">{copy}</span>
            </span>
          </li>
        ))}
      </ol>

      <ul className="ws-howbuy__terms">
        {TERMS.map(({ Icon, copy }) => (
          <li key={copy}>
            <Icon size={16} aria-hidden />
            <span>{copy}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
