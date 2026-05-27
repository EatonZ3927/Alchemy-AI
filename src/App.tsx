/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Paperclip, Sparkles, Layers, Film, Image as ImageIcon } from 'lucide-react';
import { useChat } from './hooks/useChat';
import { FlaskIcon } from './components/FlaskIcon';
import { ChatMessage } from './components/ChatMessage';
import { MAX_ATTACHED_FILES, isSupportedVideoFile } from './utils';

export default function App() {
  const chat = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const attachedFileCount = chat.attachedFiles.length;
  const canAttachMore = attachedFileCount < MAX_ATTACHED_FILES;
  const canSubmit = chat.inputValue.trim().length > 0 || attachedFileCount > 0;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chat.messages, chat.isTyping]);

  // 空状态：首次进入页面
  if (chat.messages.length === 0) {
    return (
      <div className="bg-surface text-on-surface font-body selection:bg-primary/30 flex flex-col items-center min-h-screen">
        <main className="flex flex-col justify-center px-6 w-full max-w-7xl mx-auto h-[calc(100vh-2.5rem)] items-center">
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative mb-8 flex flex-col w-full max-w-4xl items-center"
          >
            <div className="absolute -left-20 -top-20 w-96 h-96 glow-orb rounded-full"></div>
            <div className="relative z-10 w-full">
              <h2 className="text-5xl md:text-7xl font-extrabold font-headline tracking-tighter leading-tight mb-6 flex items-center gap-4 justify-center">
                炼金术 <span className="text-primary">AI</span>
                <div className="relative w-12 h-12 md:w-16 md:h-16 flex-shrink-0">
                  <FlaskIcon />
                </div>
              </h2>
              <p className="text-xl md:text-2xl text-on-surface-variant font-light leading-relaxed text-center">
                我是炼金术士，<br />请告诉我你想炼制什么提示词？
              </p>
            </div>
          </motion.section>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="w-full max-w-3xl"
          >
            <div className="glass-panel border border-primary/10 rounded-2xl p-2 emerald-glow">
              <div className="relative flex flex-col">
                <textarea
                  value={chat.inputValue}
                  onChange={chat.handleInput}
                  onKeyDown={chat.handleKeyDown}
                  className="w-full bg-transparent border-none focus:ring-0 focus:outline-none text-on-surface placeholder:text-on-surface-variant/50 p-4 min-h-[56px] max-h-48 resize-none scroll-py-4 font-body"
                  placeholder="输入你的灵感，开始炼制..."
                />
                {attachedFileCount > 0 && (
                  <div className="flex flex-wrap items-center gap-2 px-4 pb-2">
                    {chat.attachedFiles.map((file, index) => {
                      const isVideo = isSupportedVideoFile(file);
                      return (
                        <div key={index} className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-xs ${isVideo ? 'bg-tertiary/10 border-tertiary/20 text-tertiary' : 'bg-primary/10 border-primary/20 text-primary'}`}>
                          {isVideo ? <Film className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}
                          <span className="truncate max-w-[150px]">{file.name}</span>
                          <button
                            onClick={() => chat.handleRemoveFile(index)}
                            className="ml-1 hover:opacity-70 transition-opacity"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                    {canAttachMore && (
                      <span className="text-xs text-on-surface-variant">还可上传 {MAX_ATTACHED_FILES - attachedFileCount} 个文件</span>
                    )}
                  </div>
                )}
                <div className="flex items-center justify-between px-4 pb-3">
                  <div className="flex items-center gap-2">
                    <input
                      ref={chat.fileInputRef}
                      type="file"
                      onChange={chat.handleFileSelect}
                      className="hidden"
                      accept="image/*,video/*,.mp4,.mov,.avi,.wmv,.flv,.mkv,.webm"
                      multiple
                    />
                    <button
                      onClick={chat.handleAttachClick}
                      disabled={!canAttachMore}
                      className="flex items-center justify-center w-10 h-10 bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/20 rounded-full text-on-surface-variant hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title={canAttachMore ? `上传图片或视频（最多${MAX_ATTACHED_FILES}个，视频限30秒）` : "已达最大文件数量"}
                    >
                      <Paperclip className="w-5 h-5" />
                    </button>
                    {attachedFileCount > 0 && (
                      <span className="text-xs text-on-surface-variant">{attachedFileCount}/{MAX_ATTACHED_FILES}</span>
                    )}
                  </div>
                  <button
                    onClick={chat.handleSubmit}
                    disabled={!canSubmit}
                    className="flex items-center gap-2 px-6 py-2.5 bg-primary text-on-primary rounded-full font-label tracking-widest uppercase text-sm font-bold active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    炼制
                    <Sparkles className="w-4 h-4 fill-current" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </main>
        <div className="fixed bottom-0 left-0 w-full pb-4 z-40">
          <p className="text-[10px] text-center text-white font-label tracking-widest uppercase opacity-80">
            此炼金术士由AI生成
          </p>
        </div>
      </div>
    );
  }

  // 对话状态
  return (
    <div className="bg-background text-on-surface font-body selection:bg-primary selection:text-on-primary min-h-screen flex flex-col">
      <header className="fixed top-0 left-0 w-full h-14 bg-surface/80 glass-effect border-b border-outline-variant/10 z-50 flex items-center px-4">
        <h1 className="text-[#00FF41] font-headline font-extrabold tracking-widest text-sm uppercase mx-auto">炼金术士AI工作坊</h1>
      </header>

      <main className="flex-1 pt-24 pb-40 px-4 md:px-8 max-w-5xl mx-auto w-full">
        <div className="space-y-12">
          <AnimatePresence initial={false}>
            {chat.messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start items-start gap-4'}`}
              >
                <ChatMessage
                  message={msg}
                  promptLang={chat.promptLangs[msg.id] || 'zh'}
                  translatedPrompt={chat.translatedPrompts[msg.id] || ''}
                  isTranslating={chat.translating[msg.id] || false}
                  onToggleLang={() => chat.togglePromptLang(msg.id)}
                  getUserContent={() => chat.getUserContentForMessage(msg.id)}
                />
              </motion.div>
            ))}

            {chat.isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start items-start gap-4"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/30 mt-1">
                  <Sparkles className="w-5 h-5 text-primary fill-current animate-pulse" />
                </div>
                <div className="flex items-center h-10 px-4 bg-surface-container-high rounded-2xl rounded-tl-none border border-outline-variant/10">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>
      </main>

      <div className="fixed bottom-0 left-0 w-full p-4 md:p-8 bg-gradient-to-t from-background via-background/95 to-transparent z-40">
        <div className="max-w-4xl mx-auto flex flex-col gap-3">
          <div className="flex justify-center gap-4">
            <button
              onClick={chat.clearMessages}
              className="flex items-center justify-center gap-2 px-8 py-2.5 min-w-[160px] bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/20 rounded-full text-xs font-bold uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>开启新对话</span>
            </button>
            <button
              onClick={chat.handleSummarize}
              disabled={chat.isTyping || chat.messages.length === 0}
              className="flex items-center justify-center gap-2 px-8 py-2.5 min-w-[160px] bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-full text-xs font-bold uppercase tracking-widest text-primary transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>总结提示词</span>
            </button>
          </div>
          <div className="glass-effect bg-[#262626]/60 rounded-2xl border border-[#494847]/20 shadow-2xl p-2 flex flex-col md:flex-row items-stretch md:items-center gap-2">
            <div className="flex-grow relative">
              <textarea
                value={chat.inputValue}
                onChange={chat.handleInput}
                onKeyDown={chat.handleKeyDown}
                className="w-full bg-transparent border-none focus:ring-0 focus:outline-none text-on-surface placeholder:text-on-surface-variant px-4 py-3 resize-none max-h-32 text-sm"
                placeholder="继续追问或修改提示词..."
                rows={1}
              />
            </div>
            <div className="flex items-center justify-end px-2 md:px-0 pb-2 md:pb-0">
              <button
                onClick={chat.handleSubmit}
                disabled={!canSubmit}
                className="flex items-center gap-2 py-2.5 bg-primary text-on-primary rounded-full font-label tracking-widest uppercase text-sm font-bold active:scale-95 transition-all shadow-lg shadow-primary/20 flex items-center justify-center min-w-[3.5rem] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles className="w-5 h-5 fill-current" />
              </button>
            </div>
          </div>
          <p className="text-[10px] text-center text-white mt-1 font-label tracking-widest uppercase opacity-80 pb-4">
            此炼金术士由AI生成
          </p>
        </div>
      </div>
    </div>
  );
}
