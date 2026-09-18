import type { SelectHTMLAttributes } from 'react';
import { useLocations } from '@/shared/hooks/useLocations';

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  /** Text for the empty option; omit to hide it (a country is then mandatory). */
  placeholder?: string;
}

/**
 * Native <select> over every country. Works controlled (value/onChange) or
 * with react-hook-form's register() spread onto it.
 */
export default function CountrySelect({ placeholder, className, ...rest }: Props) {
  const { countries } = useLocations();
  return (
    <select className={className ?? 'ws-select'} {...rest}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {countries.map((c) => (
        <option key={c.code} value={c.code}>
          {c.flag} {c.name}
        </option>
      ))}
    </select>
  );
}
