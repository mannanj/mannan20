import Image from 'next/image';

export function Hero() {
  return (
    <div>
      <div className="mt-[50px] mb-5 relative flex flex-col items-start">
        <div className="w-[calc(100%+25px)] h-[100px] rounded-xl overflow-hidden relative -ml-[25px]">
          <Image src="/og-bg.jpg" width={800} height={200} alt="" className="w-full h-full object-cover absolute inset-0" priority />
          <h1 className="relative z-10 uppercase text-[2em] [text-shadow:0_0_10px_rgba(0,0,0,0.8)] m-0 leading-[1.2] text-white pt-3 pl-[25px]">
            Mannan
          </h1>
        </div>
        <div className="-mt-[30px] -ml-[5px] relative z-10 rounded-full border-[3px] border-[#0b0b0b]">
          <Image src="/mannan-profile.png" width={130} height={130} alt="Mannan" className="rounded-full" priority />
        </div>
      </div>
      <p className="m-0 leading-[1.6] text-white">
        Multi-disciplinary engineer specializing in advancing people through technology.
      </p>
    </div>
  );
}
