import Image from 'next/image';

export function HealthHeroPreview() {
  return (
    <div className="relative w-full h-full overflow-hidden rounded-md bg-[#0b0b0b]">
      <Image
        src="/images/health-hero-preview.png"
        alt=""
        fill
        sizes="(max-width: 640px) 33vw, 200px"
        className="object-cover"
        priority={false}
      />
    </div>
  );
}
