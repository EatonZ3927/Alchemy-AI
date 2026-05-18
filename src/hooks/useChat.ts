import React, { useState, useRef } from 'react';
import OpenAI from 'openai';
import { Message } from '../types';
import { IMAGE_FORMATS, VIDEO_FORMATS, MAX_VIDEO_DURATION, generateId, fileToBase64, getVideoDuration, extractVideoFrames } from '../utils';
import { systemPrompt, summarizePrompt } from '../prompts';

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [promptLangs, setPromptLangs] = useState<Record<string, 'zh' | 'en'>>({});
  const [translatedPrompts, setTranslatedPrompts] = useState<Record<string, string>>({});
  const [translating, setTranslating] = useState<Record<string, boolean>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaResizeRef = useRef<number | null>(null);

  const createOpenAIClient = () => {
    return new OpenAI({
      apiKey: import.meta.env.VITE_QWEN_API_KEY,
      baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      dangerouslyAllowBrowser: true
    });
  };

  const getUserContentForMessage = (aiMsgId: string): string => {
    const aiIndex = messages.findIndex(m => m.id === aiMsgId);
    if (aiIndex <= 0) return '';
    for (let i = aiIndex - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        return messages[i].content;
      }
    }
    return '';
  };

  const translatePrompt = async (msgId: string, prompt: string) => {
    if (translatedPrompts[msgId]) return;
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
      setTranslatedPrompts(prev => ({ ...prev, [msgId]: prompt }));
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

  const analyzeVideo = async (file: File): Promise<string> => {
    const duration = await getVideoDuration(file);
    if (duration > MAX_VIDEO_DURATION) {
      throw new Error(`视频时长超过${MAX_VIDEO_DURATION}秒限制，当前时长: ${Math.round(duration)}秒`);
    }

    const frames = await extractVideoFrames(file);

    const frameAnalyses: string[] = [];
    for (let i = 0; i < frames.length; i++) {
      const analysis = await analyzeVideoFrame(frames[i], i + 1, frames.length);
      frameAnalyses.push(`【第${i + 1}帧】${analysis}`);
    }

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
      id: generateId(),
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

    if (hasImages) {
      try {
        const imageResults = await analyzeMultipleImages(imageFiles);
        mediaAnalysisResults.push(...imageResults);
      } catch (error) {
        console.error('Image analysis error:', error);
      }
    }

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
          id: generateId(),
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
        id: generateId(),
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
      id: generateId(),
      role: 'user',
      content: summaryRequestText,
    };

    setMessages(prev => [...prev, newUserMsg]);
    setIsTyping(true);

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
          id: generateId(),
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
        id: generateId(),
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

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const allFiles: File[] = Array.from(files);
      const validFiles: File[] = allFiles.filter(f =>
        IMAGE_FORMATS.includes(f.type) ||
        VIDEO_FORMATS.includes(f.type) ||
        f.type.startsWith('image/') ||
        f.type.startsWith('video/')
      );

      const validFilesWithDuration: File[] = [];
      for (const file of validFiles) {
        if (VIDEO_FORMATS.includes(file.type) || file.type.startsWith('video/')) {
          try {
            const duration = await getVideoDuration(file);
            if (duration <= MAX_VIDEO_DURATION) {
              validFilesWithDuration.push(file);
            } else {
              alert(`视频 "${file.name}" 时长超过${MAX_VIDEO_DURATION}秒限制（当前${Math.round(duration)}秒），已自动跳过`);
            }
          } catch {
            validFilesWithDuration.push(file);
          }
        } else {
          validFilesWithDuration.push(file);
        }
      }

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

  const clearMessages = () => {
    setMessages([]);
  };

  return {
    // State
    messages,
    inputValue,
    isTyping,
    attachedFiles,
    promptLangs,
    translatedPrompts,
    translating,

    // Action functions
    handleSubmit,
    handleSummarize,
    handleKeyDown,
    handleInput,
    handleFileSelect,
    handleAttachClick,
    handleRemoveFile,
    togglePromptLang,
    getDisplayPrompt,
    getUserContentForMessage,
    clearMessages,

    // Refs
    fileInputRef,
  };
}