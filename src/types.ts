export type Message = {
  id: string;
  role: 'user' | 'ai';
  content: string;
  model?: string;
  modelType?: string;
  reasoning?: string;
  prompt?: string;
  chatboxUrl?: string;
};