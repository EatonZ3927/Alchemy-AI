import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import OpenAI from 'openai';
import { Message } from '../types';
import { MAX_ATTACHED_FILES, MAX_IMAGE_FILE_SIZE, MAX_VIDEO_DURATION, MAX_VIDEO_FILE_SIZE, generateId, fileToBase64, getVideoDuration, extractVideoFrames, isSupportedImageFile, isSupportedMediaFile, isSupportedVideoFile } from '../utils';
import { systemPrompt, summarizePrompt } from '../prompts';

type PromptResponse = {
  modelName?: string;
  modelType?: string;
  reasoning?: string;
  optimizedPrompt?: string;
  chatboxUrl?: string;
};

const UPLOAD_LIMIT_NOTICE_DURATION = 3000;

function buildHistoryMessages(
  previousMessages: Message[],
  latestUserContent: string,
): OpenAI.Chat.ChatCompletionMessageParam[] {
  return [
    ...previousMessages.map((msg): OpenAI.Chat.ChatCompletionMessageParam => ({
      role: msg.role === 'ai' ? 'assistant' : 'user',
      content: msg.role === 'ai'
        ? JSON.stringify({
            modelName: msg.model,
            modelType: msg.modelType,
            reasoning: msg.reasoning,
            optimizedPrompt: msg.prompt,
            chatboxUrl: msg.chatboxUrl
          })
        : msg.content
    })),
    {
      role: 'user',
      content: latestUserContent
    }
  ];
}

function createAiMessage(result: PromptResponse, reasoning?: string): Message {
  return {
    id: generateId(),
    role: 'ai',
    content: '',
    model: result.modelName,
    modelType: result.modelType,
    reasoning: reasoning ?? result.reasoning,
    prompt: result.optimizedPrompt,
    chatboxUrl: result.chatboxUrl,
  };
}

function getGenerationErrorMessage(error: unknown): string {
  const status = typeof error === 'object' && error !== null && 'status' in error
    ? (error as { status?: number }).status
    : undefined;
  const message = error instanceof Error ? error.message : String(error);

  if (status === 429) {
    return 'API 调用额度已耗尽，请稍后再试。';
  }
  if (status === 401) {
    return 'API Key 无效，请检查配置。';
  }
  if (status === 403) {
    return 'API Key 权限不足，请检查配置。';
  }
  return `抱歉，炼金术士的熔炉暂时熄火了。错误: ${message}`;
}

function getMediaErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }
  return fallback;
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [promptLangs, setPromptLangs] = useState<Record<string, 'zh' | 'en'>>({});
  const [translatedPrompts, setTranslatedPrompts] = useState<Record<string, string>>({});
  const [translating, setTranslating] = useState<Record<string, boolean>>({});
  const [uploadLimitNotice, setUploadLimitNotice] = useState<string | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const textareaResizeRef = useRef<number | null>(null);
  const uploadLimitNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (uploadLimitNoticeTimerRef.current !== null) {
      clearTimeout(uploadLimitNoticeTimerRef.current);
    }
  }, []);

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
        model: 'deepseek-v4-flash',
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

  const analyzeImage = async (imageBase64: string, mimeType = 'image/jpeg', index?: number): Promise<string> => {
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
      model: 'qwen3.7-plus',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: visionPrompt },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType || 'image/jpeg'};base64,${imageBase64}`
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
      try {
        const base64 = await fileToBase64(files[i]);
        const analysis = await analyzeImage(base64, files[i].type, i + 1);
        results.push(`【图片${i + 1}分析】\n${analysis}`);
      } catch (error) {
        console.error('Image analysis error:', error);
        results.push(`【图片${i + 1}分析失败】\n${getMediaErrorMessage(error, '无法分析图片内容')}`);
      }
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
      model: 'qwen3.7-plus',
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
    if (frames.length === 0) {
      throw new Error('无法从视频中提取有效画面');
    }

    const frameAnalyses: string[] = [];
    for (let i = 0; i < frames.length; i++) {
      const analysis = await analyzeVideoFrame(frames[i], i + 1, frames.length);
      frameAnalyses.push(`【第${i + 1}帧】${analysis}`);
    }

    const openai = createOpenAIClient();
    const summaryResponse = await openai.chat.completions.create({
      model: 'deepseek-v4-flash',
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
    const imageFiles = currentFiles.filter(isSupportedImageFile);
    const videoFiles = currentFiles.filter(isSupportedVideoFile);
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
        mediaAnalysisResults.push(`【图片分析失败】\n${getMediaErrorMessage(error, '无法分析图片内容')}`);
      }
    }

    if (hasVideos) {
      for (let i = 0; i < videoFiles.length; i++) {
        try {
          const videoAnalysis = await analyzeVideo(videoFiles[i]);
          mediaAnalysisResults.push(`【视频${i + 1}分析】\n${videoAnalysis}`);
        } catch (error: unknown) {
          console.error('Video analysis error:', error);
          mediaAnalysisResults.push(`【视频${i + 1}分析失败】\n${getMediaErrorMessage(error, '无法分析视频内容')}`);
        }
      }
    }

    if (mediaAnalysisResults.length > 0) {
      const combinedAnalysis = mediaAnalysisResults.join('\n\n');
      const mediaType = hasImages && hasVideos ? '图片和视频' : hasVideos ? '视频' : '图片';
      enhancedUserText = userText
        ? `${userText}\n\n${combinedAnalysis}\n\n请根据以上所有${mediaType}分析内容，综合生成优化后的提示词。`
        : `请根据以下${mediaType}分析结果生成一个专业的提示词。\n\n${combinedAnalysis}`;
    }

    try {
      const openai = createOpenAIClient();
      const historyMessages = buildHistoryMessages(messages, enhancedUserText);

      const response = await openai.chat.completions.create({
        model: 'deepseek-v4-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...historyMessages
        ],
        response_format: { type: 'json_object' }
      });

      if (response.choices[0]?.message?.content) {
        const result = JSON.parse(response.choices[0].message.content) as PromptResponse;
        const reasoning = mediaAnalysisResults.length > 0
          ? [result.reasoning, `【已融合${mediaAnalysisResults.length}个媒体文件分析内容】`].filter(Boolean).join('\n\n')
          : result.reasoning;
        const aiMsg = createAiMessage(
          result,
          reasoning,
        );
        setMessages(prev => [...prev, aiMsg]);
      }
    } catch (error: unknown) {
      console.error("AI Generation Error:", error);

      const errorMsg: Message = {
        id: generateId(),
        role: 'ai',
        content: getGenerationErrorMessage(error),
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
      const historyMessages = buildHistoryMessages(messages, summaryRequestText);

      const response = await openai.chat.completions.create({
        model: 'deepseek-v4-flash',
        messages: [
          { role: 'system', content: summarizePrompt },
          ...historyMessages
        ],
        response_format: { type: 'json_object' }
      });

      if (response.choices[0]?.message?.content) {
        const result = JSON.parse(response.choices[0].message.content) as PromptResponse;
        const aiMsg = createAiMessage(result);
        setMessages(prev => [...prev, aiMsg]);
      }
    } catch (error: unknown) {
      console.error("AI Generation Error:", error);

      const errorMsg: Message = {
        id: generateId(),
        role: 'ai',
        content: getGenerationErrorMessage(error),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = (e: ChangeEvent<HTMLTextAreaElement>) => {
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

  const showUploadLimitNotice = () => {
    if (uploadLimitNoticeTimerRef.current !== null) {
      clearTimeout(uploadLimitNoticeTimerRef.current);
    }

    setUploadLimitNotice('上传文件超出容量限制');

    uploadLimitNoticeTimerRef.current = setTimeout(() => {
      setUploadLimitNotice(null);
      uploadLimitNoticeTimerRef.current = null;
    }, UPLOAD_LIMIT_NOTICE_DURATION);
  };

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const selectedFiles: File[] = Array.from(files);
      const acceptedFiles: File[] = [];
      let hasShownSizeLimitNotice = false;
      for (const file of selectedFiles) {
        if (!isSupportedMediaFile(file)) {
          alert(`文件 "${file.name}" 格式不受支持，已自动跳过`);
          continue;
        }

        if (isSupportedImageFile(file) && file.size > MAX_IMAGE_FILE_SIZE) {
          if (!hasShownSizeLimitNotice) {
            showUploadLimitNotice();
            hasShownSizeLimitNotice = true;
          }
          continue;
        }

        if (isSupportedVideoFile(file)) {
          if (file.size > MAX_VIDEO_FILE_SIZE) {
            if (!hasShownSizeLimitNotice) {
              showUploadLimitNotice();
              hasShownSizeLimitNotice = true;
            }
            continue;
          }

          try {
            const duration = await getVideoDuration(file);
            if (duration <= MAX_VIDEO_DURATION) {
              acceptedFiles.push(file);
            } else {
              alert(`视频 "${file.name}" 时长超过${MAX_VIDEO_DURATION}秒限制（当前${Math.round(duration)}秒），已自动跳过`);
            }
          } catch {
            acceptedFiles.push(file);
          }
        } else {
          acceptedFiles.push(file);
        }
      }

      const remainingSlots = Math.max(MAX_ATTACHED_FILES - attachedFiles.length, 0);
      if (acceptedFiles.length > remainingSlots) {
        alert(`最多只能上传 ${MAX_ATTACHED_FILES} 个文件，超出部分已自动跳过`);
      }
      const totalFiles = [...attachedFiles, ...acceptedFiles.slice(0, remainingSlots)];
      setAttachedFiles(totalFiles);
    }
    e.target.value = '';
  };

  const handleImageAttachClick = () => {
    imageInputRef.current?.click();
  };

  const handleVideoAttachClick = () => {
    videoInputRef.current?.click();
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
    uploadLimitNotice,

    // Action functions
    handleSubmit,
    handleSummarize,
    handleKeyDown,
    handleInput,
    handleFileSelect,
    handleImageAttachClick,
    handleVideoAttachClick,
    handleRemoveFile,
    togglePromptLang,
    getUserContentForMessage,
    clearMessages,

    // Refs
    imageInputRef,
    videoInputRef,
  };
}
