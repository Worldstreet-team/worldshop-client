import { useState, useEffect, forwardRef } from 'react';

interface ProductQuantityInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const ProductQuantityInput = forwardRef<HTMLInputElement, ProductQuantityInputProps>(
  (
    {
      value,
      onChange,
      min = 1,
      max = 99,
      disabled = false,
      size = 'md',
      className = '',
    },
    ref
  ) => {
    const [inputValue, setInputValue] = useState(value.toString());

    useEffect(() => {
      setInputValue(value.toString());
    }, [value]);

    const handleDecrement = () => {
      if (value > min) {
        onChange(value - 1);
      }
    };

    const handleIncrement = () => {
      if (value < max) {
        onChange(value + 1);
      }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setInputValue(newValue);

      // Allow empty input while typing
      if (newValue === '') return;

      const numValue = parseInt(newValue, 10);
      if (!isNaN(numValue) && numValue >= min && numValue <= max) {
        onChange(numValue);
      }
    };

    const handleBlur = () => {
      const numValue = parseInt(inputValue, 10);
      if (isNaN(numValue) || numValue < min) {
        setInputValue(min.toString());
        onChange(min);
      } else if (numValue > max) {
        setInputValue(max.toString());
        onChange(max);
      } else {
        setInputValue(numValue.toString());
        onChange(numValue);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        handleIncrement();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleDecrement();
      }
    };

    const sizeClass = `quantity-input-${size}`;

    return (
      <div className={`quantity-input ${sizeClass} ${disabled ? 'disabled' : ''} ${className}`}>
        <button
          type="button"
          className="quantity-input-btn quantity-input-decrement"
          onClick={handleDecrement}
          disabled={disabled || value <= min}
          aria-label="Decrease quantity"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <line x1="5" y1="12" x2="19" y2="12" strokeLinecap="round" />
          </svg>
        </button>

        <input
          ref={ref}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          className="quantity-input-field"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          aria-label="Quantity"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
        />

        <button
          type="button"
          className="quantity-input-btn quantity-input-increment"
          onClick={handleIncrement}
          disabled={disabled || value >= max}
          aria-label="Increase quantity"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <line x1="12" y1="5" x2="12" y2="19" strokeLinecap="round" />
            <line x1="5" y1="12" x2="19" y2="12" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    );
  }
);

ProductQuantityInput.displayName = 'ProductQuantityInput';

export default ProductQuantityInput;
