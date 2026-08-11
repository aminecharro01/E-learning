import type React from "react";
import { Check } from "lucide-react";

/** Adapted from TailAdmin (MIT) */
interface CheckboxProps {
  label?: React.ReactNode;
  checked: boolean;
  className?: string;
  id?: string;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

const Checkbox: React.FC<CheckboxProps> = ({
  label,
  checked,
  id,
  onChange,
  className = "",
  disabled = false,
}) => {
  return (
    <label
      className={`group flex cursor-pointer items-center space-x-3 ${
        disabled ? "cursor-not-allowed opacity-60" : ""
      }`}
    >
      <div className="relative h-5 w-5">
        <input
          id={id}
          type="checkbox"
          className={`h-5 w-5 appearance-none rounded-md border border-theme checked:border-transparent checked:bg-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] ${className}`}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
        />
        {checked && (
          <Check
            className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transform text-white"
            size={14}
            strokeWidth={2.5}
          />
        )}
      </div>
      {label && (
        <span className="text-sm font-medium text-heading">{label}</span>
      )}
    </label>
  );
};

export default Checkbox;
