import { QuickCheck } from "@/components/QuickCheck";
import Image from "next/image";

export default function HomePage() {
  return (
    <div className="shell">
      <header className="masthead">
        <Image
          className="brand-logo"
          src="/assets/mystudy/logo-horizontal.svg"
          alt="myStudy"
          width={491}
          height={114}
          priority
        />
        <span className="study-code">NOVA-301 · Fictional study</span>
      </header>
      <main>
        <section className="hero">
          <p className="eyebrow">Clinical research opportunity</p>
          <h1>A research study for difficult-to-treat depression</h1>
          <p className="lede">
            Researchers are studying an investigational treatment for adults
            whose depression has not improved with previous treatments.
          </p>
        </section>
        <section className="card" aria-label="Study quick check">
          <div className="card-header">
            <h2>Could this study be relevant to you?</h2>
            <p>The quick check takes about one minute.</p>
          </div>
          <QuickCheck />
        </section>
      </main>
    </div>
  );
}
