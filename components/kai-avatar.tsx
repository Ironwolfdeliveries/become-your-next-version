import Image from "next/image";

export function KaiAvatar({ className = "" }: { className?: string }) {
  return <span className={`kai-mark kai-avatar ${className}`.trim()} aria-hidden="true"><Image src="/images/kai-approved-face.webp" width={250} height={250} alt="" priority={false} /></span>;
}
