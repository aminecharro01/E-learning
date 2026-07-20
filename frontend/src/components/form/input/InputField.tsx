import React, { FC } from "react";
import { inputClass } from "@/lib/ui";

/** Adapted from TailAdmin (MIT) — uses global input-theme tokens */
interface InputProps {
  type?: string;
  id?: string;
  name?: string;
  placeholder?: string;
  value?: string;
  defaultValue?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  min?: string;
  max?: string;
  step?: number;
  disabled?: boolean;
  success?: boolean;
  error?: boolean;
  hint?: string;
  required?: boolean;
  autoComplete?: string;
  minLength?: number;
}

const Input: FC<InputProps> = ({
  type = "text",
  id,
  name,
  placeholder,
  value,
  defaultValue,
  onChange,
  className = "",
  min,
  max,
  step,
  disabled = false,
  success = false,
  error = false,
  hint,
  required,
  autoComplete,
  minLength,
}) => {
  let inputClasses = `${inputClass} ${className}`;

  if (disabled) {
    inputClasses += " cursor-not-allowed opacity-60";
  } else if (error) {
    inputClasses += " border-[var(--danger)]";
  } else if (success) {
    inputClasses += " border-[var(--success)]";
  }

  return (
    <div className="relative">
      <input
        type={type}
        id={id}
        name={name}
        placeholder={placeholder}
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        required={required}
        autoComplete={autoComplete}
        minLength={minLength}
        className={inputClasses}
      />
      {hint && (
        <p
          className={`mt-1.5 text-xs ${
            error ? "text-[var(--danger)]" : success ? "text-[var(--success)]" : "text-muted"
          }`}
        >
          {hint}
        </p>
      )}
    </div>
  );
};

export default Input;
