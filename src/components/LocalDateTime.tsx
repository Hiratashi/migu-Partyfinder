"use client";

import { useEffect, useState } from "react";

export default function LocalDateTime({
  iso,
  timeOnly = false,
}: {
  iso: string;
  timeOnly?: boolean;
}) {
  const [text, setText] = useState<string>("");

  useEffect(() => {
    const d = new Date(iso);

    setText(
      timeOnly
        ? new Intl.DateTimeFormat(undefined, {
            hour: "2-digit",
            minute: "2-digit",
            timeZoneName: "short",
          }).format(d)
        : new Intl.DateTimeFormat(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          }).format(d)
    );
  }, [iso, timeOnly]);

  return <time dateTime={iso}>{text || "…"}</time>;
}