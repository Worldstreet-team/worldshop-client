// Voice Agent State Machine
export type VoiceAgentState = 'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking';

// Tool definition for OpenAI Realtime API
export interface VoiceToolDefinition {
  type: 'function';
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

// Tool handler function type
export type VoiceToolHandler = (args: Record<string, unknown>) => Promise<string>;

// Configuration for a voice session
export interface VoiceSessionConfig {
  apiKey: string;
  model?: string;
  voice?: string;
  instructions: string;
  tools: VoiceToolDefinition[];
  toolHandlers: Record<string, VoiceToolHandler>;
}

// Listener for state changes
type StateListener = (state: VoiceAgentState) => void;

/**
 * VoiceAgentCore manages the WebSocket connection to OpenAI's Realtime API,
 * handles audio I/O, function call dispatch, and the agent state machine.
 */
export class VoiceAgentCore {
  private ws: WebSocket | null = null;
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private playbackContext: AudioContext | null = null;

  private state: VoiceAgentState = 'idle';
  private stateListeners: Set<StateListener> = new Set();
  private config: VoiceSessionConfig | null = null;

  // Audio playback queue
  private audioQueue: Int16Array[] = [];
  private isPlaying = false;

  getState(): VoiceAgentState {
    return this.state;
  }

  onStateChange(listener: StateListener): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  private setState(newState: VoiceAgentState) {
    this.state = newState;
    this.stateListeners.forEach((l) => l(newState));
  }

  /**
   * Start a new voice session: acquire mic, open WebSocket, configure session.
   */
  async connect(config: VoiceSessionConfig): Promise<void> {
    if (this.state !== 'idle') {
      throw new Error('Voice agent is already active');
    }

    this.config = config;
    this.setState('connecting');

    try {
      // 1. Acquire microphone
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // 2. Open WebSocket to Realtime API
      const model = config.model || 'gpt-4o-realtime-preview';
      const url = `wss://api.openai.com/v1/realtime?model=${model}`;

      this.ws = new WebSocket(url, [
        'realtime',
        `openai-insecure-api-key.${config.apiKey}`,
        'openai-beta.realtime-v1',
      ]);

      await this.waitForOpen();

      // 3. Configure session
      this.sendEvent('session.update', {
        session: {
          modalities: ['text', 'audio'],
          voice: config.voice || 'alloy',
          instructions: config.instructions,
          input_audio_format: 'pcm16',
          output_audio_format: 'pcm16',
          turn_detection: {
            type: 'server_vad',
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 500,
          },
          tools: config.tools,
        },
      });

      // 4. Wire up event handling
      this.ws.onmessage = (event) => this.handleMessage(event);
      this.ws.onclose = () => this.handleClose();
      this.ws.onerror = () => this.handleClose();

      // 5. Start streaming mic audio
      await this.startAudioCapture();

      this.setState('listening');

      // 6. Trigger initial greeting
      this.sendEvent('response.create', {
        response: {
          modalities: ['text', 'audio'],
          instructions: 'Greet the user briefly. Say something like "Hi! How can I help you shop today?"',
        },
      });
    } catch (err) {
      await this.cleanup();
      this.setState('idle');
      throw err;
    }
  }

  /**
   * End the voice session and release all resources.
   */
  async disconnect(): Promise<void> {
    await this.cleanup();
    this.setState('idle');
  }

  // ── WebSocket Helpers ─────────────────────────────────────────

