import { forwardRef, type InputHTMLAttributes, useId } from 'react';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string;
  description?: string;
  error?: string;
  size?: 'sm' | 'md' | 'lg';
  indeterminate?: boolean;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      label,
      description,
      error,
      size = 'md',
      indeterminate = false,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const checkboxId = id || generatedId;

    const wrapperClass = [
      'checkbox-wrapper',
      `checkbox-${size}`,
      error ? 'checkbox-error' : '',
      props.disabled ? 'checkbox-disabled' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={wrapperClass}>
        <div className="checkbox-container">
          <input
            ref={(element) => {
              if (element) {
                element.indeterminate = indeterminate;
              }
              if (typeof ref === 'function') {
                ref(element);
              } else if (ref) {
                ref.current = element;
              }
            }}
            type="checkbox"
            id={checkboxId}
            className="checkbox-input"
            aria-invalid={!!error}
            aria-describedby={
              error ? `${checkboxId}-error` : description ? `${checkboxId}-description` : undefined
            }
            {...props}
          />
          <span className="checkbox-checkmark" aria-hidden="true">
            {indeterminate ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M5 12h14" strokeLinecap="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </span>
          {(label || description) && (
            <div className="checkbox-content">
              {label && (
                <label htmlFor={checkboxId} className="checkbox-label">
                  {label}
                </label>
              )}
              {description && (
                <span id={`${checkboxId}-description`} className="checkbox-description">
                  {description}
                </span>
              )}
            </div>
          )}
        </div>
        {error && (
          <span id={`${checkboxId}-error`} className="checkbox-error-message" role="alert">
            {error}
          </span>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export default Checkbox;
