"use client";

export default function CountSelector({
  label,
  value,
  max,
  displayMax,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  displayMax: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="need-selector">
      <strong>{label}</strong>
      <div className="count-buttons" aria-label={`${label} requested slots`}>
        {Array.from({ length: displayMax + 1 }, (_, i) => {
          const disabled = i > max;
          return (
            <button
              type="button"
              key={i}
              className={`count-btn ${value === i ? "selected" : ""}`}
              disabled={disabled}
              aria-disabled={disabled}
              title={disabled ? "That would exceed the raid party size" : undefined}
              onClick={() => !disabled && onChange(i)}
            >
              {i}
            </button>
          );
        })}
      </div>
    </div>
  );
}
