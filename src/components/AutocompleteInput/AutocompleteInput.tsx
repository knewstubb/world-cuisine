import { useState, useRef, useCallback, useEffect } from 'react';
import styles from './AutocompleteInput.module.css';

/**
 * Pure filter function: returns dish names that contain the query
 * as a case-insensitive substring. Returns empty array when query is empty.
 */
export function filterSuggestions(allNames: string[], query: string): string[] {
  if (query.trim().length === 0) return [];
  const lowerQuery = query.toLowerCase();
  return allNames.filter((name) => name.toLowerCase().includes(lowerQuery));
}

export interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (suggestion: string) => void;
  suggestions: string[];
  placeholder?: string;
}

export default function AutocompleteInput({
  value,
  onChange,
  onSelect,
  suggestions,
  placeholder,
}: AutocompleteInputProps) {
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Show dropdown when there are suggestions and input has focus
  const showDropdown = isOpen && suggestions.length > 0;

  // Reset active index when suggestions change
  useEffect(() => {
    setActiveIndex(-1);
  }, [suggestions]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
      setIsOpen(true);
    },
    [onChange],
  );

  const handleSelect = useCallback(
    (suggestion: string) => {
      onSelect(suggestion);
      setIsOpen(false);
      setActiveIndex(-1);
    },
    [onSelect],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!showDropdown) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setActiveIndex((prev) =>
            prev < suggestions.length - 1 ? prev + 1 : prev,
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setActiveIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;
        case 'Enter':
          if (activeIndex >= 0 && activeIndex < suggestions.length) {
            e.preventDefault();
            handleSelect(suggestions[activeIndex]);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          setActiveIndex(-1);
          break;
      }
    },
    [showDropdown, activeIndex, suggestions, handleSelect],
  );

  const handleBlur = useCallback(() => {
    // Delay closing so click on suggestion can fire first
    setTimeout(() => setIsOpen(false), 150);
  }, []);

  const handleFocus = useCallback(() => {
    if (suggestions.length > 0) {
      setIsOpen(true);
    }
  }, [suggestions]);

  return (
    <div className={styles.wrapper}>
      <input
        ref={inputRef}
        type="text"
        className={styles.input}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onFocus={handleFocus}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={showDropdown}
        aria-autocomplete="list"
        aria-controls={showDropdown ? 'autocomplete-listbox' : undefined}
        aria-activedescendant={
          activeIndex >= 0 ? `suggestion-${activeIndex}` : undefined
        }
      />
      {showDropdown && (
        <ul
          ref={listRef}
          id="autocomplete-listbox"
          className={styles.dropdown}
          role="listbox"
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion}
              id={`suggestion-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              className={`${styles.suggestion} ${index === activeIndex ? styles.suggestionActive : ''}`}
              onMouseDown={() => handleSelect(suggestion)}
            >
              {suggestion}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
