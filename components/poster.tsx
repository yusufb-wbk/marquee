import Image from "next/image";

export function Poster({
  src,
  title,
  size = "small",
}: {
  src: string | null;
  title: string;
  size?: "small" | "large" | "rail";
}) {
  const frame =
    size === "large"
      ? "w-36 sm:w-48"
      : size === "rail"
        ? "w-full"
        : "w-16 shrink-0 sm:w-20";

  if (!src) {
    return (
      <div
        aria-hidden="true"
        className={`${frame} grid aspect-[2/3] place-items-center rounded-xl bg-background text-center text-xs text-muted`}
      >
        No poster
      </div>
    );
  }

  return (
    <div className={`relative ${frame} aspect-[2/3] overflow-hidden rounded-xl bg-background`}>
      <Image
        src={src}
        alt=""
        fill
        sizes={size === "large" ? "192px" : "80px"}
        className="object-cover"
      />
      <span className="sr-only">{title} poster</span>
    </div>
  );
}
