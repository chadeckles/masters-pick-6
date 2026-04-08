import Image from "next/image";

interface MastersLogoProps {
  className?: string;
  width?: number;
  height?: number;
  showText?: boolean;
  spin?: boolean;
}

export default function MastersLogo({
  className = "",
  width = 120,
  height = 100,
}: MastersLogoProps) {
  return (
    <Image
      src="/masterspicksixlogo.png"
      alt="Masters Pick 6"
      width={width}
      height={height}
      className={className}
      priority
      style={{ width: "auto", height: "auto" }}
    />
  );
}

