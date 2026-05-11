/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Paperclip, Sparkles, Globe, Languages, Copy, Mic, Layers, Check, ArrowLeft, ExternalLink, Download, Film, Image as ImageIcon } from 'lucide-react';
import OpenAI from 'openai';
import html2canvas from 'html2canvas';

// 支持的图片格式
const IMAGE_FORMATS = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];
// 支持的视频格式
const VIDEO_FORMATS = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-ms-wmv', 'video/x-flv', 'video/x-matroska', 'video/webm', 'video/mov', 'video/avi', 'video/mkv'];
// 最大视频时长（秒）
const MAX_VIDEO_DURATION = 30;

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
2. 对于图片生成任务，请**优先推荐"GPT-Image2"**，其官方网址必须固定为：https://chatgpt.com/ 。如果特定需求不适合，请**第二优先级推荐"即梦AI"**，其官方网址必须固定为：https://jimeng.jianying.com/ai-tool/home?type=agentic&workspace=0 。**第三优先级推荐"Nano Banana 2"**，其官方网址必须固定为：https://www.nanobanana.com/ 。
3. 对于文本生成任务（尤其是优化描述问题的提示词），请**优先推荐"GPT 5.5"**，其官方网址必须固定为：https://chatgpt.com/ 。如果特定需求不适合，请**第二优先级推荐"Gemini 3.1 Pro Preview"或"GPT 5.4"**，"Gemini 3.1 Pro Preview"网址必须固定为：https://gemini.google.com/app ，"GPT 5.4"网址必须固定为：https://chatgpt.com/ 。
4. 在为视频和图片生成任务撰写提示词时，如果涉及画质或分辨率的描述，请务必使用"4K分辨率"，绝对不要使用"8K分辨率"或更高。
5. 在撰写优化后的提示词时，必须将提示词中的分类描述标题（例如"主体描述"、"环境背景"、"镜头语言"、"风格设定"等）用【】符号强调（如【主体描述】）。并且，每种分类描述完成后，必须先换行（使用\\n），再开始下一个分类描述。此规则适用于所有类型（文本、图片、视频）的提示词。
6. 推荐模型及撰写提示词时，所参考的数据和信息均须基于2026年1-3月或更新的数据，不得引用2024或2025年的滞后信息。在提示词中如需提及时间范围，请使用"截止目前为止"，绝对不要出现"2026年"或任何具体年份。
接着，给出推荐理由（言简意赅，2-3句话点明为何选该模型即可，不要长篇介绍模型优势）。
最后，为该模型撰写一段极具专业水准、结构清晰、能最大化发挥该模型能力的优化后提示词。**生成的优化后提示词必须使用中文描述。**
此外，请提供该推荐大模型的直接可以对话/使用的Chatbox网址或官方网址（chatboxUrl）。

