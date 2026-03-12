'use client';

import { scrollToSection } from '@/lib/utils';

export function Hero() {
  return (
    <div>
      <h1 className="uppercase text-[4em] [text-shadow:0_0_10px_rgba(3,155,229,0.5)] hover:[text-shadow:0_0_20px_rgba(3,155,229,0.8)] transition-[text-shadow] duration-300 ease-in-out m-0 leading-[1.2]">
        Mannan
      </h1>
      <hr className="border-0 h-0.5 bg-gradient-to-r from-transparent via-[#039be5] to-transparent my-5" />
      <p className="m-0 leading-[1.6] text-white">
        Multi-disciplinary engineer specializing in advancing people through technology.
      </p>
      <button onClick={() => scrollToSection('about')} className="nav-button mt-[25px]">
        About me
      </button>
    </div>
  );
}
