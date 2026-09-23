import type { ReactNode } from 'react';
import { Store } from 'lucide-react';

export type Cut = { src: string; mod: string };

export type Bg = {
  image: string;
  video?: string;
  poster?: string;
  focus?: string;
};

export type Slide = {
  key: string;
  eyebrow: string;
  title: ReactNode;
  sub: string;
  primary: { label: string; to: string; icon?: ReactNode };
  secondary?: { label: string; to: string; icon?: ReactNode };
  art: string;
  cuts: Cut[];
  bg: Bg;
};

export function heroSlides(motorsTo: string): Slide[] {
  return [
    {
      key: 'marketplace',
      eyebrow: 'The WorldStore marketplace',
      title: <>Everything the world is <em>selling</em>.</>,
      sub: 'Phones, cars, fashion, property, new listings from rated stores every day. Chat directly with the seller and agree your own terms.',
      primary: { label: 'Browse listings', to: '/listings' },
      secondary: { label: 'Open a store', to: '/vendor', icon: <Store size={16} aria-hidden /> },
      art: 'electronics',
      cuts: [
        { src: '/img/hero/macbook.webp', mod: 'macbook' },
        { src: '/img/hero/phones.webp', mod: 'phones' },
        { src: '/img/hero/boombox.webp', mod: 'boombox' },
      ],
      bg: { image: '/img/hero/phones.webp', focus: '60% 45%' },
    },
    {
      key: 'motors',
      eyebrow: 'Motors',
      title: <>Your next ride is <em>listed</em>.</>,
      sub: 'Foreign used, Nigerian used, brand new, inspect it in person and pay the seller directly.',
      primary: { label: 'Browse vehicles', to: motorsTo },
      art: 'motors',
      cuts: [
        { src: '/img/hero/gle-black.webp', mod: 'gle-black' },
        { src: '/img/hero/gle-white.webp', mod: 'gle-white' },
      ],
      bg: { image: '/img/hero/gle-white.webp', focus: '55% 50%' },
    },
    {
      key: 'sellers',
      eyebrow: 'For sellers',
      title: <>Turn your stuff into <em>cash</em>.</>,
      sub: 'Open a store in minutes and talk to buyers directly, no commission on what you sell.',
      primary: { label: 'Open a store', to: '/vendor', icon: <Store size={16} aria-hidden /> },
      art: 'lifestyle',
      cuts: [
        { src: '/img/hero/tudor.webp', mod: 'tudor' },
        { src: '/img/hero/af1.webp', mod: 'af1' },
      ],
      bg: { image: '/img/hero/tudor.webp', focus: '50% 40%' },
    },
  ];
}
