import { useState } from 'react';

export function useCopy(resetDelay = 2000) {
  const [copied, setCopied] = useState(false);

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), resetDelay);
  };

  return { copied, copy };
}
