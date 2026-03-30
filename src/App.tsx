/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Paperclip, Sparkles, Globe, Languages, Copy, Mic, Layers, Check, ArrowLeft } from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';

type Message = {
  id: string;
  role: 'user' | 'ai';
  content: string;
  model?: string;
  modelType?: string;
  reasoning?: string;
  prompt?: string;
};

const FlaskIcon = () => (
  <svg className="w-full h-full drop-shadow-[0_0_12px_rgba(0,255,65,0.5)]" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M7.5 11.5L4.5 17.5C4.2 18.1 4.5 19 5.2 19H18.8C19.5 19 19.8 18.1 19.5 17.5L16.5 11.5" fill="#00FF41" fillOpacity="0.1"></path>
    <path d="M7.5 11.5L4.5 17.5C4.2 18.1 4.5 19 5.2 19H18.8C19.5 19 19.8 18.1 19.5 17.5L16.5 11.5H7.5Z" fill="url(#liquid-gradient)" fillOpacity="0.6"></path>
    <path d="M9.5 3H14.5M10.5 3V8.5L5.2 18.2C4.6 19.3 5.4 20.5 6.6 20.5H17.4C18.6 20.5 19.4 19.3 18.8 18.2L13.5 8.5V3H10.5Z" stroke="#00FF41" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8"></path>
    <path d="M10.5 6H13.5" stroke="#00FF41" strokeOpacity="0.5" strokeWidth="1"></path>
    <circle className="animate-bounce" cx="10" cy="15.5" fill="#00FF41" r="0.8" style={{ animationDuration: '3s' }}></circle>
    <circle className="animate-bounce" cx="13" cy="17.5" fill="#00FF41" r="0.6" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }}></circle>
    <circle className="animate-pulse" cx="11.5" cy="13" fill="#00FF41" r="0.4"></circle>
    <defs>
      <linearGradient gradientUnits="userSpaceOnUse" id="liquid-gradient" x1="12" x2="12" y1="11.5" y2="19">
        <stop stopColor="#00FF41" stopOpacity="0.4"></stop>
        <stop offset="1" stopColor="#000000" stopOpacity="0.1"></stop>
      </linearGradient>
    </defs>
  </svg>
);

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 192)}px`; // max-h-48
    setInputValue(e.target.value);
  };

  const handleSubmit = async () => {
    if (!inputValue.trim()) return;

    const userText = inputValue.trim();
    const newUserMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userText,
    };

    setMessages(prev => [...prev, newUserMsg]);
    setInputValue('');
    setIsTyping(true);

    // Reset textarea height
    const textareas = document.querySelectorAll('textarea');
    textareas.forEach(ta => (ta.style.height = 'auto'));

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: `你是一个名为"炼金术 AI"的顶级提示词工程师。用户会输入一个简单的想法或需求。
你需要分析这个需求是需要生成文本、图片还是视频。
然后推荐一个最适合该任务的业界顶尖AI模型。
注意：
1. 对于视频生成任务，请**务必只推荐中国本土的视频大模型**（例如：seedance, 即梦AI, 可灵Kling, 智谱清影等），**绝对不要推荐任何欧美AI平台**（如 Sora, Runway, Pika, Veo, Flow 等）。
2. 对于图片生成任务，请**优先推荐中国本土的生图大模型**（例如：即梦AI, 豆包AI, 通义万相, 文心一格等），**尽量避免推荐欧美生图AI**（如 Midjourney, DALL-E 3, Stable Diffusion 等）。
3. 对于文本生成任务，可正常推荐业界顶尖模型（如 Claude 3.5 Sonnet, GPT-4o, DeepSeek, Kimi, 豆包 等）。
接着，给出推荐理由。
最后，为该模型撰写一段极具专业水准、结构清晰、能最大化发挥该模型能力的优化后提示词。**生成的优化后提示词必须使用中文描述。**

