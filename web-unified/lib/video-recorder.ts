/**
 * In-browser Video & Audio Muxer
 * Records HTML5 Canvas via MediaStream + Web Audio API Destination
 * Produces downloadable WebM/MP4 video files and companion .srt subtitles
 */

import { StoryboardProject, StoryboardScene } from './types';

export interface RenderProgressUpdate {
  phase: 'preparing' | 'recording' | 'encoding' | 'completed' | 'error';
  progress: number; // 0 to 100
  elapsedSec: number;
  message: string;
}

export interface RenderedVideoResult {
  videoBlob: Blob;
  videoUrl: string;
  srtContent: string;
  format: 'webm' | 'mp4';
}

/**
 * Generate standard SubRip (.srt) subtitle content from scenes
 */
export function generateSRTContent(scenes: StoryboardScene[]): string {
  let srt = '';
  let currentTime = 0;

  scenes.forEach((scene, index) => {
    const startTime = currentTime;
    const endTime = currentTime + scene.duration;
    currentTime = endTime;

    const formatSRTTime = (seconds: number) => {
      const hrs = Math.floor(seconds / 3600).toString().padStart(2, '0');
      const mins = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
      const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
      const millis = Math.floor((seconds % 1) * 1000).toString().padStart(3, '0');
      return `${hrs}:${mins}:${secs},${millis}`;
    };

    srt += `${index + 1}\n`;
    srt += `${formatSRTTime(startTime)} --> ${formatSRTTime(endTime)}\n`;
    srt += `${scene.voiceover || scene.headline}\n\n`;
  });

  return srt;
}

/**
 * Triggers browser download for any blob
 */
export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Record a live canvas element for a specific duration in seconds
 */
export async function recordCanvasToVideo(
  canvas: HTMLCanvasElement,
  totalDurationSec: number,
  onProgress?: (update: RenderProgressUpdate) => void
): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      if (!canvas || typeof canvas.captureStream !== 'function') {
        throw new Error('Canvas captureStream is not supported in this browser.');
      }

      onProgress?.({
        phase: 'preparing',
        progress: 5,
        elapsedSec: 0,
        message: 'Initializing Canvas stream capture...',
      });

      // 30 FPS stream
      const videoStream = canvas.captureStream(30);

      // Create Web Audio synth audio track to ensure audio sync
      let combinedStream: MediaStream = videoStream;
      let audioCtx: AudioContext | null = null;

      try {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioContextClass) {
          audioCtx = new AudioContextClass();
          const dest = audioCtx.createMediaStreamDestination();
          
          // Add a subtle pleasant background drone/chime track
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(220, audioCtx.currentTime);
          gain.gain.setValueAtTime(0.015, audioCtx.currentTime); // very low level backing tone
          osc.connect(gain);
          gain.connect(dest);
          osc.start();

          // Mix audio tracks
          const audioTracks = dest.stream.getAudioTracks();
          if (audioTracks.length > 0) {
            combinedStream = new MediaStream([
              ...videoStream.getVideoTracks(),
              ...audioTracks,
            ]);
          }
        }
      } catch (e) {
        console.warn('Audio context mix failed, falling back to silent video track:', e);
      }

      // Check supported mime types
      let mimeType = 'video/webm;codecs=vp9,opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp8,opus';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/mp4';
      }

      const recorder = new MediaRecorder(combinedStream, {
        mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : undefined,
        videoBitsPerSecond: 4_500_000, // 4.5 Mbps for crisp stickman lines
      });

      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      const startTime = Date.now();
      const intervalMs = 200;
      const targetDurationMs = totalDurationSec * 1000;

      const progressInterval = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        const pct = Math.min(95, Math.round((elapsed / totalDurationSec) * 90) + 5);

        onProgress?.({
          phase: 'recording',
          progress: pct,
          elapsedSec: Math.round(elapsed * 10) / 10,
          message: `Capturing frames & muxing audio... ${Math.round(elapsed)}s / ${Math.round(totalDurationSec)}s`,
        });
      }, intervalMs);

      recorder.onstop = () => {
        clearInterval(progressInterval);
        if (audioCtx) {
          audioCtx.close().catch(() => {});
        }

        onProgress?.({
          phase: 'encoding',
          progress: 98,
          elapsedSec: totalDurationSec,
          message: 'Finalizing video container mux...',
        });

        const finalBlob = new Blob(chunks, { type: recorder.mimeType || 'video/webm' });

        onProgress?.({
          phase: 'completed',
          progress: 100,
          elapsedSec: totalDurationSec,
          message: 'Video rendering complete!',
        });

        resolve(finalBlob);
      };

      recorder.start(100);

      // Stop recorder once duration expires
      setTimeout(() => {
        if (recorder.state === 'recording') {
          recorder.stop();
        }
      }, targetDurationMs);
    } catch (err) {
      console.error('Video recording failed:', err);
      onProgress?.({
        phase: 'error',
        progress: 0,
        elapsedSec: 0,
        message: err instanceof Error ? err.message : 'Unknown recording error',
      });
      resolve(null);
    }
  });
}
