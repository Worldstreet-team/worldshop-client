import { useMemo } from 'react';
import type { ProductVariant } from '@/types/product.types';

interface ProductVariantSelectorProps {
  variants: ProductVariant[];
  selectedVariant: ProductVariant | null;
  onVariantChange: (variant: ProductVariant) => void;
  className?: string;
}

interface AttributeOption {
  value: string;
  available: boolean;
  variant?: ProductVariant;
}



export default function ProductVariantSelector({
  variants,
  selectedVariant,
  onVariantChange,
  className = '',
}: ProductVariantSelectorProps) {
  // Extract unique attribute names and their values
  const attributeGroups = useMemo(() => {
    const groups: Map<string, Set<string>> = new Map();

    variants.forEach((variant) => {
      Object.entries(variant.attributes).forEach(([key, value]) => {
        if (!groups.has(key)) {
          groups.set(key, new Set());
        }
        groups.get(key)!.add(value);
      });
    });

    return Array.from(groups.entries()).map(([name, values]) => ({
      name,
      options: Array.from(values).map((value) => {
        // Check if this option is available with current selections
        const matchingVariant = variants.find((v) => {
          if (v.attributes[name] !== value) return false;
          
          // Check if this variant matches all other selected attributes
          if (selectedVariant) {
            return Object.entries(selectedVariant.attributes).every(([k, v]) => {
              if (k === name) return true; // Skip current attribute
              return variants.some(
                (variant) =>
                  variant.attributes[name] === value &&
                  variant.attributes[k] === v &&
                  variant.stock > 0
              );
            });
          }
          return v.stock > 0;
        });

        return {
          value,
          available: matchingVariant ? matchingVariant.stock > 0 : false,
          variant: matchingVariant,
        };
      }),
    }));
  }, [variants, selectedVariant]);

  const handleOptionClick = (attributeName: string, option: AttributeOption) => {
    if (!option.available) return;

    // Find the variant that matches all current selections with the new value
    const newAttributes = selectedVariant
      ? { ...selectedVariant.attributes, [attributeName]: option.value }
      : { [attributeName]: option.value };

    const matchingVariant = variants.find((variant) =>
      Object.entries(newAttributes).every(
        ([key, value]) => variant.attributes[key] === value
      )
    );

    if (matchingVariant) {
      onVariantChange(matchingVariant);
    } else {
      // If no exact match, find any variant with this attribute value
      const fallbackVariant = variants.find(
        (v) => v.attributes[attributeName] === option.value && v.stock > 0
      );
      if (fallbackVariant) {
        onVariantChange(fallbackVariant);
      }
    }
  };

  const isOptionSelected = (attributeName: string, value: string) => {
    return selectedVariant?.attributes[attributeName] === value;
  };

  const getAttributeLabel = (name: string) => {
    // Convert camelCase or snake_case to Title Case
    return name
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  };

  // Determine if attribute is a color type
  const isColorAttribute = (name: string) => {
    const colorKeywords = ['color', 'colour'];
    return colorKeywords.some((keyword) =>
      name.toLowerCase().includes(keyword)
    );
  };

  // Color mapping for common color names
  const getColorCode = (colorName: string): string | null => {
    const colors: Record<string, string> = {
      black: '#000000',
      white: '#ffffff',
      red: '#dc3545',
      blue: '#007bff',
      green: '#28a745',
      yellow: '#ffc107',
      orange: '#fd7e14',
      purple: '#6f42c1',
      pink: '#e83e8c',
      gray: '#6c757d',
      grey: '#6c757d',
      brown: '#795548',
      navy: '#001f3f',
      teal: '#20c997',
      gold: '#ffd700',
      silver: '#c0c0c0',
      beige: '#f5f5dc',
    };
    return colors[colorName.toLowerCase()] || null;
  };

  if (!variants.length || attributeGroups.length === 0) {
    return null;
  }

  return (
    <div className={`variant-selector ${className}`}>
      {attributeGroups.map((group) => (
        <div key={group.name} className="variant-selector-group">
          <label className="variant-selector-label">
            {getAttributeLabel(group.name)}:
            {selectedVariant && (
              <span className="variant-selector-value">
                {selectedVariant.attributes[group.name]}
              </span>
            )}
          </label>

          <div
            className={`variant-selector-options ${
              isColorAttribute(group.name) ? 'variant-selector-colors' : ''
            }`}
          >
            {group.options.map((option) => {
              const colorCode = isColorAttribute(group.name)
                ? getColorCode(option.value)
                : null;
              const isSelected = isOptionSelected(group.name, option.value);

              return (
                <button
                  key={option.value}
                  type="button"
                  className={`variant-selector-option ${
                    isSelected ? 'selected' : ''
                  } ${!option.available ? 'unavailable' : ''} ${
                    colorCode ? 'variant-selector-color' : ''
                  }`}
                  onClick={() => handleOptionClick(group.name, option)}
                  disabled={!option.available}
                  title={option.value}
                  aria-label={`${getAttributeLabel(group.name)}: ${option.value}${
                    !option.available ? ' (unavailable)' : ''
                  }`}
                  aria-pressed={isSelected}
                >
                  {colorCode ? (
                    <span
                      className="variant-selector-color-swatch"
                      style={{ backgroundColor: colorCode }}
                    />
                  ) : (
                    option.value
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {selectedVariant && selectedVariant.stock <= 5 && selectedVariant.stock > 0 && (
        <p className="variant-selector-stock-warning">
          Only {selectedVariant.stock} left in stock!
        </p>
      )}
    </div>
  );
}
