export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  isError?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
  systemInstruction?: string;
  temperature?: number;
}

export interface ServerStatus {
  status: string;
  hasApiKey: boolean;
  model: string;
  appName: string;
  availableModels: Array<{ id: string; name: string; description: string; isFast: boolean }>;
}

export type PersonaTone = 'balanced' | 'creative' | 'precise';

export type ModelChoice = 'gemini-3.1-flash-lite' | 'gemini-3.8-flash';
