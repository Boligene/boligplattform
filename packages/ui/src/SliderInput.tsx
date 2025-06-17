import React, { useState, useEffect } from "react";

function formatNumber(value: number) {
  return value === 0 ? "" : value.toLocaleString("no-NO");
}
function parseNumber(str: string): number {
  return Number(str.replace(/[^\d]/g, ""));
}

export default function SliderInput({ label, min, max, step, value, setValue, disabled = false }: {
  label: React.ReactNode; min: number; max: number; step: number; value: number; setValue: (n: number) => void; disabled?: boolean;
}) {
  const [editingValue, setEditingValue] = useState<string>(value === 0 ? "" : formatNumber(value));
  useEffect(() => {
    setEditingValue(value === 0 ? "" : formatNumber(value));
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\s/g, "");
    if (raw === "") {
      setEditingValue("");
      setValue(0);
    } else {
      const num = parseNumber(raw);
      setEditingValue(num === 0 ? "" : formatNumber(num));
      setValue(num);
    }
  };

  const handleBlur = () => {
    if (!editingValue || parseNumber(editingValue) === 0) {
      setEditingValue("");
      setValue(0);
    } else {
      const val = parseNumber(editingValue);
      setEditingValue(formatNumber(val));
      setValue(val);
    }
  };

  return (
    <div className="mb-4">
      <label className="block font-semibold mb-1">{label}</label>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        pattern="[0-9\s]*"
        className="w-full text-lg font-sans border rounded px-3 py-2 appearance-none focus:ring-2 focus:ring-brown-300 transition"
        value={editingValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        placeholder="0"
        disabled={disabled}
      />
      <input
        type="range"
        className="w-full mt-2 accent-brown-700 cursor-pointer"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => {
          const v = Number(e.target.value);
          setEditingValue(v === 0 ? "" : formatNumber(v));
          setValue(v);
        }}
        disabled={disabled}
      />
    </div>
  );
} 