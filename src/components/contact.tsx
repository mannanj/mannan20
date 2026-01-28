'use client';

import { useApp } from '@/context/app-context';
import { scrollToSection } from '@/lib/utils';

export function Contact() {
  const { openContactModal } = useApp();

  return (
    <div className="pb-[100px]">
      <h1 className="text-end uppercase text-[4em] [text-shadow:0_0_10px_rgba(3,155,229,0.5)] hover:[text-shadow:0_0_20px_rgba(3,155,229,0.8)] transition-[text-shadow] duration-300 ease-in-out m-0 leading-[1.2]">
        Contact
      </h1>
      <hr className="border-0 h-0.5 bg-gradient-to-r from-transparent via-[#039be5] to-transparent my-5" />
      <div className="contact-grid">
        <div className="flex flex-col">
          <a className="text-base tracking-wide text-[#039be5] no-underline cursor-pointer transition-colors duration-300 ease-in-out hover:text-[#4fc3f7]" onClick={openContactModal} title="Request contact info">
            *****&#64;mannan.is
          </a>
          <a className="text-base tracking-wide text-[#039be5] no-underline cursor-pointer transition-colors duration-300 ease-in-out hover:text-[#4fc3f7]" onClick={openContactModal} title="Request contact info">
            +1 (***) *** 8302
          </a>
          <span className="text-base text-white">Alexandria, Virginia</span>
          <button onClick={() => scrollToSection('home')} className="nav-button mt-[25px]">
            Back to Top
          </button>
        </div>
        <div className="ripple-container" onClick={openContactModal} title="Request contact info">
          <div className="circle" />
        </div>
      </div>
    </div>
  );
}
