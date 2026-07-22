import type { ReactNode } from "react";
import { kallistoHeroSequenceConfig, type ImageSequenceConfig } from "./imageSequenceConfig";
import { useImageSequence } from "./useImageSequence";

interface ScrollImageSequenceProps {
  children: ReactNode;
  config?: ImageSequenceConfig;
}

export function ScrollImageSequence({
  children,
  config = kallistoHeroSequenceConfig,
}: ScrollImageSequenceProps) {
  const { canvasRef, sectionRef, firstFrameReady } = useImageSequence(config);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-[220vh] overflow-clip bg-[#07110d] md:min-h-[260vh]"
    >
      <div className="sticky top-0 min-h-screen overflow-hidden">
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full opacity-100"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_28%_28%,rgba(216,241,227,0.12),transparent_34%),linear-gradient(90deg,rgba(5,17,12,0.72)_0%,rgba(5,17,12,0.36)_42%,rgba(5,17,12,0.06)_100%),linear-gradient(180deg,rgba(5,17,12,0.16)_0%,rgba(5,17,12,0.06)_46%,rgba(5,17,12,0.42)_100%)]"
        />
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(20,90,67,0.26),transparent_42%)] transition-opacity duration-700 ${firstFrameReady ? "opacity-0" : "opacity-100"}`}
        />
        <div aria-hidden="true" className="landing-3d-scene pointer-events-none absolute inset-0 z-[1]">
          <div className="landing-3d-card landing-3d-card-a">
            <span className="landing-3d-card-line" />
            <span className="landing-3d-card-line landing-3d-card-line-short" />
          </div>
          <div className="landing-3d-ring landing-3d-ring-a" />
        </div>
        <div className="relative z-10 flex min-h-screen items-center">
          {children}
        </div>
      </div>
    </section>
  );
}
