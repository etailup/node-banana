'use client';

import { useCallback } from 'react';

const MINIMUM_AUDIO_DURATION = 0.1;

interface AudioProcessingOptions {
  offset?: number;
  fadeIn?: number;
  fadeOut?: number;
}

interface AudioMixProgress {
  message: string;
  progress: number;
}

interface AudioData {
  buffer: AudioBuffer;
  duration: number;
}

interface UseAudioMixingReturn {
  prepareAudio: (
    audioBlob: Blob,
    videoDuration: number,
    onProgress?: (progress: AudioMixProgress) => void,
    options?: AudioProcessingOptions
  ) => Promise<AudioData | null>;
}

/**
 * Standalone async function to prepare audio for mixing with video.
 * Uses Web Audio API to decode standalone audio files (MP3, WAV, OGG, etc.).
 */
export async function prepareAudioAsync(
  audioBlob: Blob,
  videoDuration: number,
  onProgress?: (progress: AudioMixProgress) => void,
  options?: AudioProcessingOptions
): Promise<AudioData | null> {
  try {
    onProgress?.({ message: 'Loading audio file...', progress: 10 });
    const arrayBuffer = await audioBlob.arrayBuffer();

    onProgress?.({ message: 'Decoding audio...', progress: 30 });
    const audioContext = new AudioContext();
    let decoded: AudioBuffer;
    try {
      decoded = await audioContext.decodeAudioData(arrayBuffer);
    } finally {
      await audioContext.close();
    }

    const sampleRate = decoded.sampleRate;
    const channels = decoded.numberOfChannels;
    const targetDuration = Math.max(MINIMUM_AUDIO_DURATION, videoDuration);
    const totalSamples = Math.max(1, Math.floor(targetDuration * sampleRate));

    onProgress?.({ message: 'Processing audio...', progress: 60 });

    const mergedBuffer = new AudioBuffer({
      length: totalSamples,
      numberOfChannels: channels,
      sampleRate,
    });

    const offsetSeconds = options?.offset ?? 0;
    const offsetSamples = Math.floor(offsetSeconds * sampleRate);

    let writeOffset = 0;
    let sourceOffset = 0;

    if (offsetSamples > 0) {
      writeOffset = Math.min(offsetSamples, totalSamples);
    } else if (offsetSamples < 0) {
      sourceOffset = Math.abs(offsetSamples);
    }

    // Copy decoded audio into the target buffer
    const copyLength = Math.min(decoded.length - sourceOffset, totalSamples - writeOffset);
    if (copyLength > 0) {
      for (let channel = 0; channel < channels; channel++) {
        const sourceData = decoded.getChannelData(channel).subarray(sourceOffset, sourceOffset + copyLength);
        mergedBuffer.getChannelData(channel).set(sourceData, writeOffset);
      }
      writeOffset += copyLength;
    }

    // Loop audio to fill remaining duration if needed
    while (writeOffset < totalSamples) {
      const remaining = totalSamples - writeOffset;
      const loopLength = Math.min(decoded.length, remaining);
      for (let channel = 0; channel < channels; channel++) {
        const sourceData = decoded.getChannelData(channel).subarray(0, loopLength);
        mergedBuffer.getChannelData(channel).set(sourceData, writeOffset);
      }
      writeOffset += loopLength;
    }

    applyFades(mergedBuffer, options);
    onProgress?.({ message: 'Audio ready for mixing', progress: 95 });

    return {
      buffer: mergedBuffer,
      duration: totalSamples / sampleRate,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Audio mixing error:', error);
    throw new Error(`Failed to process audio: ${errorMessage}`);
  }
}

/**
 * React hook wrapper for prepareAudioAsync
 */
export const useAudioMixing = (): UseAudioMixingReturn => {
  const prepareAudio = useCallback(
    async (
      audioBlob: Blob,
      videoDuration: number,
      onProgress?: (progress: AudioMixProgress) => void,
      options?: AudioProcessingOptions
    ): Promise<AudioData | null> => {
      return prepareAudioAsync(audioBlob, videoDuration, onProgress, options);
    },
    []
  );

  return { prepareAudio };
};

export function applyFades(buffer: AudioBuffer, options?: { fadeIn?: number; fadeOut?: number }) {
  if (!options) return;
  const fadeInSeconds = Math.max(0, options.fadeIn ?? 0);
  const fadeOutSeconds = Math.max(0, options.fadeOut ?? 0);
  if (fadeInSeconds === 0 && fadeOutSeconds === 0) return;

  const totalSamples = buffer.length;
  if (totalSamples === 0) return;

  let fadeInSamples = Math.min(totalSamples, Math.floor(fadeInSeconds * buffer.sampleRate));
  let fadeOutSamples = Math.min(totalSamples, Math.floor(fadeOutSeconds * buffer.sampleRate));

  if (fadeInSamples + fadeOutSamples > totalSamples) {
    const scale = totalSamples / Math.max(1, fadeInSamples + fadeOutSamples);
    fadeInSamples = Math.floor(fadeInSamples * scale);
    fadeOutSamples = Math.floor(fadeOutSamples * scale);
  }

  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    if (fadeInSamples > 0) {
      for (let i = 0; i < fadeInSamples; i++) {
        channelData[i] *= i / fadeInSamples;
      }
    }
    if (fadeOutSamples > 0) {
      for (let i = 0; i < fadeOutSamples; i++) {
        const sampleIndex = totalSamples - fadeOutSamples + i;
        if (sampleIndex < 0 || sampleIndex >= totalSamples) continue;
        channelData[sampleIndex] *= (fadeOutSamples - i) / fadeOutSamples;
      }
    }
  }
}
