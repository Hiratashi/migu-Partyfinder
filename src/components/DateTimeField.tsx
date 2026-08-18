"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
  name: string;
  label: string;
  initialIso?: string | null;
  required?: boolean;
  minDateTime?: Date;
};

const pad = (n: number) => String(n).padStart(2, "0");

function toDateValue(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function roundUpToFive(d: Date) {
  const out = new Date(d);
  out.setSeconds(0, 0);
  const remainder = out.getMinutes() % 5;
  if (remainder !== 0) out.setMinutes(out.getMinutes() + (5 - remainder));
  return out;
}

function parseInitial(initialIso?: string | null) {
  if (!initialIso) return null;
  const d = roundUpToFive(new Date(initialIso));
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export default function DateTimeField({
  name,
  label,
  initialIso,
  required = true,
  minDateTime,
}: Props) {
  const initial = useMemo(() => parseInitial(initialIso), [initialIso]);
  const min = useMemo(
    () => roundUpToFive(minDateTime ?? new Date(Date.now() + 60_000)),
    [minDateTime],
  );

  const [date, setDate] = useState(initial ? toDateValue(initial) : toDateValue(min));
  const [hour, setHour] = useState(initial ? pad(initial.getHours()) : pad(min.getHours()));
  const [minute, setMinute] = useState(initial ? pad(initial.getMinutes()) : pad(min.getMinutes()));

  const hours = Array.from({ length: 24 }, (_, i) => pad(i));
  const minutes = Array.from({ length: 12 }, (_, i) => pad(i * 5));

  const minDate = toDateValue(min);

  // If "today" is selected, keep the initial default from falling behind the minimum.
  useEffect(() => {
    if (date !== minDate) return;
    const candidate = new Date(`${date}T${hour}:${minute}`);
    if (candidate < min) {
      setHour(pad(min.getHours()));
      setMinute(pad(min.getMinutes()));
    }
  }, [date, hour, minute, min, minDate]);

  const combined = `${date}T${hour}:${minute}`;

  return (
    <label className="date-time-field">
      <span>{label}</span>
      <div className="date-time-row">
        <input
          className="date-part"
          type="date"
          value={date}
          min={minDate}
          onChange={(e) => setDate(e.target.value)}
          required={required}
        />

        <select
          className="time-part"
          value={hour}
          onChange={(e) => setHour(e.target.value)}
          aria-label={`${label} hour`}
        >
          {hours.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>

        <span className="time-separator">:</span>

        <select
          className="time-part"
          value={minute}
          onChange={(e) => setMinute(e.target.value)}
          aria-label={`${label} minute`}
        >
          {minutes.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      <input type="hidden" name={name} value={combined} />
    </label>
  );
}
