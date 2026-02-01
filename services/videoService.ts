import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { MediaFile, RenderQuality, RenderResolution } from '../types';

let ffmpeg: FFmpeg | null = null;

/**
 * Initializes the FFmpeg instance. This function must be called before any other
 * video processing functions. It loads the FFmpeg core and sets up the logger.
 * @param onLog A callback function to receive log messages from FFmpeg.
 * @returns A promise that resolves when FFmpeg is loaded.
 */
export const init = async (onLog: (message: string) => void): Promise<void> => {
  if (ffmpeg && ffmpeg.loaded) {
    onLog('FFmpeg is already loaded.');
    return;
  }
  
  ffmpeg = new FFmpeg();
  
  ffmpeg.on('log', ({ message }) => {
    onLog(message);
  });

  onLog('Loading FFmpeg core...');
  
  // URL to the FFmpeg core files
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/ffmpeg-core.js';

  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    workerURL: await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, 'text/javascript'),
  });
  
  onLog('FFmpeg core loaded successfully.');
};

/**
 * Trims a video file to the specified start and end times.
 * @param file The media file to trim.
 * @param startTime The start time in seconds.
 * @param endTime The end time in seconds.
 * @param onProgress A callback function to report progress.
 * @returns A Blob of the trimmed MP4 video.
 */
export const trimVideo = async (
    file: MediaFile,
    startTime: number,
    endTime: number,
    onProgress: (progress: number) => void
): Promise<Blob> => {
  if (!ffmpeg || !ffmpeg.loaded) {
    throw new Error('FFmpeg is not loaded. Please call init() first.');
  }

  ffmpeg.on('progress', ({ progress }) => {
    onProgress(Math.round(progress * 100));
  });

  const inputFileName = `input.${file.name.split('.').pop()}`;
  const outputFileName = `output.mp4`;

  await ffmpeg.writeFile(inputFileName, await fetchFile(file.data));
  
  // FFmpeg command to trim the video
  await ffmpeg.exec([
    '-i', inputFileName,
    '-ss', String(startTime),
    '-to', String(endTime),
    '-c', 'copy', // Use stream copy to avoid re-encoding, which is much faster
    outputFileName
  ]);

  const data = await ffmpeg.readFile(outputFileName);
  
  // Cleanup files from FFmpeg's virtual file system
  await ffmpeg.deleteFile(inputFileName);
  await ffmpeg.deleteFile(outputFileName);

  return new Blob([data], { type: 'video/mp4' });
};

/**
 * Splits a video file into two parts at a given timestamp. This operation is fast
 * as it avoids re-encoding, but the split point may not be frame-accurate.
 * @param file The media file to split.
 * @param splitTime The time in seconds at which to split the video.
 * @param onProgress A callback function to report progress messages.
 * @returns An array of two Blobs for the split video parts.
 */
export const splitVideo = async (
    file: MediaFile,
    splitTime: number,
    onProgress: (message: string) => void
): Promise<Blob[]> => {
  if (!ffmpeg || !ffmpeg.loaded) {
    throw new Error('FFmpeg is not loaded. Please call init() first.');
  }

  const inputFileName = `input.${file.name.split('.').pop() || 'mp4'}`;
  const outputFileName1 = `output1.mp4`;
  const outputFileName2 = `output2.mp4`;

  await ffmpeg.writeFile(inputFileName, await fetchFile(file.data));
  
  onProgress('Processing part 1...');
  await ffmpeg.exec([
    '-i', inputFileName,
    '-t', String(splitTime),
    '-c', 'copy',
    outputFileName1
  ]);

  onProgress('Processing part 2...');
  await ffmpeg.exec([
    '-i', inputFileName,
    '-ss', String(splitTime),
    '-c', 'copy',
    outputFileName2
  ]);

  const data1 = await ffmpeg.readFile(outputFileName1);
  const data2 = await ffmpeg.readFile(outputFileName2);
  
  await ffmpeg.deleteFile(inputFileName);
  await ffmpeg.deleteFile(outputFileName1);
  await ffmpeg.deleteFile(outputFileName2);

  return [
    new Blob([data1], { type: 'video/mp4' }),
    new Blob([data2], { type: 'video/mp4' })
  ];
};

export type VideoFilter = 
    | { name: 'brightness', value: number }
    | { name: 'contrast', value: number }
    | { name: 'sepia' }
    | { name: 'grayscale' }
    | { name: 'blur', value: number }
    | { name: 'sharpen' };

/**
 * Applies a video filter to a file. This operation requires re-encoding and may take time.
 * @param file The media file to apply the filter to.
 * @param filter The filter to apply.
 * @param onProgress A callback to report progress percentage.
 * @returns A Blob of the filtered MP4 video.
 */
