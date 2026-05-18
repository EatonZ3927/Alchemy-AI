import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export function QuestionCopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="flex-shrink-0 flex items-center justify-center w-8 h-8 bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/20 rounded-full text-on-surface-variant hover:text-primary transition-all active:scale-90"
      title="复制"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}