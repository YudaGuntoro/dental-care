import Image from "next/image";

type YkkBrandProps = {
  compact?: boolean;
  inverted?: boolean;
  size?: "default" | "large";
  showTitle?: boolean;
};

export default function YkkBrand({
  compact = false,
  inverted = false,
  size = "default",
  showTitle = true,
}: YkkBrandProps) {
  const isLarge = size === "large" && !compact;
  const markSize = compact ? "size-12" : isLarge ? "size-24" : "size-16";
  const gapSize = isLarge ? "gap-5" : "gap-3";
  const titleSize = compact ? "text-sm" : isLarge ? "text-xl" : "text-base";
  const subtitleSize = isLarge ? "text-sm" : "text-xs";

  return (
    <div className={`flex items-center ${gapSize}`}>
      <div
        className={`flex shrink-0 items-center justify-center overflow-hidden ${markSize}`}
        aria-label="Dental Care logo"
      >
        <Image src="/dental-care-logo.png" alt="Dental Care logo" width={256} height={256} className="h-full w-full object-cover" priority={isLarge} />
      </div>
      {showTitle ? (
        <div className="min-w-0">
          <p className={`font-extrabold leading-tight ${inverted ? "text-white" : "text-[#0f766e]"} ${titleSize}`}>
            Dental Care
          </p>
          <p className={`font-medium ${inverted ? "text-white/75" : "text-slate-500"} ${subtitleSize}`}>Clinic Management</p>
        </div>
      ) : null}
    </div>
  );
}
