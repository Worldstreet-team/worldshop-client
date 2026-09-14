import type { CSSProperties, InputHTMLAttributes, SelectHTMLAttributes } from 'react';
import { useStatesOf } from '@/hooks/useLocations';
import { getStateDisplayName } from '@/utils/locations';

type Shared = {
  /** ISO code of the country whose subdivisions to offer. */
  country: string;
  /** Text for the empty option (select) / hint (text input). */
  placeholder?: string;
  id?: string;
  className?: string;
  style?: CSSProperties;
  disabled?: boolean;
  name?: string;
  value?: string;
  onChange?: SelectHTMLAttributes<HTMLSelectElement>['onChange'] &
    InputHTMLAttributes<HTMLInputElement>['onChange'];
  onBlur?: SelectHTMLAttributes<HTMLSelectElement>['onBlur'] &
    InputHTMLAttributes<HTMLInputElement>['onBlur'];
  ref?: React.Ref<HTMLSelectElement & HTMLInputElement>;
};

/**
 * State / province picker for one country. A <select> when the dataset knows
 * the country's subdivisions, a free-text input for the handful of
 * territories it does not (Gibraltar, Aruba…), and disabled until a country
 * is chosen or while the dataset is still loading. Both the select and the input accept the same props, so a
 * react-hook-form register() spread works either way.
 */
export default function StateSelect({ country, placeholder, className, ...rest }: Shared) {
  const { states, loading } = useStatesOf(country);
  const cls = className ?? (states.length ? 'ws-select' : 'ws-field');

  if (!country || loading) {
    return (
      <select className="ws-select" disabled {...rest}>
        <option value="">{loading ? 'Loading…' : placeholder ?? 'Choose a country first'}</option>
      </select>
    );
  }

  if (!states.length) {
    return (
      <input
        type="text"
        className={cls}
        maxLength={60}
        placeholder="Region or province"
        {...rest}
      />
    );
  }

  return (
    <select className={cls} {...rest}>
      <option value="">{placeholder ?? 'Select a state'}</option>
      {states.map((s) => (
        <option key={s} value={s}>{getStateDisplayName(s)}</option>
      ))}
    </select>
  );
}
