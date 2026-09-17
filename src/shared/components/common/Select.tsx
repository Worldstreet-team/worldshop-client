import { forwardRef, type SelectHTMLAttributes, useId } from 'react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
  placeholder?: string;
  // No `size`: the system's Select has one height (52px), matching TextField.
  fullWidth?: boolean;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      hint,
      options,
      placeholder,
      fullWidth = true,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const selectId = id || generatedId;

    const wrapperClass = ['ws-formfield', className].filter(Boolean).join(' ');
    const selectClass = ['ws-select', error ? 'ws-select--invalid' : ''].filter(Boolean).join(' ');

    return (
      <div className={wrapperClass} style={fullWidth ? undefined : { display: 'inline-grid' }}>
        {label && (
          <label htmlFor={selectId} className="ws-formfield__label">
            {label}
          </label>
        )}
        {/* No arrow span: .ws-select paints the chevron as a background image so
            the control keeps native keyboard behaviour. */}
        <select
          ref={ref}
          id={selectId}
          className={selectClass}
          aria-invalid={!!error}
          aria-describedby={error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <span id={`${selectId}-error`} className="ws-formfield__error" role="alert">
            {error}
          </span>
        )}
        {hint && !error && (
          <span id={`${selectId}-hint`} className="ws-formfield__hint">
            {hint}
          </span>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;
