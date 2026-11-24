// Reading aloud with the browser's own speech, where there is any. Everything is optional:
// without speechSynthesis (or if it throws) every call quietly does nothing, and the speaker
// button stays hidden.

const PREFERRED = ['Samantha', 'Karen', 'Moira', 'Tessa', 'Fiona', 'Google US English', 'Google UK English Female', 'Microsoft Aria', 'Microsoft Jenny'];

export function createSpeech(env = typeof window !== 'undefined' ? window : {}) {
  let synth = null;
  let Utter = null;
  try {
    synth = env.speechSynthesis || null;
    Utter = env.SpeechSynthesisUtterance || null;
  } catch {
    synth = null;
  }
  const available = !!(synth && Utter && typeof synth.speak === 'function');
  let voice = null;
  let speaking = false;

  function chooseVoice() {
    if (voice || !available) return voice;
    try {
      const voices = (synth.getVoices && synth.getVoices()) || [];
      const en = voices.filter((v) => /^en[-_]/i.test(v.lang || ''));
      voice = PREFERRED.map((n) => en.find((v) => v.name && v.name.startsWith(n))).find(Boolean)
        || en.find((v) => v.localService) || en[0] || null;
    } catch {
      voice = null;
    }
    return voice;
  }

  return {
    available,
    // Says the text (stopping anything already being said). opts: { rate, pitch, onEnd }
    speak(text, opts = {}) {
      if (!available || !text) return false;
      try {
        synth.cancel();
        const u = new Utter(String(text));
        const v = chooseVoice();
        if (v) u.voice = v;
        u.lang = (v && v.lang) || 'en-US';
        u.rate = opts.rate ?? 0.9;
        u.pitch = opts.pitch ?? 1.2;
        u.volume = 1;
        speaking = true;
        u.onend = () => {
          speaking = false;
          opts.onEnd?.();
        };
        u.onerror = () => {
          speaking = false;
        };
        synth.speak(u);
        return true;
      } catch {
        speaking = false;
        return false;
      }
    },
    cancel() {
      speaking = false;
      if (!available) return;
      try {
        synth.cancel();
      } catch {
        // nothing to stop
      }
    },
    get speaking() {
      return speaking;
    },
  };
}
