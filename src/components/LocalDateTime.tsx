"use client";
export default function LocalDateTime({iso, timeOnly=false}:{iso:string;timeOnly?:boolean}) {
  const d = new Date(iso);
  const text = timeOnly
    ? new Intl.DateTimeFormat(undefined,{hour:"2-digit",minute:"2-digit",timeZoneName:"short"}).format(d)
    : new Intl.DateTimeFormat(undefined,{dateStyle:"medium",timeStyle:"short"}).format(d);
  return <time dateTime={iso} suppressHydrationWarning>{text}</time>;
}
