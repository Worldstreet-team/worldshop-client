import { forwardRef, type InputHTMLAttributes, type ReactNode, useId } from 'react';

// No `size`: the system's TextField has exactly one height (52px), so a size
// scale here would be a prop that does nothing. Native `size` is omitted too —
// it means character width on an input, which is not what callers expect.
export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      fullWidth = true,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;

    const wrapperClass = ['ws-formfield', className].filter(Boolean).join(' ');
    const inputClass = ['ws-field', error ? 'ws-field--invalid' : ''].filter(Boolean).join(' ');

    const field = (
      <input
        ref={ref}
        id={inputId}
        className={inputClass}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        {...props}
      />
    );

    return (
      <div className={wrapperClass} style={fullWidth ? undefined : { display: 'inline-grid' }}>
        {label && (
          <label htmlFor={inputId} className="ws-formfield__label">
            {label}
          </label>
        )}
        {leftIcon || rightIcon ? (
          <div className="ws-inputgroup">
            {leftIcon && (
              <span className="ws-inputgroup__icon ws-inputgroup__icon--left" aria-hidden="true">
                {leftIcon}
              </span>
            )}
            {field}
            {rightIcon && (
              <span className="ws-inputgroup__icon ws-inputgroup__icon--right" aria-hidden="true">
                {rightIcon}
              </span>
            )}
          </div>
        ) : (
          field
        )}
        {error && (
          <span id={`${inputId}-error`} className="ws-formfield__error" role="alert">
            {error}
          </span>
        )}
        {hint && !error && (
          <span id={`${inputId}-hint`} className="ws-formfield__hint">
            {hint}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
