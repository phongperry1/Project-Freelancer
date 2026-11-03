import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import './customSelect.css';

export interface CustomSelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

export interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: CustomSelectOption[];
  icon?: React.ReactNode;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
  align?: 'left' | 'right';
  defaultValue?: string;
}

const CustomSelectComponent: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  icon,
  placeholder = 'Chọn một tùy chọn',
  ariaLabel,
  className = '',
  disabled = false,
  align = 'left',
  defaultValue = 'all',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  );
  const isFiltered = value !== defaultValue && value !== '';

  const handleToggle = useCallback(() => {
    if (!disabled) {
      setIsOpen((prev) => !prev);
    }
  }, [disabled]);

  const handleSelect = useCallback(
    (val: string) => {
      onChange(val);
      setIsOpen(false);
    },
    [onChange]
  );

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  }, []);

  // Click outside listener
  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, handleClickOutside]);

  return (
    <div
      ref={containerRef}
      className={`tku-custom-select-wrap ${className}`}
      onKeyDown={handleKeyDown}
    >
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel || selectedOption?.label || placeholder}
        className={`tku-custom-select-trigger ${isOpen ? 'is-open' : ''} ${
          isFiltered ? 'is-filtered' : ''
        }`}
      >
        <span className="tku-custom-select-trigger__left">
          {icon && <span className="tku-custom-select__icon">{icon}</span>}
          <span className="tku-custom-select__label">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </span>
        <ChevronDown
          size={14}
          className={`tku-custom-select__arrow ${isOpen ? 'is-rotated' : ''}`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          className={`tku-custom-select-dropdown is-align-${align}`}
          role="listbox"
          aria-label={ariaLabel}
        >
          <div className="tku-custom-select-options">
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <div
                  key={opt.value}
                  role="option"
                  aria-selected={isSelected}
                  tabIndex={0}
                  onClick={() => handleSelect(opt.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelect(opt.value);
                    }
                  }}
                  className={`tku-custom-select-option ${isSelected ? 'is-selected' : ''}`}
                >
                  <div className="tku-custom-select-option__content">
                    {opt.icon && (
                      <span className="tku-custom-select-option__icon">{opt.icon}</span>
                    )}
                    <span className="tku-custom-select-option__text">{opt.label}</span>
                  </div>
                  {isSelected && (
                    <Check size={14} className="tku-custom-select-option__check" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export const CustomSelect = React.memo(CustomSelectComponent);
CustomSelect.displayName = 'CustomSelect';
