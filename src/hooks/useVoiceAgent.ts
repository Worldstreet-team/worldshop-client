import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { VoiceAgentCore, type VoiceAgentState } from '@/services/voiceAgent';
import { voiceToolDefinitions, createVoiceToolHandlers } from '@/services/voiceAgentTools';

const SYSTEM_INSTRUCTIONS = `You are a friendly shopping assistant for WorldShop, an online marketplace. Your tone is warm, concise, and helpful.

Rules:
- Keep responses short — one or two sentences max.
- When the user asks to navigate somewhere, use the navigate_to tool immediately. Do NOT ask for confirmation before navigating.
- When the user asks to search, find, look for, or show a product, use the search_products tool immediately.
- If you don't understand a request, ask a brief clarifying question.
- Speak product names and prices naturally (e.g. "forty-five thousand naira" not "₦45,000").
- If the user asks you to do something outside your capabilities, politely explain what you CAN do: navigate pages and search products.
- Do not process payments or fill out forms.
- Speak in English.`;

export function useVoiceAgent() {
  const navigate = useNavigate();
  const coreRef = useRef<VoiceAgentCore | null>(null);
  const [agentState, setAgentState] = useState<VoiceAgentState>('idle');
  const [error, setError] = useState<string | null>(null);

  // Create the core instance once
  useEffect(() => {
    coreRef.current = new VoiceAgentCore();
    const unsubscribe = coreRef.current.onStateChange(setAgentState);
    return () => {
      unsubscribe();
      coreRef.current?.disconnect();
    };
  }, []);

  const startSession = useCallback(async () => {
    if (!coreRef.current) return;
    setError(null);

    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey) {
      setError('OpenAI API key is not configured.');
      return;
    }

    try {
      const toolHandlers = createVoiceToolHandlers(navigate);

      await coreRef.current.connect({
        apiKey,
        instructions: SYSTEM_INSTRUCTIONS,
        tools: voiceToolDefinitions,
        toolHandlers,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start voice session';
      setError(message);
    }
  }, [navigate]);

  const endSession = useCallback(async () => {
    if (!coreRef.current) return;
    await coreRef.current.disconnect();
    setError(null);
  }, []);

  const toggleSession = useCallback(async () => {
    if (agentState === 'idle') {
      await startSession();
    } else {
      await endSession();
    }
  }, [agentState, startSession, endSession]);

  return {
    agentState,
    isConnected: agentState !== 'idle',
    error,
    startSession,
    endSession,
    toggleSession,
  };
}
