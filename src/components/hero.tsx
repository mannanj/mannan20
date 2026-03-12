import Image from 'next/image';

export function Hero() {
  return (
    <div>
      <h1 className="uppercase text-[4em] [text-shadow:0_0_10px_rgba(3,155,229,0.5)] hover:[text-shadow:0_0_20px_rgba(3,155,229,0.8)] transition-[text-shadow] duration-300 ease-in-out m-0 leading-[1.2]">
        Mannan
      </h1>
      <div className="my-5 rounded-lg overflow-hidden">
        <Image src="/og-bg.jpg" width={1200} height={400} alt="" className="w-full h-auto object-cover rounded-lg" priority />
      </div>
      <p className="m-0 leading-[1.6] text-white">
        Multi-disciplinary engineer specializing in advancing people through technology.
      </p>
    </div>
  );
}
