import { useCallback, useEffect, useRef, useState } from "react";
import { getSequenceFrameUrl, type ImageSequenceConfig } from "./imageSequenceConfig";

const maxDevicePixelRatio = 2;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function drawImageCover(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  canvasWidth: number,
  canvasHeight: number,
) {
  const scale = Math.max(canvasWidth / image.naturalWidth, canvasHeight / image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  const x = (canvasWidth - width) / 2;
  const y = (canvasHeight - height) / 2;

  context.clearRect(0, 0, canvasWidth, canvasHeight);
  context.drawImage(image, x, y, width, height);
}

function getCanvasContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D | null {
  try {
    return canvas.getContext("2d");
  } catch {
    return null;
  }
}

function hasReducedMotionPreference(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function useImageSequence(config: ImageSequenceConfig) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);
  const imagesRef = useRef(new Map<number, HTMLImageElement>());
  const requestedFramesRef = useRef(new Set<number>());
  const failedFramesRef = useRef(new Set<number>());
  const currentFrameRef = useRef(config.firstFrame);
  const smoothedFrameRef = useRef(config.firstFrame);
  const renderedFrameRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const reducedMotionRef = useRef(false);
  const [firstFrameReady, setFirstFrameReady] = useState(false);

  const lastFrame = config.firstFrame + config.frameCount - 1;

  const drawFrame = useCallback((frameNumber: number) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const image = imagesRef.current.get(frameNumber);
    if (!image || !image.complete || !image.naturalWidth) {
      return;
    }

    const context = getCanvasContext(canvas);
    if (!context) {
      return;
    }

    const bounds = canvas.getBoundingClientRect();
    const canvasWidth = bounds.width || window.innerWidth;
    const canvasHeight = bounds.height || window.innerHeight;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, maxDevicePixelRatio);
    const targetWidth = Math.round(canvasWidth * pixelRatio);
    const targetHeight = Math.round(canvasHeight * pixelRatio);

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
    }

    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawImageCover(context, image, canvasWidth, canvasHeight);
    renderedFrameRef.current = frameNumber;
    canvas.dataset.renderedFrame = String(frameNumber);
  }, []);

  const findNearestLoadedFrame = useCallback((targetFrame: number): number | null => {
    if (imagesRef.current.has(targetFrame)) {
      return targetFrame;
    }

    for (let offset = 1; offset < config.frameCount; offset += 1) {
      const previous = targetFrame - offset;
      const next = targetFrame + offset;

      if (previous >= config.firstFrame && imagesRef.current.has(previous)) {
        return previous;
      }

      if (next <= lastFrame && imagesRef.current.has(next)) {
        return next;
      }
    }

    return null;
  }, [config.firstFrame, config.frameCount, lastFrame]);

  const renderNearestFrame = useCallback((targetFrame: number) => {
    const fallbackFrame = findNearestLoadedFrame(targetFrame);
    if (fallbackFrame === null || renderedFrameRef.current === fallbackFrame) {
      return;
    }

    drawFrame(fallbackFrame);
  }, [drawFrame, findNearestLoadedFrame]);

  const loadFrame = useCallback((frameNumber: number, highPriority = false) => {
    if (
      frameNumber < config.firstFrame ||
      frameNumber > lastFrame ||
      imagesRef.current.has(frameNumber) ||
      requestedFramesRef.current.has(frameNumber) ||
      failedFramesRef.current.has(frameNumber)
    ) {
      return;
    }

    requestedFramesRef.current.add(frameNumber);
    const image = new Image();
    image.decoding = "async";
    image.loading = highPriority ? "eager" : "lazy";
    image.fetchPriority = highPriority ? "high" : "low";

    image.onload = () => {
      imagesRef.current.set(frameNumber, image);
      if (frameNumber === config.firstFrame) {
        setFirstFrameReady(true);
      }
      renderNearestFrame(Math.round(smoothedFrameRef.current));
    };

    image.onerror = () => {
      failedFramesRef.current.add(frameNumber);
      if (import.meta.env.DEV) {
        console.warn(`Kallisto image sequence frame failed to load: ${getSequenceFrameUrl(config, frameNumber)}`);
      }
    };

    image.src = getSequenceFrameUrl(config, frameNumber);
  }, [config, lastFrame, renderNearestFrame]);

  const loadFramesAround = useCallback((frameNumber: number) => {
    const radius = window.innerWidth < 768 ? 2 : 4;

    loadFrame(frameNumber, true);
    for (let offset = 1; offset <= radius; offset += 1) {
      loadFrame(frameNumber - offset, true);
      loadFrame(frameNumber + offset, true);
    }
  }, [loadFrame]);

  const updateFrameFromScroll = useCallback(() => {
    const section = sectionRef.current;
    if (!section) {
      return;
    }

    if (reducedMotionRef.current) {
      const staticFrame = config.firstFrame + Math.floor((config.frameCount - 1) / 2);
      currentFrameRef.current = staticFrame;
      loadFrame(staticFrame, true);
      renderNearestFrame(staticFrame);
      return;
    }

    const scrollableDistance = Math.max(section.offsetHeight - window.innerHeight, 1);
    const progress = clamp(-section.getBoundingClientRect().top / scrollableDistance, 0, 1);
    const frameNumber = config.firstFrame + Math.round(progress * (config.frameCount - 1));
    const frameDelta = frameNumber - smoothedFrameRef.current;
    smoothedFrameRef.current += frameDelta * 0.16;

    if (Math.abs(frameDelta) < 0.35) {
      smoothedFrameRef.current = frameNumber;
    }

    const renderedFrameNumber = clamp(
      Math.round(smoothedFrameRef.current),
      config.firstFrame,
      lastFrame,
    );

    currentFrameRef.current = frameNumber;
    loadFramesAround(frameNumber);
    loadFramesAround(renderedFrameNumber);
    renderNearestFrame(renderedFrameNumber);
  }, [config.firstFrame, config.frameCount, lastFrame, loadFramesAround, loadFrame, renderNearestFrame]);

  useEffect(() => {
    reducedMotionRef.current = hasReducedMotionPreference();
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleMotionChange = () => {
      reducedMotionRef.current = motionQuery.matches;
      updateFrameFromScroll();
    };

    motionQuery.addEventListener("change", handleMotionChange);
    return () => motionQuery.removeEventListener("change", handleMotionChange);
  }, [updateFrameFromScroll]);

  useEffect(() => {
    if (reducedMotionRef.current) {
      const staticFrame = config.firstFrame + Math.floor((config.frameCount - 1) / 2);
      loadFrame(staticFrame, true);
      return;
    }

    loadFrame(config.firstFrame, true);

    const earlyFrameCount = Math.min(config.initialPreloadCount, config.frameCount);
    for (let offset = 1; offset < earlyFrameCount; offset += 1) {
      loadFrame(config.firstFrame + offset, true);
    }

    const keyframeCount = Math.min(window.innerWidth < 768 ? 16 : 32, config.frameCount);
    for (let index = 0; index < keyframeCount; index += 1) {
      const progress = keyframeCount === 1 ? 0 : index / (keyframeCount - 1);
      const frameNumber = config.firstFrame + Math.round(progress * (config.frameCount - 1));
      loadFrame(frameNumber, true);
    }

    let cancelled = false;
    let nextFrame = config.firstFrame + earlyFrameCount;
    const batchSize = window.innerWidth < 768 ? 3 : 6;

    const preloadBatch = () => {
      if (cancelled) {
        return;
      }

      for (let count = 0; count < batchSize && nextFrame <= lastFrame; count += 1) {
        loadFrame(nextFrame);
        nextFrame += 1;
      }

      if (nextFrame <= lastFrame) {
        window.setTimeout(preloadBatch, 40);
      }
    };

    window.setTimeout(preloadBatch, 120);
    return () => {
      cancelled = true;
    };
  }, [config.firstFrame, config.frameCount, config.initialPreloadCount, lastFrame, loadFrame]);

  useEffect(() => {
    let cancelled = false;
    const tick = () => {
      updateFrameFromScroll();
      if (!cancelled) {
        animationFrameRef.current = window.requestAnimationFrame(tick);
      }
    };

    animationFrameRef.current = window.requestAnimationFrame(tick);
    window.addEventListener("resize", updateFrameFromScroll);

    return () => {
      cancelled = true;
      window.removeEventListener("resize", updateFrameFromScroll);
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [updateFrameFromScroll]);

  return {
    canvasRef,
    sectionRef,
    firstFrameReady,
  };
}
