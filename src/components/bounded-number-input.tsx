'use client';

import { useState } from 'react';

export default function BoundedNumberInput({ id, value, min, max, onChange, invalid = false, describedBy }: {
  id: string; value: number; min: number; max: number; onChange: (value: number) => void;
  invalid?: boolean; describedBy?: string;
}) {
  const [entry, setEntry] = useState({ value, text: String(value) });
  // Follow changes from another field (for example, switching round customization).
  if (entry.value !== value) setEntry({ value, text: String(value) });
  const number = Number(entry.text);
  const valid = entry.text.trim() !== '' && Number.isInteger(number) && number >= min && number <= max;
  return <input id={id} type="number" inputMode="numeric" min={min} max={max} step={1} required autoComplete="off"
    value={entry.text} aria-invalid={invalid || !valid} aria-describedby={describedBy}
    onChange={event => {
      const text = event.target.value;
      const number = event.target.valueAsNumber;
      const valid = event.target.validity.valid && Number.isInteger(number);
      setEntry({ value: valid ? number : value, text });
      if (valid) onChange(number);
    }} />;
}
