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
  /** Refs por instancia (evita colisiones entre múltiples AutoComplete en la página). */
  const itemRefsRef = useRef<Map<string | number, HTMLLIElement | null>>(new Map());
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

  // Mantener el índice destacado válido al cambiar el filtrado/abierto.
  useEffect(() => {
    if (!open) {
      return;
    }
    if (filteredOptions.length === 0) {
      if (highlightedIndex !== -1) {
        setHighlightedIndex(-1);
      }
      return;
    }
    if (highlightedIndex >= filteredOptions.length) {
      setHighlightedIndex(filteredOptions.length - 1);
    }
  }, [open, filteredOptions.length, highlightedIndex]);

  const handleSelect = useCallback(
    (option: T) => {
      setInputValue(getLabel(option));
      setOpen(false);
      setHighlightedIndex(-1);
      onChange?.(option);
    },
    [getLabel, onChange],
  );

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (disabled) {
        return;
      }

      const list = filteredOptions;
      const hasItems = list.length > 0;

      // #region agent log
      fetch('http://127.0.0.1:7499/ingest/88a9c382-e0ee-4ab4-9a5c-23a427cc624a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'67a81e'},body:JSON.stringify({sessionId:'67a81e',runId:'pre-fix',hypothesisId:'H1',location:'AutoComplete.tsx:handleInputKeyDown',message:'keydown',data:{key:e.key,open,highlightedIndex,filteredLen:list.length,hasItems,disabled:!!disabled},timestamp:Date.now()})}).catch(()=>{});
      // #endregion agent log

      // Abrir con teclado aunque aún no esté abierto.
      if (!open) {
        if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter") {
          if (!hasItems) {
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

      if (!hasItems) {
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        e.stopPropagation();
        setHighlightedIndex((i) => (i < list.length - 1 ? i + 1 : 0));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        e.stopPropagation();
        setHighlightedIndex((i) => (i > 0 ? i - 1 : list.length - 1));
        return;
      }
      if (e.key === "Enter") {
        // Evitar submit de formularios al seleccionar.
        if (highlightedIndex >= 0 && highlightedIndex < list.length) {
          e.preventDefault();
          e.stopPropagation();
          // #region agent log
          fetch('http://127.0.0.1:7499/ingest/88a9c382-e0ee-4ab4-9a5c-23a427cc624a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'67a81e'},body:JSON.stringify({sessionId:'67a81e',runId:'pre-fix',hypothesisId:'H1',location:'AutoComplete.tsx:handleInputKeyDown',message:'enter-select',data:{highlightedIndex,selectedValue:String(getValue(list[highlightedIndex]!))},timestamp:Date.now()})}).catch(()=>{});
          // #endregion agent log
          handleSelect(list[highlightedIndex]!);
        }
      }
    },
    [disabled, filteredOptions, open, highlightedIndex, handleSelect],
  );

  /**
   * Respaldo: manejar flechas/Enter aun si el foco no está exactamente en el <input>
   * (p. ej. foco en el wrapper o en un botón dentro del control).
   */
  useEffect(() => {
    const onDocKeyDown = (e: KeyboardEvent) => {
      if (disabled) return;
      if (e.defaultPrevented) return;
      const root = containerRef.current;
      if (!root) return;
      const active = document.activeElement;
      if (!active || !root.contains(active)) return;

      // Si el foco está en el input/textarea, el handler `onKeyDown` del TextField
      // ya se encarga de la navegación. Evita doble incremento (salta opciones).
      const tag = (active as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") {
        return;
      }

      const list = filteredOptions;
      const hasItems = list.length > 0;

      if (!open) {
        if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter") {
          if (!hasItems) return;
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

      if (!hasItems) return;

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
      if (e.key === "Enter") {
        if (highlightedIndex >= 0 && highlightedIndex < list.length) {
          e.preventDefault();
          handleSelect(list[highlightedIndex]!);
        }
      }
    };

    // Bubble: así el input puede `stopPropagation()` y evitar dobles eventos.
    document.addEventListener("keydown", onDocKeyDown);
    return () => document.removeEventListener("keydown", onDocKeyDown);
  }, [disabled, filteredOptions, open, highlightedIndex, handleSelect]);

  // Scroll al item destacado (auto evita saltos bruscos con listas largas)
  useEffect(() => {
    if (highlightedIndex >= 0 && open) {
      const highlightedKey = getValue(filteredOptions[highlightedIndex]);
      const element = itemRefsRef.current.get(highlightedKey);
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
          onKeyDown={handleInputKeyDown}
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
                if (el) itemRefsRef.current.set(optValue, el);
                else itemRefsRef.current.delete(optValue);
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
