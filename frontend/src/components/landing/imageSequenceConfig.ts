export interface ImageSequenceConfig {
  framePath: string;
  framePrefix: string;
  frameExtension: string;
  firstFrame: number;
  frameCount: number;
  padding: number;
  initialPreloadCount: number;
}

export const kallistoHeroSequenceConfig: ImageSequenceConfig = {
  framePath: "/images/kallisto-sequence",
  framePrefix: "ezgif-frame-",
  frameExtension: "jpg",
  firstFrame: 1,
  frameCount: 240,
  padding: 3,
  initialPreloadCount: 18,
};

export function getSequenceFrameUrl(config: ImageSequenceConfig, frameNumber: number): string {
  const paddedFrame = String(frameNumber).padStart(config.padding, "0");
  return `${config.framePath}/${config.framePrefix}${paddedFrame}.${config.frameExtension}`;
}
