/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Paperclip, Sparkles, Globe, Languages, Copy, Mic, Layers, Check, ArrowLeft, ExternalLink } from 'lucide-react';
import OpenAI from 'openai';

type Message = {
  id: string;
  role: 'user' | 'ai';
  content: string;
  model?: string;
  modelType?: string;
  reasoning?: string;
  prompt?: string;
  chatboxUrl?: string;
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

const systemPrompt = `你是一个名为"炼金术 AI"的顶级提示词工程师。用户会输入一个简单的想法、需求或对之前提示词的修改意见。
你需要分析这个需求是需要生成文本、图片还是视频。
然后推荐一个最适合该任务的业界顶尖AI模型。
注意：
1. 对于视频生成任务，请**优先推荐"即梦AI"**，其官方网址必须固定为：https://jimeng.jianying.com/ai-tool/home?type=agentic&workspace=0 。如果特定需求不适合，请**第二优先级推荐"可灵AI"**，其官方网址必须固定为：https://klingai.com/app/ 。**绝对不要推荐任何欧美AI平台**（如 Sora, Runway, Pika, Veo, Flow 等）。
2. 对于图片生成任务，请**优先推荐中国本土的生图大模型**（例如：即梦AI, 豆包AI, 通义万相, 文心一格等），**尽量避免推荐欧美生图AI**（如 Midjourney, DALL-E 3, Stable Diffusion 等）。
3. 对于文本生成任务，可正常推荐业界顶尖模型（如 Claude 3.5 Sonnet, GPT-4o, DeepSeek, Kimi, 豆包 等）。
4. 在为视频和图片生成任务撰写提示词时，如果涉及画质或分辨率的描述，请务必使用"4K分辨率"，绝对不要使用"8K分辨率"或更高。
5. 在撰写优化后的提示词时，必须将提示词中的分类描述标题（例如"主体描述"、"环境背景"、"镜头语言"、"风格设定"等）用【】符号强调（如【主体描述】）。并且，每种分类描述完成后，必须先换行（使用\\n），再开始下一个分类描述。此规则适用于所有类型（文本、图片、视频）的提示词。
接着，给出推荐理由。
最后，为该模型撰写一段极具专业水准、结构清晰、能最大化发挥该模型能力的优化后提示词。**生成的优化后提示词必须使用中文描述。**
此外，请提供该推荐大模型的直接可以对话/使用的Chatbox网址或官方网址（chatboxUrl）。

请以JSON格式输出，包含以下字段：
- modelName: 推荐的模型名称
- modelType: 模型类型，如 'TEXT', 'IMAGE', 'VIDEO'
- reasoning: 推荐理由
- optimizedPrompt: 优化后的提示词
- chatboxUrl: 该大模型的Chatbox/直接使用网址或官方网址`;

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
    e.target.style.height = `${Math.min(e.target.scrollHeight, 192)}px`;
    setInputValue(e.target.value);
  };

  const createOpenAIClient = () => {
    return new OpenAI({
      apiKey: import.meta.env.VITE_QWEN_API_KEY,
      baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      dangerouslyAllowBrowser: true
    });
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

    const textareas = document.querySelectorAll('textarea');
    textareas.forEach(ta => (ta.style.height = 'auto'));

    try {
      const openai = createOpenAIClient();

      const historyMessages: OpenAI.Chat.ChatCompletionMessageParam[] = messages.map(msg => ({
        role: msg.role === 'ai' ? 'assistant' as const : 'user' as const,
        content: msg.role === 'ai'
          ? JSON.stringify({
              modelName: msg.model,
              modelType: msg.modelType,
              reasoning: msg.reasoning,
              optimizedPrompt: msg.prompt,
              chatboxUrl: msg.chatboxUrl
            })
          : msg.content
      }));

      historyMessages.push({
        role: 'user' as const,
        content: userText
      });

      const response = await openai.chat.completions.create({
        model: 'qwen-plus',
        messages: [
          { role: 'system', content: systemPrompt },
          ...historyMessages
        ],
        response_format: { type: 'json_object' }
      });

      if (response.choices[0]?.message?.content) {
        const result = JSON.parse(response.choices[0].message.content);
        const aiMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'ai',
          content: '',
          model: result.modelName,
          modelType: result.modelType,
          reasoning: result.reasoning,
          prompt: result.optimizedPrompt,
          chatboxUrl: result.chatboxUrl,
        };
        setMessages(prev => [...prev, aiMsg]);
      }
    } catch (error: any) {
      console.error("AI Generation Error:", error);
      let errorMessage = `抱歉，炼金术士的熔炉暂时熄火了。错误: ${error?.message || String(error)}`;

      if (error?.status === 429) {
        errorMessage = 'API 调用额度已耗尽，请稍后再试。';
      } else if (error?.status === 401) {
        errorMessage = 'API Key 无效，请检查配置。';
      } else if (error?.status === 403) {
        errorMessage = 'API Key 权限不足，请检查配置。';
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

  const handleSummarize = async () => {
    if (messages.length === 0 || isTyping) return;

    const summaryRequestText = "请总结并精炼以上所有对话中的提示词，识别几次答案中的重复项，整合为一个最终的、最完美的提示词版本。";
    const newUserMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: summaryRequestText,
    };

    setMessages(prev => [...prev, newUserMsg]);
    setIsTyping(true);

    try {
      const openai = createOpenAIClient();

      const summarizePrompt = `你是一个名为"炼金术 AI"的顶级提示词工程师。用户要求你总结之前所有的提示词版本。
请回顾之前的对话历史，识别几次答案中的重复项，将它们精炼并整合为一个最终的、最完美的提示词版本。
注意：
1. 在为视频和图片生成任务撰写最终提示词时，如果涉及画质或分辨率的描述，请务必使用"4K分辨率"，绝对不要使用"8K分辨率"或更高。
2. 如果最终推荐的是视频模型"即梦AI"，其网址必须固定为：https://jimeng.jianying.com/ai-tool/home?type=agentic&workspace=0 ；如果是"可灵AI"，网址必须固定为：https://klingai.com/app/ 。
3. 在撰写最终的提示词时，必须将提示词中的分类描述标题（例如"主体描述"、"环境背景"、"镜头语言"、"风格设定"等）用【】符号强调（如【主体描述】）。并且，每种分类描述完成后，必须先换行（使用\\n），再开始下一个分类描述。此规则适用于所有类型（文本、图片、视频）的提示词。

请以JSON格式输出：
- modelName: 推荐的模型名称
- modelType: 模型类型，如 'TEXT', 'IMAGE', 'VIDEO'
- reasoning: 总结与精炼的理由
- optimizedPrompt: 最终整合精炼后的提示词
- chatboxUrl: 该大模型的Chatbox/直接使用网址或官方网址`;

      const historyMessages: OpenAI.Chat.ChatCompletionMessageParam[] = messages.map(msg => ({
        role: msg.role === 'ai' ? 'assistant' as const : 'user' as const,
        content: msg.role === 'ai'
          ? JSON.stringify({
              modelName: msg.model,
              modelType: msg.modelType,
              reasoning: msg.reasoning,
              optimizedPrompt: msg.prompt,
              chatboxUrl: msg.chatboxUrl
            })
          : msg.content
      }));

      historyMessages.push({
        role: 'user' as const,
        content: summaryRequestText
      });

      const response = await openai.chat.completions.create({
        model: 'qwen-plus',
        messages: [
          { role: 'system', content: summarizePrompt },
          ...historyMessages
        ],
        response_format: { type: 'json_object' }
      });

      if (response.choices[0]?.message?.content) {
        const result = JSON.parse(response.choices[0].message.content);
        const aiMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'ai',
          content: '',
          model: result.modelName,
          modelType: result.modelType,
          reasoning: result.reasoning,
          prompt: result.optimizedPrompt,
          chatboxUrl: result.chatboxUrl,
        };
        setMessages(prev => [...prev, aiMsg]);
      }
    } catch (error: any) {
      console.error("AI Generation Error:", error);
      let errorMessage = `抱歉，炼金术士的熔炉暂时熄火了。错误: ${error?.message || String(error)}`;

      if (error?.status === 429) {
        errorMessage = 'API 调用额度已耗尽，请稍后再试。';
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
                <div className="flex items-center justify-end px-4 pb-3">
                  <button
                    onClick={handleSubmit}
                    disabled={!inputValue.trim()}
                    className="flex items-center justify-center gap-2 px-6 py-2.5 bg-primary text-on-primary rounded-full font-label tracking-widest uppercase text-sm font-bold active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="flex items-center gap-2">
                      炼制
                      <Sparkles className="w-4 h-4 fill-current" />
                    </span>
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
                          </div>

                          <div className="space-y-4">
                            <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/5">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-primary block mb-1">推荐理由</span>
                              <p className="text-sm text-on-surface-variant leading-relaxed">{msg.reasoning}</p>
                            </div>

                            {msg.chatboxUrl && (
                              <div className="flex flex-wrap gap-3">
                                <a
                                  href={msg.chatboxUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-lg text-xs text-primary transition-colors"
                                >
                                  <Sparkles className="w-3.5 h-3.5" />
                                  <span>打开 Chatbox 或官网</span>
                                  <ExternalLink className="w-3 h-3 opacity-70" />
                                </a>
                              </div>
                            )}

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
        <div className="max-w-4xl mx-auto flex flex-col gap-3">
          <div className="flex justify-center gap-4">
            <button
              onClick={() => setMessages([])}
              className="flex items-center justify-center gap-2 px-8 py-2.5 min-w-[160px] bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-full text-xs font-bold uppercase tracking-widest text-white transition-colors shadow-lg"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>开启新对话</span>
            </button>
            <button
              onClick={handleSummarize}
              disabled={isTyping || messages.length === 0}
              className="flex items-center justify-center gap-2 px-8 py-2.5 min-w-[160px] bg-primary hover:bg-primary/90 border border-primary rounded-full text-xs font-bold uppercase tracking-widest text-on-primary transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>总结提示词</span>
            </button>
          </div>
          <div className="glass-effect bg-[#262626]/60 rounded-2xl border border-[#494847]/20 shadow-2xl p-2 flex flex-col md:flex-row items-stretch md:items-center gap-2">
            <div className="flex-grow relative">
              <textarea
                value={inputValue}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                className="w-full bg-transparent border-none focus:ring-0 focus:outline-none text-on-surface placeholder:text-on-surface-variant px-4 py-3 resize-none max-h-32 text-sm"
                placeholder="继续追问或修改提示词..."
                rows={1}
              />
            </div>
            <div className="flex items-center justify-end px-2 md:px-0 pb-2 md:pb-0">
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