export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp?: string;
  chemicalFormula?: string;
}

export interface AiFeatureHighlight {
  id: string;
  title: string;
  description: string;
}
