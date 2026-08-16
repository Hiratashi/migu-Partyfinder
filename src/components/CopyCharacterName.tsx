"use client";

import { useState } from "react";

export default function CopyCharacterName({
  name,
}:{
  name:string;
}) {
  const [copied,setCopied]=useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(name);
      setCopied(true);
      window.setTimeout(()=>setCopied(false),1200);
    } catch {
      setCopied(false);
    }
  }

  return <button
    className="copy-character-name"
    type="button"
    onClick={copy}
    title={`Copy ${name}`}
    aria-label={`Copy character name ${name}`}
  >
    <code>{copied?"Copied!":name}</code>
    <span aria-hidden="true" className="copy-character-name-icon">
      {copied?"✓":"⧉"}
    </span>
  </button>;
}