用户需求：${userText}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              modelName: { type: Type.STRING, description: "推荐的模型名称" },
              modelType: { type: Type.STRING, description: "模型类型，如 'TEXT', 'IMAGE', 'VIDEO'" },
              reasoning: { type: Type.STRING, description: "推荐理由" },
              optimizedPrompt: { type: Type.STRING, description: "优化后的提示词" }
            },
            required: ["modelName", "modelType", "reasoning", "optimizedPrompt"]
          }
        }
      });

      if (response.text) {
        const result = JSON.parse(response.text);
        const aiMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'ai',
          content: '',
          model: result.modelName,
          modelType: result.modelType,
          reasoning: result.reasoning,
          prompt: result.optimizedPrompt,
        };
        setMessages(prev => [...prev, aiMsg]);
      }
    } catch (error: any) {
      console.error("AI Generation Error:", error);
      let errorMessage = '抱歉，炼金术士的熔炉暂时熄火了，请稍后再试。';
      
      const errorString = error?.message || String(error);
      if (error?.status === 429 || errorString.includes('429') || errorString.includes('RESOURCE_EXHAUSTED') || errorString.includes('quota')) {
        errorMessage = '您的 API 调用额度已耗尽 (429 RESOURCE_EXHAUSTED)。请检查您的计费详情或稍后再试。';
      }

      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: errorMessage,
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (messages.length === 0) {
    return (
      <div className="bg-surface text-on-surface font-body selection:bg-primary/30 flex flex-col items-center min-h-screen">
        <main className="flex flex-col justify-center px-6 w-full max-w-7xl mx-auto h-[calc(100vh-2.5rem)] items-center">
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative mb-8 flex flex-col w-full max-w-4xl items-center"
          >
            <div className="absolute -left-20 -top-20 w-96 h-96 bg-primary/5 blur-[120px] rounded-full"></div>
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
                  value={inputValue}
                  onChange={handleInput}
                  onKeyDown={handleKeyDown}
                  className="w-full bg-transparent border-none focus:ring-0 focus:outline-none text-on-surface placeholder:text-on-surface-variant/50 p-4 min-h-[56px] max-h-48 resize-none scroll-py-4 font-body"
                  placeholder="输入你的灵感，开始炼制..."
                  rows={1}
                />
                <div className="flex items-center justify-between px-4 pb-3">
                  <div className="flex items-center gap-2">
                    <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors text-on-surface-variant">
                      <Paperclip className="w-5 h-5" />
                    </button>
                  </div>
                  <button 
                    onClick={handleSubmit}
                    disabled={!inputValue.trim()}
                    className="flex items-center gap-2 px-6 py-2.5 bg-primary text-on-primary rounded-full font-label tracking-widest uppercase text-sm font-bold active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    合成
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

  return (
    <div className="bg-background text-on-surface font-body selection:bg-primary selection:text-on-primary min-h-screen flex flex-col">
      <header className="fixed top-0 left-0 w-full h-14 bg-surface/80 glass-effect border-b border-outline-variant/10 z-50 flex items-center px-4">
        <button 
          onClick={() => setMessages([])}
          className="absolute left-4 p-2 text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-xs font-bold uppercase tracking-widest hidden md:inline">返回</span>
        </button>
        <h1 className="text-[#00FF41] font-headline font-extrabold tracking-widest text-sm uppercase mx-auto">炼金术士AI工作坊</h1>
      </header>

      <main className="flex-1 pt-24 pb-40 px-4 md:px-8 max-w-5xl mx-auto w-full">
        <div className="space-y-12">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start items-start gap-4'}`}
              >
                {msg.role === 'user' ? (
                  <div className="max-w-[85%] md:max-w-[70%] bg-surface-container-high p-5 rounded-2xl rounded-tr-none shadow-lg border-l-2 border-primary/20">
                    <p className="text-on-surface leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  </div>
                ) : (
                  <>
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/30 mt-1">
                      <Sparkles className="w-5 h-5 text-primary fill-current" />
                    </div>
                    <div className="flex-grow space-y-6 max-w-[85%] md:max-w-[80%]">
                      {msg.model ? (
                        <div className="bg-surface-container border border-outline-variant/15 rounded-2xl p-6 relative overflow-hidden ai-pulse-bg">
                          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">推荐模型</label>
                              <div className="flex items-center gap-2">
                                <h3 className="text-xl font-headline font-bold text-primary">{msg.model}</h3>
                                <span className="bg-tertiary/10 text-tertiary text-[10px] px-2 py-0.5 rounded-full border border-tertiary/20">{msg.modelType || 'PRO'}</span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <div className="flex items-center gap-1 bg-surface-container-highest px-3 py-1.5 rounded-full text-xs text-on-surface-variant border border-outline-variant/10">
                                <Globe className="w-3.5 h-3.5" />
                                <span>EN</span>
                              </div>
                              <div className="flex items-center gap-1 bg-surface-container-highest px-3 py-1.5 rounded-full text-xs text-on-surface-variant border border-outline-variant/10">
                                <Languages className="w-3.5 h-3.5" />
                                <span>CN</span>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/5">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-primary block mb-1">推荐理由</span>
                              <p className="text-sm text-on-surface-variant leading-relaxed">{msg.reasoning}</p>
                            </div>

                            <div className="group relative rounded-xl bg-surface-container-highest border border-primary/10 overflow-hidden">
                              <div className="flex items-center justify-between px-4 py-3 bg-surface-container-highest border-b border-outline-variant/10">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">优化后的提示词</span>
                                <CopyButton text={msg.prompt || ''} />
                              </div>
                              <div className="p-4 font-mono text-sm text-primary-dim/90 leading-relaxed bg-[#000000]/20 whitespace-pre-wrap">
                                {msg.prompt}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-surface-container border border-error/20 rounded-2xl p-6 relative overflow-hidden">
                          <p className="text-error leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </motion.div>
            ))}
            
            {isTyping && (
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
        <div className="max-w-4xl mx-auto">
          <div className="glass-effect bg-[#262626]/60 rounded-2xl border border-[#494847]/20 shadow-2xl p-2 flex flex-col md:flex-row items-stretch md:items-center gap-2">
            <div className="flex-grow relative">
              <textarea
                value={inputValue}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                className="w-full bg-transparent border-none focus:ring-0 focus:outline-none text-on-surface placeholder:text-on-surface-variant px-4 py-3 resize-none max-h-32 text-sm"
                placeholder="让炼金术 AI 为您合成提示词或建议..."
                rows={1}
              />
            </div>
            <div className="flex items-center justify-between md:justify-end gap-3 px-2 md:px-0 pb-2 md:pb-0">
              <div className="flex items-center gap-1">
                <button className="p-2 text-on-surface-variant hover:text-primary transition-colors">
                  <Paperclip className="w-5 h-5" />
                </button>
                <button className="p-2 text-on-surface-variant hover:text-primary transition-colors">
                  <Mic className="w-5 h-5" />
                </button>
                <div className="w-px h-6 bg-outline-variant/20 mx-1"></div>
                <button className="p-2 text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1">
                  <Layers className="w-5 h-5" />
                  <span className="text-[10px] font-bold uppercase tracking-tighter hidden md:inline">自动</span>
                </button>
              </div>
              <button 
                onClick={handleSubmit}
                disabled={!inputValue.trim()}
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

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button 
      onClick={handleCopy}
      className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-primary hover:opacity-80 transition-opacity"
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      <span>{copied ? '已复制' : '复制提示词'}</span>
    </button>
  );
}
