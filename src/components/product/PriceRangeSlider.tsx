import { useState, useEffect, useCallback, useRef } from 'react';

interface PriceRangeSliderProps {
  min: number;
  max: number;
  minValue: number;
  maxValue: number;
  step?: number;
  onChange: (min: number, max: number) => void;
  formatPrice?: (value: number) => string;
  className?: string;
}

export default function PriceRangeSlider({
  min,
  max,
  minValue,
  maxValue,
  step = 1,
  onChange,
  formatPrice,
  className = '',
}: PriceRangeSliderProps) {
  const [localMin, setLocalMin] = useState(minValue);
  const [localMax, setLocalMax] = useState(maxValue);
  const [isDragging, setIsDragging] = useState<'min' | 'max' | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalMin(minValue);
    setLocalMax(maxValue);
  }, [minValue, maxValue]);

  const defaultFormatPrice = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const format = formatPrice || defaultFormatPrice;

  const getPercentage = (value: number) => {
    return ((value - min) / (max - min)) * 100;
  };

  const getValueFromPercentage = (percentage: number) => {
    let value = (percentage / 100) * (max - min) + min;
    // Round to nearest step
    value = Math.round(value / step) * step;
    return Math.max(min, Math.min(max, value));
  };

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!trackRef.current) return;
    
    const rect = trackRef.current.getBoundingClientRect();
    const percentage = ((e.clientX - rect.left) / rect.width) * 100;
    const clickValue = getValueFromPercentage(percentage);

    // Determine which thumb to move based on which is closer
    const distToMin = Math.abs(clickValue - localMin);
    const distToMax = Math.abs(clickValue - localMax);

    if (distToMin <= distToMax) {
      const newMin = Math.min(clickValue, localMax - step);
      setLocalMin(newMin);
      onChange(newMin, localMax);
    } else {
      const newMax = Math.max(clickValue, localMin + step);
      setLocalMax(newMax);
      onChange(localMin, newMax);
    }
  };

  const handleMouseDown = (thumb: 'min' | 'max') => (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(thumb);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !trackRef.current) return;

      const rect = trackRef.current.getBoundingClientRect();
      const percentage = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      const value = getValueFromPercentage(percentage);

      if (isDragging === 'min') {
        const newMin = Math.min(value, localMax - step);
        setLocalMin(newMin);
      } else {
        const newMax = Math.max(value, localMin + step);
        setLocalMax(newMax);
      }
    },
    [isDragging, localMin, localMax, min, max, step]
  );

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      onChange(localMin, localMax);
      setIsDragging(null);
    }
  }, [isDragging, localMin, localMax, onChange]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleMinInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= min && value < localMax) {
      setLocalMin(value);
    }
  };

  const handleMaxInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value <= max && value > localMin) {
      setLocalMax(value);
    }
  };

  const handleInputBlur = () => {
    onChange(localMin, localMax);
  };

  const minPercent = getPercentage(localMin);
  const maxPercent = getPercentage(localMax);

  return (
    <div className={`price-range-slider ${className}`}>
      {/* Slider Track */}
      <div 
        ref={trackRef}
        className="price-range-slider-track"
        onClick={handleTrackClick}
      >
        {/* Filled Range */}
        <div
          className="price-range-slider-range"
          style={{
            left: `${minPercent}%`,
            width: `${maxPercent - minPercent}%`,
          }}
        />

        {/* Min Thumb */}
        <div
          className={`price-range-slider-thumb ${isDragging === 'min' ? 'active' : ''}`}
          style={{ left: `${minPercent}%` }}
          onMouseDown={handleMouseDown('min')}
          role="slider"
          aria-label="Minimum price"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={localMin}
          tabIndex={0}
        />

        {/* Max Thumb */}
        <div
          className={`price-range-slider-thumb ${isDragging === 'max' ? 'active' : ''}`}
          style={{ left: `${maxPercent}%` }}
          onMouseDown={handleMouseDown('max')}
          role="slider"
          aria-label="Maximum price"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={localMax}
          tabIndex={0}
        />
      </div>

      {/* Price Inputs */}
      <div className="price-range-slider-inputs">
        <div className="price-range-slider-input-group">
          <label htmlFor="price-min" className="price-range-slider-label">Min</label>
          <div className="price-range-slider-input-wrapper">
            <span className="price-range-slider-currency">$</span>
            <input
              type="number"
              id="price-min"
              className="price-range-slider-input"
              value={localMin}
              min={min}
              max={localMax - step}
              step={step}
              onChange={handleMinInputChange}
              onBlur={handleInputBlur}
            />
          </div>
        </div>

        <span className="price-range-slider-separator">—</span>

        <div className="price-range-slider-input-group">
          <label htmlFor="price-max" className="price-range-slider-label">Max</label>
          <div className="price-range-slider-input-wrapper">
            <span className="price-range-slider-currency">$</span>
            <input
              type="number"
              id="price-max"
              className="price-range-slider-input"
              value={localMax}
              min={localMin + step}
              max={max}
              step={step}
              onChange={handleMaxInputChange}
              onBlur={handleInputBlur}
            />
          </div>
        </div>
      </div>

      {/* Display Range */}
      <div className="price-range-slider-display">
        {format(localMin)} — {format(localMax)}
      </div>
    </div>
  );
}