请以JSON格式输出，包含以下字段：
- modelName: 推荐的模型名称
- modelType: 模型类型，如 'TEXT', 'IMAGE', 'VIDEO'
- reasoning: 推荐理由
- optimizedPrompt: 优化后的提示词
- chatboxUrl: 该大模型的Chatbox/直接使用网址或官方网址`;

// 辅助函数：获取当前AI回复对应的用户消息内容
function getUserContentForMessage(messages: Message[], aiMsgId: string): string {
  const aiIndex = messages.findIndex(m => m.id === aiMsgId);
  if (aiIndex <= 0) return '';
  // 找到当前AI回复之前的用户消息
  for (let i = aiIndex - 1; i >= 0; i--) {
    if (messages[i].role === 'user') {
      return messages[i].content;
    }
  }
  return '';
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [promptLangs, setPromptLangs] = useState<Record<string, 'zh' | 'en'>>({}); // 每条消息的语言偏好
  const [translatedPrompts, setTranslatedPrompts] = useState<Record<string, string>>({}); // 翻译缓存
  const [translating, setTranslating] = useState<Record<string, boolean>>({}); // 翻译状态
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const textareaResizeRef = useRef<number | null>(null);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    // 延迟 textarea 自适应高度到下一帧，避免每次按键触发 3 次 reflow
    if (textareaResizeRef.current) {
      cancelAnimationFrame(textareaResizeRef.current);
    }
    textareaResizeRef.current = requestAnimationFrame(() => {
      const textarea = e.target;
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 192)}px`;
      textareaResizeRef.current = null;
    });
  };

  const createOpenAIClient = () => {
    return new OpenAI({
      apiKey: import.meta.env.VITE_QWEN_API_KEY,
      baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      dangerouslyAllowBrowser: true
    });
  };

  const translatePrompt = async (msgId: string, prompt: string) => {
    if (translatedPrompts[msgId]) return; // 已有缓存
    setTranslating(prev => ({ ...prev, [msgId]: true }));
    try {
      const openai = createOpenAIClient();
      const response = await openai.chat.completions.create({
        model: 'qwen-plus',
        messages: [
          {
            role: 'system',
            content: '你是一个专业的提示词翻译师。将用户给出的中文提示词翻译为英文，保持原有结构（【】标记的标题也翻译为英文）、含义和细节完全一致，格式不变。只输出翻译后的英文提示词，不要任何解释。'
          },
          { role: 'user', content: prompt }
        ]
      });
      const translated = response.choices[0]?.message?.content || prompt;
      setTranslatedPrompts(prev => ({ ...prev, [msgId]: translated }));
    } catch (error) {
      console.error('Translation error:', error);
      setTranslatedPrompts(prev => ({ ...prev, [msgId]: prompt })); // 翻译失败则回退原文
    } finally {
      setTranslating(prev => ({ ...prev, [msgId]: false }));
    }
  };

  const togglePromptLang = async (msgId: string) => {
    const current = promptLangs[msgId] || 'zh';
    const next = current === 'zh' ? 'en' : 'zh';
    if (next === 'en') {
      const msg = messages.find(m => m.id === msgId);
      if (msg?.prompt) {
        await translatePrompt(msgId, msg.prompt);
      }
    }
    setPromptLangs(prev => ({ ...prev, [msgId]: next }));
  };

  const getDisplayPrompt = (msg: Message): string => {
    if (promptLangs[msg.id] === 'en' && translatedPrompts[msg.id]) {
      return translatedPrompts[msg.id];
    }
    return msg.prompt || '';
  };

  const fileToBase64 = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
    });
  };

  const analyzeImage = async (imageBase64: string, index?: number): Promise<string> => {
    const openai = createOpenAIClient();

    const visionPrompt = `请详细分析这张图片${index ? `（第${index}张）` : ''}，识别并描述以下内容：
1. 图片中的主要元素和整体构图
2. 图片中的物体、物品及其特征
3. 图片中的人物（如果有）：外貌特征、动作、表情、服饰等
4. 图片中的文字内容（如果有）：完整提取所有可见文字
5. 图片的色彩、光影、氛围等视觉特征
6. 图片的风格类型（如写实、插画、摄影、动漫等）

请用中文详细描述，格式清晰，每个部分用【】标记标题。`;

    const response = await openai.chat.completions.create({
      model: 'qwen-vl-max',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: visionPrompt },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`
              }
            }
          ]
        }
      ]
    });

    return response.choices[0]?.message?.content || '';
  };

  const analyzeMultipleImages = async (files: File[]): Promise<string[]> => {
    const results: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const base64 = await fileToBase64(files[i]);
      const analysis = await analyzeImage(base64, i + 1);
      results.push(`【图片${i + 1}分析】\n${analysis}`);
    }
    return results;
  };

  // 获取视频时长
  const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        resolve(video.duration);
      };
      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        reject(new Error('无法读取视频信息'));
      };
      video.src = URL.createObjectURL(file);
    });
  };

  // 从视频中提取帧
  const extractVideoFrames = async (file: File, numFrames: number = 5): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      
      video.onloadedmetadata = async () => {
        const duration = video.duration;
        const frames: string[] = [];
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('无法创建Canvas上下文'));
          return;
        }

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // 根据视频时长决定提取帧数，最多提取 numFrames 帧
        const actualFrames = Math.min(numFrames, Math.ceil(duration / 5));
        const interval = duration / (actualFrames + 1);

        for (let i = 1; i <= actualFrames; i++) {
          const time = i * interval;
          await new Promise<void>((res) => {
            video.currentTime = time;
            video.onseeked = () => {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const frameData = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
              frames.push(frameData);
              res();
            };
          });
        }

        URL.revokeObjectURL(video.src);
        resolve(frames);
      };

      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        reject(new Error('无法加载视频'));
      };

      video.src = URL.createObjectURL(file);
    });
  };

  // 分析单个视频帧
  const analyzeVideoFrame = async (frameBase64: string, frameIndex: number, totalFrames: number): Promise<string> => {
    const openai = createOpenAIClient();

    const visionPrompt = `请分析这个视频帧（第${frameIndex}/${totalFrames}帧），识别并描述以下内容：
1. 画面中的主要元素和整体构图
2. 画面中的物体、物品及其特征
3. 画面中的人物（如果有）：外貌特征、动作、表情、服饰等
4. 画面中的文字内容（如果有）：完整提取所有可见文字
5. 画面的色彩、光影、氛围等视觉特征
6. 画面的风格类型（如写实、插画、摄影、动漫等）

请用中文简洁描述，重点突出关键元素。`;

    const response = await openai.chat.completions.create({
      model: 'qwen-vl-max',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: visionPrompt },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${frameBase64}`
              }
            }
          ]
        }
      ]
    });

    return response.choices[0]?.message?.content || '';
  };

  // 分析视频内容
  const analyzeVideo = async (file: File): Promise<string> => {
    // 首先检查视频时长
    const duration = await getVideoDuration(file);
    if (duration > MAX_VIDEO_DURATION) {
      throw new Error(`视频时长超过${MAX_VIDEO_DURATION}秒限制，当前时长: ${Math.round(duration)}秒`);
    }

    // 提取视频帧
    const frames = await extractVideoFrames(file);
    
    // 分析每一帧
    const frameAnalyses: string[] = [];
    for (let i = 0; i < frames.length; i++) {
      const analysis = await analyzeVideoFrame(frames[i], i + 1, frames.length);
      frameAnalyses.push(`【第${i + 1}帧】${analysis}`);
    }

    // 综合分析所有帧，生成视频整体描述
    const openai = createOpenAIClient();
    const summaryResponse = await openai.chat.completions.create({
      model: 'qwen-plus',
      messages: [
        {
          role: 'system',
          content: `你是一个专业的视频内容分析师。你需要根据视频各帧的分析结果，综合生成一个完整的视频内容描述。
描述需要包含：
1. 视频的主题和整体内容概述
2. 场景和环境描述
3. 主要角色/物体及其动作变化
4. 视觉风格和氛围
5. 关键的视觉元素和细节

请用中文描述，格式清晰，每个部分用【】标记标题。`
        },
        {
          role: 'user',
          content: `以下是视频各帧的分析结果，请综合生成视频整体描述：\n\n${frameAnalyses.join('\n\n')}`
        }
      ]
    });

    return summaryResponse.choices[0]?.message?.content || frameAnalyses.join('\n\n');
  };

  const handleSubmit = async () => {
    if (!inputValue.trim() && attachedFiles.length === 0) return;

    const userText = inputValue.trim();
    const currentFiles = [...attachedFiles];
    const imageFiles = currentFiles.filter(f => IMAGE_FORMATS.includes(f.type));
    const videoFiles = currentFiles.filter(f => VIDEO_FORMATS.includes(f.type) || f.type.startsWith('video/'));
    const hasImages = imageFiles.length > 0;
    const hasVideos = videoFiles.length > 0;

    let displayContent = userText;
    if (hasImages) {
      const fileNames = imageFiles.map(f => f.name).join(', ');
      displayContent = userText 
        ? `${userText}\n[已上传图片: ${fileNames}]` 
        : `[已上传图片: ${fileNames}]`;
    }
    if (hasVideos) {
      const fileNames = videoFiles.map(f => f.name).join(', ');
      displayContent = displayContent
        ? `${displayContent}\n[已上传视频: ${fileNames}]`
        : `[已上传视频: ${fileNames}]`;
    }

    const newUserMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: displayContent,
    };

    setMessages(prev => [...prev, newUserMsg]);
    setInputValue('');
    setAttachedFiles([]);
    setIsTyping(true);

    const textareas = document.querySelectorAll('textarea');
    textareas.forEach(ta => (ta.style.height = 'auto'));

    let enhancedUserText = userText;
    let mediaAnalysisResults: string[] = [];

    // 分析图片
    if (hasImages) {
      try {
        const imageResults = await analyzeMultipleImages(imageFiles);
        mediaAnalysisResults.push(...imageResults);
      } catch (error) {
        console.error('Image analysis error:', error);
      }
    }

    // 分析视频
    if (hasVideos) {
      for (let i = 0; i < videoFiles.length; i++) {
        try {
          const videoAnalysis = await analyzeVideo(videoFiles[i]);
          mediaAnalysisResults.push(`【视频${i + 1}分析】\n${videoAnalysis}`);
        } catch (error: any) {
          console.error('Video analysis error:', error);
          mediaAnalysisResults.push(`【视频${i + 1}分析失败】\n${error?.message || '无法分析视频内容'}`);
        }
      }
    }

    if (mediaAnalysisResults.length > 0) {
      const combinedAnalysis = mediaAnalysisResults.join('\n\n');
      const mediaType = hasVideos ? '视频' : '图片';
      enhancedUserText = userText
        ? `${userText}\n\n${combinedAnalysis}\n\n请根据以上所有${mediaType}分析内容，综合生成优化后的提示词。`
        : `请根据以下${mediaType}分析结果生成一个专业的提示词。\n\n${combinedAnalysis}`;
    }

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
        content: enhancedUserText
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
          reasoning: mediaAnalysisResults.length > 0 ? `${result.reasoning}\n\n【已融合${mediaAnalysisResults.length}个媒体文件分析内容】` : result.reasoning,
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
2. 如果最终推荐的是图片模型"GPT-Image2"，其网址必须固定为：https://chatgpt.com/ ；如果是"即梦AI"，网址必须固定为：https://jimeng.jianying.com/ai-tool/home?type=agentic&workspace=0 ；如果是"Nano Banana 2"，网址必须固定为：https://www.nanobanana.com/ 。如果最终推荐的是视频模型"即梦AI"，其网址必须固定为：https://jimeng.jianying.com/ai-tool/home?type=agentic&workspace=0 ；如果是"可灵AI"，网址必须固定为：https://klingai.com/app/ 。如果最终推荐的是文本模型"GPT 5.5"或"GPT 5.4"，网址必须固定为：https://chatgpt.com/ ；如果是"Gemini 3.1 Pro Preview"，网址必须固定为：https://gemini.google.com/app 。
3. 在撰写最终的提示词时，必须将提示词中的分类描述标题（例如"主体描述"、"环境背景"、"镜头语言"、"风格设定"等）用【】符号强调（如【主体描述】）。并且，每种分类描述完成后，必须先换行（使用\\n），再开始下一个分类描述。此规则适用于所有类型（文本、图片、视频）的提示词。
4. 推荐模型及撰写提示词时，所参考的数据和信息均须基于2026年1-3月或更新的数据，不得引用2024或2025年的滞后信息。在提示词中如需提及时间范围，请使用"截止目前为止"，绝对不要出现"2026年"或任何具体年份。