  private waitForOpen(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.ws) return reject(new Error('No WebSocket'));
      this.ws.onopen = () => resolve();
      this.ws.onerror = () => reject(new Error('WebSocket connection failed'));
      // Timeout after 10 seconds
      setTimeout(() => reject(new Error('WebSocket connection timeout')), 10000);
    });
  }

  private sendEvent(type: string, data?: Record<string, unknown>) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, ...data }));
    }
  }

  // ── Message Handling ──────────────────────────────────────────

  private handleMessage(event: MessageEvent) {
    let msg: { type: string; [key: string]: unknown };
    try {
      msg = JSON.parse(event.data as string);
    } catch {
      return;
    }

    switch (msg.type) {
      case 'input_audio_buffer.speech_started':
        // User started talking — if agent is speaking, this is an interruption
        if (this.state === 'speaking') {
          this.cancelPlayback();
          this.sendEvent('response.cancel');
        }
        this.setState('listening');
        break;

      case 'input_audio_buffer.speech_stopped':
        this.setState('thinking');
        break;

      case 'response.audio.delta':
        // Received audio chunk from the agent
        if (this.state !== 'speaking') {
          this.setState('speaking');
        }
        this.enqueueAudio(msg.delta as string);
        break;

      case 'response.audio.done':
        // Agent finished the audio portion of the response
        break;

      case 'response.done':
        // Full response complete — go back to listening
        if (this.state === 'speaking' || this.state === 'thinking') {
          this.setState('listening');
        }
        break;

      case 'response.function_call_arguments.done':
        this.handleFunctionCall(msg);
        break;

      case 'error':
        console.error('[VoiceAgent] Server error:', msg.error);
        break;
    }
  }

  private async handleFunctionCall(msg: { [key: string]: unknown }) {
    const callId = msg.call_id as string;
    const fnName = msg.name as string;
    const argsStr = msg.arguments as string;
    const handler = this.config?.toolHandlers[fnName];

    let result: string;
    if (handler) {
      try {
        const args = JSON.parse(argsStr);
        result = await handler(args);
      } catch (err) {
        result = `Sorry, something went wrong while performing that action. ${(err as Error).message}`;
      }
    } else {
      result = `I don't know how to do "${fnName}" yet.`;
    }

    // Send function output back so the agent can continue
    this.sendEvent('conversation.item.create', {
      item: {
        type: 'function_call_output',
        call_id: callId,
        output: result,
      },
    });

    // Let the model generate a follow-up response
    this.sendEvent('response.create');
  }

  private handleClose() {
    this.cleanup();
    this.setState('idle');
  }

  // ── Audio Capture (Mic → WebSocket) ───────────────────────────

  private async startAudioCapture() {
    if (!this.mediaStream) return;

    this.audioContext = new AudioContext({ sampleRate: 24000 });

    // Create a worklet to capture raw PCM audio
    const workletCode = `
      class CaptureProcessor extends AudioWorkletProcessor {
        process(inputs) {
          const input = inputs[0];
          if (input && input[0]) {
            const float32 = input[0];
            const int16 = new Int16Array(float32.length);
            for (let i = 0; i < float32.length; i++) {
              const s = Math.max(-1, Math.min(1, float32[i]));
              int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
            }
            this.port.postMessage(int16.buffer, [int16.buffer]);
          }
          return true;
        }
      }
      registerProcessor('capture-processor', CaptureProcessor);
    `;
    const blob = new Blob([workletCode], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);

    await (this.audioContext.audioWorklet as AudioWorklet).addModule(url);
    URL.revokeObjectURL(url);

    this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
    this.workletNode = new AudioWorkletNode(this.audioContext, 'capture-processor');

    this.workletNode.port.onmessage = (e: MessageEvent<ArrayBuffer>) => {
      // Convert to base64 and send to WebSocket
      const bytes = new Uint8Array(e.data);
      const base64 = this.uint8ToBase64(bytes);
      this.sendEvent('input_audio_buffer.append', { audio: base64 });
    };

    this.sourceNode.connect(this.workletNode);
    this.workletNode.connect(this.audioContext.destination); // required for worklet to run
  }

  // ── Audio Playback (WebSocket → Speaker) ──────────────────────

  private enqueueAudio(base64Delta: string) {
    const bytes = this.base64ToUint8(base64Delta);
    const int16 = new Int16Array(bytes.buffer);
    this.audioQueue.push(int16);

    if (!this.isPlaying) {
      this.playNextChunk();
    }
  }

  private async playNextChunk() {
    if (this.audioQueue.length === 0) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;

    if (!this.playbackContext) {
      this.playbackContext = new AudioContext({ sampleRate: 24000 });
    }

    // Merge all queued chunks into one buffer for smoother playback
    const totalLength = this.audioQueue.reduce((sum, chunk) => sum + chunk.length, 0);
    const merged = new Int16Array(totalLength);
    let offset = 0;
    for (const chunk of this.audioQueue) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }
    this.audioQueue = [];

    // Convert Int16 to Float32 for Web Audio API
    const float32 = new Float32Array(merged.length);
    for (let i = 0; i < merged.length; i++) {
      float32[i] = merged[i] / 0x8000;
    }

    const audioBuffer = this.playbackContext.createBuffer(1, float32.length, 24000);
    audioBuffer.getChannelData(0).set(float32);

    const source = this.playbackContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.playbackContext.destination);
    source.onended = () => this.playNextChunk();
    source.start();
  }

  private cancelPlayback() {
    this.audioQueue = [];
    this.isPlaying = false;
    if (this.playbackContext) {
      this.playbackContext.close().catch(() => {});
      this.playbackContext = null;
    }
  }

  // ── Cleanup ───────────────────────────────────────────────────

  private async cleanup() {
    // Close WebSocket
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close();
      }
      this.ws = null;
    }

    // Stop audio capture
    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode = null;
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.audioContext) {
      await this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    // Release microphone
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }

    // Stop playback
    this.cancelPlayback();

    this.config = null;
  }

  // ── Base64 Helpers ────────────────────────────────────────────

  private uint8ToBase64(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToUint8(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
}
