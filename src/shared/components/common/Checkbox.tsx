import { forwardRef, type InputHTMLAttributes, useId } from 'react';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string;
  description?: string;
  error?: string;
  // No `size`: the system's Checkbox is 18×18, full stop.
  indeterminate?: boolean;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      label,
      description,
      error,
      indeterminate = false,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const checkboxId = id || generatedId;

    const wrapperClass = ['ws-check', props.disabled ? 'is-disabled' : '', className]
      .filter(Boolean)
      .join(' ');

    return (
      <div>
        <div className={wrapperClass}>
          {/* The native input is styled directly (appearance:none + a masked
              ::after check), so it stays focusable and no sibling span is
              needed to paint the box. */}
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
            className="ws-check__input"
            aria-invalid={!!error}
            // Both ids when both are present — the description stays visible
            // alongside an error (unlike Input/Select, which hide their hint),
            // so a screen-reader user should hear both too, not just the error.
            aria-describedby={
              [description ? `${checkboxId}-description` : null, error ? `${checkboxId}-error` : null]
                .filter(Boolean)
                .join(' ') || undefined
            }
            {...props}
          />
          {(label || description) && (
            <div className="ws-check__body">
              {label && (
                <label htmlFor={checkboxId} className="ws-check__label">
                  {label}
                </label>
              )}
              {description && (
                <span id={`${checkboxId}-description`} className="ws-check__desc">
                  {description}
                </span>
              )}
            </div>
          )}
        </div>
        {error && (
          <span id={`${checkboxId}-error`} className="ws-formfield__error" role="alert">
            {error}
          </span>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export default Checkbox;
