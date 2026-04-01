import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface SearchableSelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  "data-testid"?: string;
}

/**
 * A searchable select dropdown that filters options as you type.
 * Replaces native `<select>` elements across the application.
 */
export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select...",
  className,
  required,
  "data-testid": testId,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  const filtered = search
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  const handleSelect = useCallback(
    (optionValue: string) => {
      onChange(optionValue);
      setSearch("");
      setOpen(false);
    },
    [onChange],
  );

  const handleClear = useCallback(() => {
    onChange("");
    setSearch("");
    setOpen(false);
  }, [onChange]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Close on escape
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
      setSearch("");
    }
  };

  return (
    <div ref={containerRef} className={cn("relative", className)} onKeyDown={handleKeyDown}>
      {/* Hidden native select for form validation */}
      {required && (
        <select
          tabIndex={-1}
          value={value}
          required={required}
          onChange={() => {}}
          className="sr-only"
          aria-hidden="true"
        >
          <option value="" />
          {value && <option value={value} />}
        </select>
      )}

      <button
        type="button"
        onClick={() => {
          setOpen(!open);
          if (!open) {
            setTimeout(() => inputRef.current?.focus(), 0);
          }
        }}
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm",
          !selectedOption && "text-muted-foreground",
        )}
        data-testid={testId}
      >
        <span className="truncate">{selectedOption?.label ?? placeholder}</span>
        <svg
          className="h-4 w-4 shrink-0 opacity-50"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg">
          <div className="p-1">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="flex h-8 w-full rounded-sm border-0 bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground"
              data-testid={testId ? `${testId}-search` : undefined}
            />
          </div>
          <div className="max-h-48 overflow-y-auto p-1">
            {value && (
              <button
                type="button"
                onClick={handleClear}
                className="flex w-full cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent"
              >
                Clear selection
              </button>
            )}
            {filtered.length === 0 ? (
              <p className="px-2 py-1.5 text-sm text-muted-foreground">No results found</p>
            ) : (
              filtered.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={cn(
                    "flex w-full cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent",
                    option.value === value && "bg-accent font-medium",
                  )}
                  data-testid={testId ? `${testId}-option-${option.value}` : undefined}
                >
                  {option.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
