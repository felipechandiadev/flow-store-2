'use client'
import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import DropdownList, { dropdownOptionClass } from "../DropdownList/DropdownList";
import IconButton from "../IconButton/IconButton";
import { TextField } from "../TextField/TextField";


export interface Option {
  id: string | number;
  label: string;
}

interface AutoCompleteProps<T = Option> {
  options: T[];
  label?: string;
  placeholder?: string;
  value?: T | null;
  onChange?: (option: T | null) => void;
  onInputChange?: (value: string) => void;
  name?: string;
  required?: boolean;
  getOptionLabel?: (option: T) => string;
  getOptionValue?: (option: T) => any;
  filterOption?: (option: T, inputValue: string) => boolean;
  ["data-test-id"]?: string;
  disabled?: boolean;
  /** Etiqueta flotante siempre visible (útil con placeholder vacío o como selector). */
  alwaysShowLabel?: boolean;
}

// Ref map para tracking de items renderizados
const itemRefs = new Map<string | number, HTMLLIElement | null>();

const AutoComplete = <T = Option,>({
  options,
  label,
  placeholder,
  value = null,
  onChange,
  onInputChange,
  name,
  required,
  getOptionLabel,
  getOptionValue,
  filterOption,
  alwaysShowLabel = false,
  ...props
}: AutoCompleteProps<T>) => {
  // Helper functions with defaults for backward compatibility
  const defaultGetOptionLabel = (option: T): string => {
    if (typeof option === 'string') return option;
    if (option && typeof option === 'object' && 'label' in option) {
      return (option as any).label;
    }
    return String(option);
  };

  const defaultGetOptionValue = (option: T): any => {
    if (typeof option === 'string') return option;
    if (option && typeof option === 'object' && 'id' in option) {
      return (option as any).id;
    }
    return option;
  };

  const getLabel = getOptionLabel || defaultGetOptionLabel;
  const getValue = getOptionValue || defaultGetOptionValue;
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [inputValue, setInputValue] = useState(value ? getLabel(value) : "");
  const [focused, setFocused] = useState(false);
  const [open, setOpen] = useState(false);
  const [isSelectingOption, setIsSelectingOption] = useState(false);
  const [validationTriggered, setValidationTriggered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const disabled = (props as any).disabled;

  // Sync inputValue with value prop
  useEffect(() => {
    setInputValue(value ? getLabel(value) : "");
  }, [value]);

  const shrink = focused || inputValue.length > 0;
  const filteredOptions = useMemo(
    () =>
      options.filter((opt) => {
        if (typeof filterOption === "function") {
          return filterOption(opt, inputValue);
        }
        return getLabel(opt).toLowerCase().includes(inputValue.toLowerCase());
      }),
    [options, inputValue, filterOption, getLabel],
  );

  const handleSelect = useCallback(
    (option: T) => {
      setInputValue(getLabel(option));
      setOpen(false);
      setHighlightedIndex(-1);
      onChange?.(option);
    },
    [getLabel, onChange],
  );

  /**
   * Misma lógica que Select: listener en document (burbuja), `highlightedIndex` en dependencias del
   * efecto para que Enter use el índice actual. El foco en el input no marca `focused` en el padre;
   * comprobamos `containerRef.contains(document.activeElement)`.
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const root = containerRef.current;
      if (!root || disabled) {
        return;
      }
      const active = document.activeElement;
      if (!active || !root.contains(active)) {
        return;
      }

      const list = filteredOptions;

      if (!open) {
        if (["ArrowDown", "ArrowUp", "Enter"].includes(e.key)) {
          if (list.length === 0) {
            return;
          }
          e.preventDefault();
          setOpen(true);
          setHighlightedIndex(e.key === "ArrowUp" ? list.length - 1 : 0);
        }
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        setHighlightedIndex(-1);
        return;
      }

      if (list.length === 0) {
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex((i) => (i < list.length - 1 ? i + 1 : 0));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((i) => (i > 0 ? i - 1 : list.length - 1));
        return;
      }
      if (e.key === "Enter" && highlightedIndex >= 0) {
        e.preventDefault();
        if (highlightedIndex < list.length) {
          handleSelect(list[highlightedIndex]!);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [disabled, open, filteredOptions, handleSelect, highlightedIndex]);

  // Scroll al item destacado (auto evita saltos bruscos con listas largas)
  useEffect(() => {
    if (highlightedIndex >= 0 && open) {
      const highlightedKey = getValue(filteredOptions[highlightedIndex]);
      const element = itemRefs.get(highlightedKey);
      if (element) {
        element.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex, open, filteredOptions, getValue]);

  const handleClear = () => {
    setInputValue(""); // Clear the input text
    setOpen(false); // Close the dropdown
    setHighlightedIndex(-1); // Reset the highlighted index
    onInputChange?.("");
    onChange?.(null); // Clear the selected option
  };

  const handleValidation = () => {
    if (required && (!value || (inputValue && !value))) {
      setValidationTriggered(true);
      setOpen(false); // Prevent dropdown from opening when validation fails
    } else {
      setValidationTriggered(false);
    }
  };

  return (
    <div className="fs-dropdown-container" ref={containerRef} data-test-id={props["data-test-id"] || "auto-complete-root"} data-has-options={options.length > 0 ? "true" : "false"}>
      <div
        className="relative w-full border border-border rounded-md focus-within:border-primary"
        onFocusCapture={() => {
          if (disabled) {
            return;
          }
          setFocused(true);
          setOpen(true);
        }}
        onBlur={() => {
          setFocused(false);
          handleValidation();
          if (!isSelectingOption) {
            setTimeout(() => setOpen(false), 150);
          }
          setHighlightedIndex(-1);
        }}
        tabIndex={-1}
      >
        <TextField
          label={label || ""}
          value={inputValue}
          onChange={e => {
            const newValue = e.target.value;
            setInputValue(newValue);
            onInputChange?.(newValue);
            setOpen(true);
            setHighlightedIndex(-1);
          }}
          placeholder={placeholder}
          name={name}
          required={required}
          data-test-id="auto-complete-input"
          className="pr-20"
          variante="autocomplete"
          disabled={disabled}
          alwaysShowLabel={alwaysShowLabel}
        />

        {value && !disabled && (
          <IconButton
            icon="X"
            variant="basicSecondary"
            className="absolute right-10 top-1/2 z-20 flex h-6 w-6 min-h-6 min-w-6 -translate-y-1/2 items-center justify-center p-0"
            onClick={handleClear}
            aria-label="Limpiar selección"
            data-test-id="auto-complete-clear-icon"
            tabIndex={-1}
            disabled={disabled}
          />
        )}

        {!disabled && (
          <IconButton
            icon="ChevronDown"
            variant="basicSecondary"
            className="absolute right-2 top-1/2 z-20 flex h-6 w-6 min-h-6 min-w-6 -translate-y-1/2 items-center justify-center p-0"
            tabIndex={-1}
            aria-label="Desplegar opciones"
            onClick={(ev) => {
              ev.stopPropagation();
              setOpen((o) => !o);
            }}
            data-test-id="auto-complete-dropdown-icon"
            disabled={disabled}
          />
        )}
      </div>
      <DropdownList 
        open={open && filteredOptions.length > 0} 
        testId="auto-complete-list"
        highlightedIndex={highlightedIndex}
        onHoverChange={(idx) => {
          // DropdownList now handles hover, we just track it if needed
        }}
        usePortal={true}
        anchorRef={containerRef}
      >
        {filteredOptions.map((opt, idx) => {
          const optValue = getValue(opt);
          const isHighlighted = highlightedIndex === idx;
          return (
            <li
              key={optValue}
              ref={(el) => {
                if (el) itemRefs.set(optValue, el);
                else itemRefs.delete(optValue);
              }}
              className={dropdownOptionClass}
              onMouseDown={() => {
                setIsSelectingOption(true);
                handleSelect(opt);
                setTimeout(() => setIsSelectingOption(false), 200);
              }}
              onMouseEnter={() => {
                setHighlightedIndex(idx);
              }}
              role="option"
              aria-selected={isHighlighted}
              data-test-id={`auto-complete-option-${optValue}`}
            >
              {getLabel(opt)}
            </li>
          );
        })}
      </DropdownList>
    </div>
  );
};

export default AutoComplete;
