import Image from 'next/image';

export function Hero() {
  return (
    <div>
      <div className="my-5 relative flex flex-col items-start">
        <div className="absolute left-1/2 -translate-x-1/2 w-screen h-[200px] overflow-hidden">
          <Image src="/og-bg.jpg" width={1920} height={400} alt="" className="w-full h-full object-cover" priority />
        </div>
        <h1 className="relative z-10 uppercase text-[3em] [text-shadow:0_0_10px_rgba(0,0,0,0.8)] m-0 leading-[1.2] text-white pt-6">
          Mannan
        </h1>
        <div className="mt-4 relative z-10 rounded-full border-[3px] border-[#0b0b0b]">
          <Image src="/mannan-profile.png" width={150} height={150} alt="Mannan" className="rounded-full" priority />
        </div>
      </div>
      <p className="m-0 leading-[1.6] text-white">
        Multi-disciplinary engineer specializing in advancing people through technology.
      </p>
    </div>
  );
}