export const applyVideoFilter = async (
    file: MediaFile,
    filter: VideoFilter,
    onProgress: (progress: number) => void
): Promise<Blob> => {
    if (!ffmpeg || !ffmpeg.loaded) {
        throw new Error('FFmpeg is not loaded. Please call init() first.');
    }

    ffmpeg.on('progress', ({ progress }) => {
        onProgress(Math.round(progress * 100));
    });

    const inputFileName = `input.${file.name.split('.').pop() || 'mp4'}`;
    const outputFileName = `output.mp4`;

    await ffmpeg.writeFile(inputFileName, await fetchFile(file.data));

    let filterComplex = '';
    switch (filter.name) {
        case 'brightness':
            filterComplex = `eq=brightness=${filter.value}`; // Value between -1.0 and 1.0
            break;
        case 'contrast':
            filterComplex = `eq=contrast=${filter.value}`; // Value between -2.0 and 2.0
            break;
        case 'sepia':
            filterComplex = 'colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131';
            break;
        case 'grayscale':
            filterComplex = 'format=gray';
            break;
        case 'blur':
            filterComplex = `gblur=sigma=${filter.value}`; // Higher sigma is more blur
            break;
        case 'sharpen':
            filterComplex = 'unsharp=5:5:1.0:5:5:0.0';
            break;
    }

    await ffmpeg.exec([
        '-i', inputFileName,
        '-vf', filterComplex,
        outputFileName
    ]);

    const data = await ffmpeg.readFile(outputFileName);

    await ffmpeg.deleteFile(inputFileName);
    await ffmpeg.deleteFile(outputFileName);

    return new Blob([data], { type: 'video/mp4' });
};

/**
 * Exports a video to a new resolution. This requires re-encoding.
 * @param file The media file to export.
 * @param resolution The target vertical resolution ('720p' or '1080p').
 * @param onProgress A callback to report progress percentage.
 * @returns A Blob of the exported MP4 video.
 */
export const exportVideo = async (
    file: MediaFile,
    resolution: '720p' | '1080p',
    onProgress: (progress: number) => void
): Promise<Blob> => {
    if (!ffmpeg || !ffmpeg.loaded) {
        throw new Error('FFmpeg is not loaded. Please call init() first.');
    }

    ffmpeg.on('progress', ({ progress }) => {
        onProgress(Math.round(progress * 100));
    });

    const inputFileName = `input.${file.name.split('.').pop() || 'mp4'}`;
    const outputFileName = `output.mp4`;

    await ffmpeg.writeFile(inputFileName, await fetchFile(file.data));

    const height = resolution === '720p' ? 720 : 1080;
    // Assume 16:9 aspect ratio for these simple presets
    const width = Math.round(height * (16 / 9));

    await ffmpeg.exec([
        '-i', inputFileName,
        // Scale and pad to fit the target 16:9 frame
        '-vf', `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:-1:-1:color=black,format=yuv420p`,
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-crf', '23', // Medium quality
        '-c:a', 'aac', // Re-encode audio
        '-movflags', '+faststart',
        outputFileName
    ]);

    const data = await ffmpeg.readFile(outputFileName);

    await ffmpeg.deleteFile(inputFileName);
    await ffmpeg.deleteFile(outputFileName);

    return new Blob([data], { type: 'video/mp4' });
};

/**
 * Renders a timeline of video clips into a single video file with specified resolution and quality.
 * This function re-encodes all clips and handles different aspect ratios by padding.
 * @param files An array of media files to merge in order.
 * @param resolution The target resolution for the output video.
 * @param quality The desired quality ('Low', 'Medium', 'High').
 * @param onProgress A callback to report progress percentage.
 * @returns A Blob of the rendered MP4 video.
 */
export const renderTimeline = async (
    files: MediaFile[],
    resolution: RenderResolution,
    quality: RenderQuality,
    onProgress: (progress: number) => void
): Promise<Blob> => {
    if (!ffmpeg || !ffmpeg.loaded) {
        throw new Error('FFmpeg is not loaded. Please call init() first.');
    }

    ffmpeg.on('progress', ({ progress }) => {
        onProgress(Math.round(progress * 100));
    });

    const [width, height] = resolution.split('x').map(Number);
    
    const qualityMap = {
        Low: 28,
        Medium: 23,
        High: 18,
    };
    const crf = qualityMap[quality];

    const inputPaths: string[] = [];
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const inputFileName = `input${i}.${file.name.split('.').pop() || 'mp4'}`;
        await ffmpeg.writeFile(inputFileName, await fetchFile(file.data));
        inputPaths.push(inputFileName);
    }

    const concatFileContent = inputPaths.map(path => `file '${path}'`).join('\n');
    await ffmpeg.writeFile('concat.txt', new TextEncoder().encode(concatFileContent));

    await ffmpeg.exec([
        '-f', 'concat',
        '-safe', '0',
        '-i', 'concat.txt',
        // Video filtergraph: scale and pad to fit target resolution without stretching
        '-vf', `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:-1:-1:color=black,format=yuv420p`,
        '-c:v', 'libx264',
        '-preset', 'veryfast', // Good balance for speed/compression in browser
        '-crf', String(crf),
        '-c:a', 'aac',
        '-movflags', '+faststart', // Important for web video
        'output.mp4'
    ]);

    const data = await ffmpeg.readFile('output.mp4');

    // Cleanup
    for (const path of inputPaths) {
        await ffmpeg.deleteFile(path);
    }
    await ffmpeg.deleteFile('concat.txt');
    await ffmpeg.deleteFile('output.mp4');

    return new Blob([data], { type: 'video/mp4' });
};


/**
 * Checks if the FFmpeg library is loaded.
 * @returns True if loaded, false otherwise.
 */
export const isLoaded = (): boolean => {
    return !!ffmpeg && ffmpeg.loaded;
}