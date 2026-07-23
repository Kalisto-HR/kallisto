import { cn } from "../ui/utils";

interface BrandLogoProps {
  alt?: string;
  className?: string;
  imageClassName?: string;
}

export function BrandLogo({ alt = "Kallisto", className, imageClassName }: BrandLogoProps) {
  return (
    <div className={cn("overflow-hidden rounded-2xl bg-[#051321] shadow-sm", className)}>
      <img
        src="/kallisto-logo.png?v=20260723-platform"
        alt={alt}
        className={cn("h-full w-full object-cover", imageClassName)}
      />
    </div>
  );
}
