import { useVoiceAgent } from '@/hooks/useVoiceAgent';
import { useAuthStore } from '@/store/authStore';
import type { VoiceAgentState } from '@/services/voiceAgent';
import './VoiceButton.scss';

const STATE_LABELS: Record<VoiceAgentState, string> = {
  idle: 'Start voice assistant',
  connecting: 'Connecting voice assistant',
  listening: 'Voice assistant is listening',
  thinking: 'Voice assistant is thinking',
  speaking: 'Voice assistant is speaking',
};

export default function VoiceButton() {
  const { isAuthenticated } = useAuthStore();
  const { agentState, toggleSession, error } = useVoiceAgent();

  // Only show for authenticated users
  if (!isAuthenticated) return null;

  return (
    <button
      className={`voice-button voice-button--${agentState}`}
      onClick={toggleSession}
      aria-label={STATE_LABELS[agentState]}
      title={error || STATE_LABELS[agentState]}
      type="button"
    >
      <span className="voice-button__icon">
        {agentState === 'idle' && <MicIcon />}
        {agentState === 'connecting' && <SpinnerIcon />}
        {agentState === 'listening' && <MicIcon />}
        {agentState === 'thinking' && <DotsIcon />}
        {agentState === 'speaking' && <WaveIcon />}
      </span>

      {/* Pulse ring for listening state */}
      {agentState === 'listening' && (
        <>
          <span className="voice-button__pulse" />
          <span className="voice-button__pulse voice-button__pulse--delayed" />
        </>
      )}
    </button>
  );
}

// ── Inline SVG Icons ────────────────────────────────────────────

function MicIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg className="voice-button__spinner" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function DotsIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <circle className="voice-button__dot voice-button__dot--1" cx="6" cy="12" r="2.5" />
      <circle className="voice-button__dot voice-button__dot--2" cx="12" cy="12" r="2.5" />
      <circle className="voice-button__dot voice-button__dot--3" cx="18" cy="12" r="2.5" />
    </svg>
  );
}

function WaveIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <rect className="voice-button__bar voice-button__bar--1" x="3" y="8" width="3" height="8" rx="1.5" />
      <rect className="voice-button__bar voice-button__bar--2" x="8.5" y="5" width="3" height="14" rx="1.5" />
      <rect className="voice-button__bar voice-button__bar--3" x="14" y="7" width="3" height="10" rx="1.5" />
      <rect className="voice-button__bar voice-button__bar--4" x="19.5" y="9" width="3" height="6" rx="1.5" />
    </svg>
  );
}