请以JSON格式输出：
- modelName: 推荐的模型名称
- modelType: 模型类型，如 'TEXT', 'IMAGE', 'VIDEO'
- reasoning: 总结与精炼的理由（言简意赅，2-3句话即可，不要长篇介绍模型优势）
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const allFiles: File[] = Array.from(files);
      // 过滤支持的文件类型
      const validFiles: File[] = allFiles.filter(f => 
        IMAGE_FORMATS.includes(f.type) || 
        VIDEO_FORMATS.includes(f.type) || 
        f.type.startsWith('image/') || 
        f.type.startsWith('video/')
      );
      
      // 检查视频时长
      const validFilesWithDuration: File[] = [];
      for (const file of validFiles) {
        if (VIDEO_FORMATS.includes(file.type) || file.type.startsWith('video/')) {
          try {
            const duration = await getVideoDuration(file);
            if (duration <= MAX_VIDEO_DURATION) {
              validFilesWithDuration.push(file);
            } else {
              // 提示用户视频时长超限
              alert(`视频 "${file.name}" 时长超过${MAX_VIDEO_DURATION}秒限制（当前${Math.round(duration)}秒），已自动跳过`);
            }
          } catch {
            // 无法读取时长，仍然允许上传
            validFilesWithDuration.push(file);
          }
        } else {
          validFilesWithDuration.push(file);
        }
      }
      
      // 限制最多3个文件
      const totalFiles = [...attachedFiles, ...validFilesWithDuration].slice(0, 3);
      setAttachedFiles(totalFiles);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
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
                  value={inputValue}
                  onChange={handleInput}
                  onKeyDown={handleKeyDown}
                  className="w-full bg-transparent border-none focus:ring-0 focus:outline-none text-on-surface placeholder:text-on-surface-variant/50 p-4 min-h-[56px] max-h-48 resize-none scroll-py-4 font-body"
                  placeholder="输入你的灵感，开始炼制..."
                  rows={1}
                />
                {attachedFiles.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 px-4 pb-2">
                    {attachedFiles.map((file, index) => {
                      const isVideo = VIDEO_FORMATS.includes(file.type) || file.type.startsWith('video/');
                      return (
                        <div key={index} className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg text-xs ${isVideo ? 'bg-tertiary/10 border-tertiary/20 text-tertiary' : 'bg-primary/10 border-primary/20 text-primary'}`}>
                          {isVideo ? <Film className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}
                          <span className="truncate max-w-[150px]">{file.name}</span>
                          <button
                            onClick={() => handleRemoveFile(index)}
                            className="ml-1 hover:opacity-70 transition-opacity"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                    {attachedFiles.length < 3 && (
                      <span className="text-xs text-on-surface-variant">还可上传 {3 - attachedFiles.length} 个文件</span>
                    )}
                  </div>
                )}
                <div className="flex items-center justify-between px-4 pb-3">
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileSelect}
                      className="hidden"
                      accept="image/*,video/*,.mp4,.mov,.avi,.wmv,.flv,.mkv,.webm"
                      multiple
                    />
                    <button
                      onClick={handleAttachClick}
                      disabled={attachedFiles.length >= 3}
                      className="flex items-center justify-center w-10 h-10 bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/20 rounded-full text-on-surface-variant hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title={attachedFiles.length >= 3 ? "已达最大文件数量" : "上传图片或视频（最多3个，视频限30秒）"}
                    >
                      <Paperclip className="w-5 h-5" />
                    </button>
                    {attachedFiles.length > 0 && (
                      <span className="text-xs text-on-surface-variant">{attachedFiles.length}/3</span>
                    )}
                  </div>
                  <button
                    onClick={handleSubmit}
                    disabled={!inputValue.trim() && attachedFiles.length === 0}
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

                            <div className="flex flex-wrap gap-3">
                              {msg.chatboxUrl && (
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
                              )}
                              <SaveImageButton
                                userContent={getUserContentForMessage(messages, msg.id)}
                                model={msg.model || ''}
                                modelType={msg.modelType}
                                reasoning={msg.reasoning}
                                prompt={getDisplayPrompt(msg)}
                                chatboxUrl={msg.chatboxUrl}
                              />
                            </div>

                            <div className="group relative rounded-xl bg-surface-container-highest border border-primary/10 overflow-hidden">
                              <div className="flex items-center justify-between px-4 py-3 bg-surface-container-highest border-b border-outline-variant/10">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">优化后的提示词</span>
                                <div className="flex items-center gap-3">
                                  <button
                                    onClick={() => togglePromptLang(msg.id)}
                                    disabled={translating[msg.id]}
                                    className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-tertiary hover:text-on-primary transition-colors disabled:opacity-50"
                                  >
                                    <Languages className="w-3.5 h-3.5" />
                                    <span>{promptLangs[msg.id] === 'en' ? '中文' : 'EN'}</span>
                                    {translating[msg.id] && <span className="animate-pulse">...</span>}
                                  </button>
                                  <CopyButton text={getDisplayPrompt(msg)} />
                                </div>
                              </div>
                              <div className="p-4 font-mono text-sm text-primary-dim/90 leading-relaxed bg-[#000000]/20 whitespace-pre-wrap">
                                {getDisplayPrompt(msg)}
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
              className="flex items-center justify-center gap-2 px-8 py-2.5 min-w-[160px] bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/20 rounded-full text-xs font-bold uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>开启新对话</span>
            </button>
            <button
              onClick={handleSummarize}
              disabled={isTyping || messages.length === 0}
              className="flex items-center justify-center gap-2 px-8 py-2.5 min-w-[160px] bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-full text-xs font-bold uppercase tracking-widest text-primary transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
                disabled={!inputValue.trim() && attachedFiles.length === 0}
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

function SaveImageButton({ userContent, model, modelType, reasoning, prompt, chatboxUrl }: {
  userContent: string;
  model: string;
  modelType?: string;
  reasoning?: string;
  prompt?: string;
  chatboxUrl?: string;
}) {
  const [saving, setSaving] = useState(false);

  const handleSaveImage = async () => {
    setSaving(true);

    // 创建临时容器用于渲染词图
    const container = document.createElement('div');
    container.style.cssText = `
      position: fixed;
      left: -9999px;
      top: 0;
      width: 800px;
      padding: 40px;
      background: linear-gradient(135deg, #0e0e0e 0%, #1a1919 100%);
      font-family: 'Inter', sans-serif;
    `;

    container.innerHTML = `
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="display: inline-flex; align-items: center; gap: 12px;">
          <span style="font-size: 28px; font-weight: 800; color: #ffffff; font-family: 'Manrope', sans-serif;">炼金术</span>
          <span style="font-size: 28px; font-weight: 800; color: #6bfe9c; font-family: 'Manrope', sans-serif;">AI</span>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" style="filter: drop-shadow(0 0 12px rgba(0,255,65,0.5));">
            <path d="M9.5 3H14.5M10.5 3V8.5L5.2 18.2C4.6 19.3 5.4 20.5 6.6 20.5H17.4C18.6 20.5 19.4 19.3 18.8 18.2L13.5 8.5V3H10.5Z" stroke="#00FF41" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"/>
            <path d="M7.5 11.5L4.5 17.5C4.2 18.1 4.5 19 5.2 19H18.8C19.5 19 19.8 18.1 19.5 17.5L16.5 11.5H7.5Z" fill="#00FF41" fill-opacity="0.3"/>
          </svg>
        </div>
        <div style="height: 4px; width: 120px; background: linear-gradient(90deg, transparent, #6bfe9c, transparent); margin: 16px auto 0;"></div>
      </div>

      <div style="background: #201f1f; border-radius: 16px; padding: 24px; margin-bottom: 24px; border-left: 3px solid #6bfe9c;">
        <div style="font-size: 11px; font-weight: 700; color: #adaaaa; letter-spacing: 1.5px; margin-bottom: 12px; text-transform: uppercase;">用户需求</div>
        <div style="color: #ffffff; line-height: 1.6; white-space: pre-wrap;">${userContent.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
      </div>

      <div style="background: #1a1919; border-radius: 16px; padding: 28px; border: 1px solid #494847;">
        <div style="margin-bottom: 20px;">
          <div style="font-size: 11px; font-weight: 700; color: #adaaaa; letter-spacing: 1.5px; margin-bottom: 8px; text-transform: uppercase;">推荐模型</div>
          <div style="display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 22px; font-weight: 700; color: #6bfe9c; font-family: 'Manrope', sans-serif;">${model}</span>
            <span style="background: rgba(138,242,255,0.15); color: #8af2ff; font-size: 11px; padding: 4px 10px; border-radius: 20px; border: 1px solid rgba(138,242,255,0.25);">${modelType || 'PRO'}</span>
          </div>
        </div>

        <div style="background: #131313; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
          <div style="font-size: 11px; font-weight: 700; color: #6bfe9c; letter-spacing: 1.5px; margin-bottom: 10px; text-transform: uppercase;">推荐理由</div>
          <div style="color: #adaaaa; line-height: 1.6; font-size: 14px;">${(reasoning || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
        </div>

        <div style="background: #262626; border-radius: 12px; padding: 20px; border: 1px solid rgba(107,254,156,0.15);">
          <div style="font-size: 11px; font-weight: 700; color: #adaaaa; letter-spacing: 1.5px; margin-bottom: 12px; text-transform: uppercase;">优化后的提示词</div>
          <div style="color: #5bef90; line-height: 1.7; white-space: pre-wrap; font-family: monospace; font-size: 14px; background: rgba(0,0,0,0.2); padding: 16px; border-radius: 8px;">${(prompt || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
        </div>
      </div>

      <div style="text-align: center; margin-top: 24px; padding-top: 16px; border-top: 1px solid #494847;">
        <div style="font-size: 10px; color: #ffffff; letter-spacing: 2px; opacity: 0.6; text-transform: uppercase;">炼金术士 AI · 提示词工坊</div>
      </div>
    `;

    document.body.appendChild(container);

    try {
      const canvas = await html2canvas(container, {
        backgroundColor: '#0e0e0e',
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const link = document.createElement('a');
      link.download = `炼金术AI-词图-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('保存词图失败:', error);
    } finally {
      document.body.removeChild(container);
      setSaving(false);
    }
  };

  return (
    <button
      onClick={handleSaveImage}
      disabled={saving}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-tertiary/10 hover:bg-tertiary/20 border border-tertiary/20 rounded-lg text-xs text-tertiary transition-colors disabled:opacity-50"
    >
      <Download className="w-3.5 h-3.5" />
      <span>{saving ? '生成中...' : '保存词图'}</span>
    </button>
  );
}