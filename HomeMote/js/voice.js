/**
 * HomeMote Voice & Siri Dictation Controller
 * Uses Web Speech API to provide voice commands to HomeOS
 */

import { haptics } from './haptics.js';

export class VoiceController {
  constructor(options = {}) {
    this.onResult = options.onResult || (() => {});
    this.onStatusChange = options.onStatusChange || (() => {});
    this.recognition = null;
    this.isListening = false;

    this.init();
  }

  init() {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      console.warn('[HomeMote Voice] Web Speech API not supported in this browser.');
      return;
    }

    this.recognition = new SpeechRec();
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';

    this.recognition.onstart = () => {
      this.isListening = true;
      haptics.success();
      this.onStatusChange(true);
    };

    this.recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0].transcript)
        .join('');
      
      const isFinal = event.results[0].isFinal;
      if (isFinal) {
        haptics.click();
        this.onResult(transcript);
        this.stop();
      }
    };

    this.recognition.onerror = (event) => {
      console.warn('[HomeMote Voice] Speech recognition error:', event.error);
      this.stop();
      haptics.error();
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.onStatusChange(false);
    };
  }

  toggle() {
    if (this.isListening) {
      this.stop();
    } else {
      this.start();
    }
  }

  start() {
    if (!this.recognition) {
      alert('Voice dictation is not supported on this browser. Try Chrome/Safari.');
      return;
    }
    try {
      this.recognition.start();
    } catch (e) {
      console.warn('[HomeMote Voice] Already active or failed:', e);
    }
  }

  stop() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {}
    }
    this.isListening = false;
    this.onStatusChange(false);
  }
}

