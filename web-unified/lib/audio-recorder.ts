/**
 * In-browser microphone recorder & waveform generator
 * Uses Web Audio API & MediaRecorder for voiceover capture
 */

export interface RecordedVoiceResult {
  blob: Blob;
  audioUrl: string;
  duration: number; // in seconds
  waveform: number[]; // array of normalized peaks 0.05 to 1.0
}

let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];
let audioStream: MediaStream | null = null;
let recordingStartTime = 0;

export async function startVoiceRecording(): Promise<boolean> {
  try {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunks = [];
      recordingStartTime = Date.now();
      
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : '';
        
      mediaRecorder = mimeType ? new MediaRecorder(audioStream, { mimeType }) : new MediaRecorder(audioStream);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.start(100);
      return true;
    }
    return false;
  } catch (err) {
    console.error('Microphone access denied or error:', err);
    return false;
  }
}

export function stopVoiceRecording(): Promise<RecordedVoiceResult | null> {
  return new Promise((resolve) => {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
      resolve(null);
      return;
    }

    mediaRecorder.onstop = async () => {
      const mime = mediaRecorder?.mimeType || 'audio/webm';
      const audioBlob = new Blob(audioChunks, { type: mime });
      const audioUrl = URL.createObjectURL(audioBlob);
      const duration = Math.max(1, (Date.now() - recordingStartTime) / 1000);

      // Release mic stream
      if (audioStream) {
        audioStream.getTracks().forEach((track) => track.stop());
        audioStream = null;
      }

      // Generate waveform peaks
      const waveform = await extractWaveformFromBlob(audioBlob, 48);

      resolve({
        blob: audioBlob,
        audioUrl,
        duration: Math.round(duration * 10) / 10,
        waveform,
      });
    };

    mediaRecorder.stop();
  });
}

/**
 * Decodes audio blob and computes normalized waveform peaks
 */
export async function extractWaveformFromBlob(blob: Blob, sampleCount = 48): Promise<number[]> {
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    const channelData = audioBuffer.getChannelData(0);
    const blockSize = Math.floor(channelData.length / sampleCount);
    const peaks: number[] = [];

    for (let i = 0; i < sampleCount; i++) {
      let sum = 0;
      const start = i * blockSize;
      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(channelData[start + j] || 0);
      }
      const avg = sum / blockSize;
      // Clamp between 0.08 and 1.0
      peaks.push(Math.min(1.0, Math.max(0.08, avg * 3.5)));
    }
    await audioCtx.close();
    return peaks;
  } catch {
    // Return aesthetic procedural fallback peaks if decoding fails
    return Array.from({ length: sampleCount }, (_, idx) => 
      0.15 + 0.7 * Math.sin(idx * 0.45) * Math.sin(idx * 0.45)
    );
  }
}

/**
 * Generate procedural aesthetic waveform for mock scenes without user mic
 */
export function generateSyntheticWaveform(sampleCount = 48, seed = 1): number[] {
  return Array.from({ length: sampleCount }, (_, i) => {
    const factor = Math.sin((i + seed * 7) * 0.3) * Math.cos((i + seed * 3) * 0.2);
    const base = 0.15 + Math.abs(factor) * 0.75;
    return Math.min(1.0, Math.max(0.08, base));
  });
}
