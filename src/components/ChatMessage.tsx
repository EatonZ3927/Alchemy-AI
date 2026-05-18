import { Sparkles, Languages, ExternalLink } from 'lucide-react';
import { Message } from '../types';
import { CopyButton } from './CopyButton';
import { QuestionCopyButton } from './QuestionCopyButton';
import { SaveImageButton } from './SaveImageButton';

interface ChatMessageProps {
  message: Message;
  promptLang: 'zh' | 'en';
  translatedPrompt: string;
  isTranslating: boolean;
  onToggleLang: () => void;
  getUserContent: () => string;
}

export function ChatMessage({
  message,
  promptLang,
  translatedPrompt,
  isTranslating,
  onToggleLang,
  getUserContent,
}: ChatMessageProps) {
  const getDisplayPrompt = (): string => {
    if (promptLang === 'en' && translatedPrompt) {
      return translatedPrompt;
    }
    return message.prompt || '';
  };

  const displayPrompt = getDisplayPrompt();

  return (
    <>
      {message.role === 'user' ? (
        <div className="flex items-start gap-2 max-w-[85%] md:max-w-[70%]">
          <QuestionCopyButton text={message.content} />
          <div className="bg-surface-container-high p-5 rounded-2xl rounded-tr-none shadow-lg border-l-2 border-primary/20">
            <p className="text-on-surface leading-relaxed whitespace-pre-wrap">{message.content}</p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/30 mt-1">
            <Sparkles className="w-5 h-5 text-primary fill-current" />
          </div>
          <div className="flex-grow space-y-6 max-w-[85%] md:max-w-[80%]">
            {message.model ? (
              <div className="bg-surface-container border border-outline-variant/15 rounded-2xl p-6 relative overflow-hidden ai-pulse-bg">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">推荐模型</label>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-headline font-bold text-primary">{message.model}</h3>
                      <span className="bg-tertiary/10 text-tertiary text-[10px] px-2 py-0.5 rounded-full border border-tertiary/20">{message.modelType || 'PRO'}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary block mb-1">推荐理由</span>
                    <p className="text-sm text-on-surface-variant leading-relaxed">{message.reasoning}</p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {message.chatboxUrl && (
                      <a
                        href={message.chatboxUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-lg text-xs text-primary transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>打开 Chatbox 或官网</span>
                        <ExternalLink className="w-3 h-3 opacity-70" />
                      </a>
                    )}
                    <SaveImageButton
                      userContent={getUserContent()}
                      model={message.model || ''}
                      modelType={message.modelType}
                      reasoning={message.reasoning}
                      prompt={displayPrompt}
                      chatboxUrl={message.chatboxUrl}
                    />
                  </div>

                  <div className="group relative rounded-xl bg-surface-container-highest border border-primary/10 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 bg-surface-container-highest border-b border-outline-variant/10">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">优化后的提示词</span>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={onToggleLang}
                          disabled={isTranslating}
                          className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-tertiary hover:text-on-primary transition-colors disabled:opacity-50"
                        >
                          <Languages className="w-3.5 h-3.5" />
                          <span>{promptLang === 'en' ? '中文' : 'EN'}</span>
                          {isTranslating && <span className="animate-pulse">...</span>}
                        </button>
                        <CopyButton text={displayPrompt} />
                      </div>
                    </div>
                    <div className="p-4 font-mono text-sm text-primary-dim/90 leading-relaxed bg-[#000000]/20 whitespace-pre-wrap">
                      {displayPrompt}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-surface-container border border-error/20 rounded-2xl p-6 relative overflow-hidden">
                <p className="text-error leading-relaxed whitespace-pre-wrap">{message.content}</p>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}