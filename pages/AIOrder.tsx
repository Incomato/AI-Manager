import React, { useState, useEffect } from 'react';
import { useAI } from '../contexts/AIContext';
import { CheckIcon } from '../components/icons/CheckIcon';

const AIOrder: React.FC = () => {
  const { aiOrder, setAiOrder } = useAI();
  const [inputValue, setInputValue] = useState(aiOrder);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');

  useEffect(() => {
    setInputValue(aiOrder);
  }, [aiOrder]);

  const handleSave = () => {
    setAiOrder(inputValue);
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000); // Reset after 2 seconds
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight">AI Instruction</h2>
        <p className="mt-2 text-text-secondary">
          Define the role, task, and goal for the AI here. This instruction will be used as the system prompt for every post generation.
        </p>
      </div>

      <div className="bg-surface p-6 rounded-lg shadow-lg">
        <label htmlFor="ai-order-prompt" className="block text-lg font-semibold text-text-primary mb-3">
          System Instruction for Gemini
        </label>
        <textarea
          id="ai-order-prompt"
          value={inputValue}
          // FIX: Cast event.target to 'any' to access its 'value' property due to TS lib issue.
          onChange={(e) => setInputValue((e.target as any).value)}
          rows={12}
          className="w-full bg-background/70 border-border rounded-md text-text-primary focus:ring-primary focus:border-primary transition p-4"
          placeholder="e.g., You are a witty social media manager for a Gen-Z audience. Your task is to create short, punchy, and funny captions..."
        />
        <div className="mt-4 flex justify-end items-center gap-4">
            {saveStatus === 'saved' && (
                <div className="flex items-center gap-2 text-green-400 transition-opacity duration-300">
                    <CheckIcon className="h-5 w-5" />
                    <span>Saved!</span>
                </div>
            )}
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-primary text-white font-semibold rounded-md hover:bg-primary-hover transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface focus:ring-primary"
          >
            Save Instruction
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIOrder;