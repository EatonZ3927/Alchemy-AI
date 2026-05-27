import { Copy, Check } from 'lucide-react';
import { useCopy } from '../hooks/useCopy';

export function CopyButton({ text }: { text: string }) {
  const { copied, copy } = useCopy();

  return (
    <button
      onClick={() => copy(text)}
      className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-primary hover:opacity-80 transition-opacity"
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      <span>{copied ? '已复制' : '复制提示词'}</span>
    </button>
  );
}
