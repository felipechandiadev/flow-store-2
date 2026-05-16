import type { InputHTMLAttributes } from "react";

type SwitchFieldProps = {
  id: string;
  label: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "type" | "className">;

export function SwitchField({ id, label, checked, ...rest }: SwitchFieldProps) {
  const on = Boolean(checked);
  return (
    <label htmlFor={id} className="fs-print-switch my-2 inline-flex">
      <span className="relative inline-flex">
        <input id={id} type="checkbox" role="switch" checked={checked} aria-checked={on} {...rest} />
        <span className={`fs-print-switch__track ${on ? "fs-print-switch__track--on" : ""}`}>
          <span className={`fs-print-switch__thumb ${on ? "fs-print-switch__thumb--on" : ""}`} />
        </span>
      </span>
      <span className="text-sm font-medium text-foreground">{label}</span>
    </label>
  );
}
