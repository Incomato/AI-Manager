import React, { createContext, useContext, useState } from 'react';

const AI_ORDER_STORAGE_KEY = 'ai-order-prompt';
const DEFAULT_AI_ORDER = `You are an expert social media manager. Your task is to create engaging content for platforms like TikTok and Clapper.`;

interface AIContextType {
  aiOrder: string;
  setAiOrder: (order: string) => void;
}

const AIContext = createContext<AIContextType | undefined>(undefined);

export const AIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [aiOrder, setAiOrderState] = useState<string>(() => {
    try {
        // FIX: Cast 'window' to 'any' to bypass TS lib issue with 'localStorage'.
        return (window as any).localStorage.getItem(AI_ORDER_STORAGE_KEY) || DEFAULT_AI_ORDER;
    } catch (error) {
        console.warn("Could not access localStorage to get AI order:", error);
        return DEFAULT_AI_ORDER;
    }
  });

  const setAiOrder = (order: string) => {
    try {
        // FIX: Cast 'window' to 'any' to bypass TS lib issue with 'localStorage'.
        (window as any).localStorage.setItem(AI_ORDER_STORAGE_KEY, order);
    } catch (error) {
        console.warn("Could not write AI order to localStorage:", error);
    }
    setAiOrderState(order);
  };
  
  const value = { aiOrder, setAiOrder };

  return <AIContext.Provider value={value}>{children}</AIContext.Provider>;
};

export const useAI = () => {
  const context = useContext(AIContext);
  if (context === undefined) {
    throw new Error('useAI must be used within an AIProvider');
  }
  return context;
};