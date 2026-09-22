import { Star } from 'lucide-react';

export default function Stars({ value, size = 14 }: { value: number; size?: number }) {
  const filled = Math.round(value);
  return (
    <span className="ws-rating" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          aria-hidden
          style={n <= filled ? undefined : { color: 'var(--ws-bg-track)', fill: 'var(--ws-bg-track)' }}
        />
      ))}
    </span>
  );
}
