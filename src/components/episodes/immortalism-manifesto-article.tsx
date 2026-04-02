'use client';

import { useState, useCallback, lazy, Suspense } from 'react';

const AudioPlayer = lazy(() => import('./audio-player'));

const X_ICON = (
  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

export default function ImmortalismManifestoArticle() {
  const [showPlayer, setShowPlayer] = useState(false);
  const [playerStatus, setPlayerStatus] = useState<'loading' | 'playing' | 'paused'>('loading');
  const handleStatusChange = useCallback((status: 'loading' | 'playing' | 'paused') => {
    setPlayerStatus(status);
  }, []);

  return (
    <>
      <header className="mb-16">
        <h1 className="mb-4 text-4xl font-light tracking-tight">Immortalism Manifesto</h1>
        <p className="mb-6 text-sm text-neutral-500">
          March 20th, 7:46 am &middot; Spring Equinox
        </p>
        <div className="flex items-center gap-4">
          <a
            href="https://x.com/bryan_johnson/status/2035005465109963115"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-neutral-400 transition-colors hover:text-white"
          >
            {X_ICON}
            Bryan Johnson
          </a>
          <a
            href="/data/documents/immortalism-manifesto.pdf"
            target="_blank"
            rel="noopener noreferrer"
            data-testid="audio-download-pdf"
            className="inline-flex items-center text-[#039be5] hover:text-[#4fc3f7] text-[11px] font-normal bg-transparent border-none cursor-pointer p-0 no-underline transition-all duration-200 hover:scale-110 active:scale-95 whitespace-nowrap"
          >
            Download PDF <span className="inline-block ml-0.5 text-[20px] rotate-180 scale-x-[-1]">&#10555;</span>
          </a>
          {showPlayer && playerStatus === 'loading' ? (
            <span className="relative inline-flex items-center h-[18px] w-[90px] rounded-sm overflow-hidden bg-white/10">
              <span className="absolute inset-0 bg-white/10 animate-[fillBar_2s_ease-in-out_infinite]" />
              <span className="relative z-10 flex items-center gap-1 mx-auto text-white text-[10px]" style={{ textShadow: '0 0 3px #000, 0 0 6px #000' }}>
                <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.25" />
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                Downloading
              </span>
            </span>
          ) : showPlayer && playerStatus === 'playing' ? (
            <span className="inline-flex items-center gap-1.5 text-white text-[11px] font-normal whitespace-nowrap">
              Playing
              <svg className="w-3 h-3" viewBox="0 0 20 16" fill="currentColor">
                <rect className="animate-[waveform_2.4s_ease-in-out_infinite]" x="0" y="6" width="2" rx="1" height="4" />
                <rect className="animate-[waveform_1.8s_ease-in-out_infinite_0.3s]" x="4" y="3" width="2" rx="1" height="10" />
                <rect className="animate-[waveform_2.1s_ease-in-out_infinite_0.6s]" x="8" y="1" width="2" rx="1" height="14" />
                <rect className="animate-[waveform_1.5s_ease-in-out_infinite_0.45s]" x="12" y="4" width="2" rx="1" height="8" />
                <rect className="animate-[waveform_2.7s_ease-in-out_infinite_0.15s]" x="16" y="5" width="2" rx="1" height="6" />
              </svg>
            </span>
          ) : (
            <button
              onClick={() => setShowPlayer(true)}
              data-testid="audio-listen-btn"
              className="inline-flex items-center gap-1 text-[#039be5] hover:text-[#4fc3f7] text-[11px] font-normal bg-transparent border-none cursor-pointer p-0 no-underline transition-all duration-200 hover:scale-110 active:scale-95 whitespace-nowrap"
            >
              <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
              Listen
            </button>
          )}
        </div>
      </header>

      <div className="space-y-6 text-[15px] leading-relaxed text-neutral-300">
        <p>For most of the history of life on Earth, death has been treated as inevitable. Every organism is born, struggles briefly against decay, and eventually dissolves back into the disorder from which it emerged. Civilizations have accepted this pattern as a law of existence. Bodies age. Systems fail. Entropy wins. Yet humanity has never truly accepted this conclusion. Across thousands of years and across nearly every civilization, the idea of immortality has appeared again and again. The dream that life might continue indefinitely has haunted the imagination of our species since the beginning of recorded history.</p>

        <p>The ancient Egyptians built pyramids not simply as monuments but as gateways to eternity. They believed that life did not end with the body, that the &ldquo;soul&rdquo; could travel beyond death and persist forever. Their Book of the Dead described rituals meant to guide the deceased into an immortal state. These rituals were essentially technologies of immortality in the Egyptian worldview, procedures meant to preserve identity, consciousness, and life after death. Thousands of years before modern medicine, before biology, before even the scientific method, an entire civilization organized itself around the possibility that life might continue indefinitely. In Mesopotamia, one of the oldest stories humanity ever wrote tells the same tale. In the Epic of Gilgamesh, a king travels across deserts and oceans searching for the secret of eternal life. His journey is not merely a mythological adventure. It is a reflection of something deeper in human consciousness: a refusal to believe that death must be final. Daoist thought went further, imagining the possibility of becoming immortal not merely in memory, but in being. Through harmony with the natural order, one might move beyond decay altogether, joining a timeless reality beyond the visible world.</p>

        <p>Religious traditions across the world carried the same idea forward. In the Hebrew Bible and the Christian scriptures, immortality appears again and again as a promise of existence beyond death. The Book of Daniel declares that &ldquo;many of those who sleep in the dust of the earth shall awake, some to everlasting life&rdquo;, a future resurrection where the dead (&ldquo;those who sleep in the dust of the earth&rdquo;) will awaken to face judgment, resulting in either everlasting life or everlasting contempt. The Gospel of John proclaims that &ldquo;whoever believes in him shall not perish but have eternal life.&rdquo; For millennia, billions of people have believed that life does not end.</p>

        <p>What is remarkable about this long history is not that humans believed in immortality. What is remarkable is that those beliefs existed in a world where the mechanisms of life were completely unknown. For thousands of years, the dream of eternal life belonged to faith, mythology, and theology. The possibility of immortality lived entirely within the domain of faith for over millennia. For thousands of years, the majority of humanity has believed that death is not the final state of existence. Today roughly two-thirds of the global population believes in some form of life after death. What was once sustained by faith alone may now be approached through science, technology, and the deliberate engineering of biological systems.</p>

        <p className="text-xl font-light text-white">Humanity already believes in immortality and that it is achievable.</p>

        <p>For the first time in the history of life on Earth, a species is beginning to understand the physical processes that produce aging and death. Advances in molecular biology, genetics, computational modeling, and artificial intelligence are revealing that aging is not a mystical boundary written into the fabric of existence. It is a biological process. Cells accumulate damage. DNA mutates. Proteins misfold. Repair systems weaken over time. Eventually the organism can no longer maintain the complex structures that sustain life. In other words, death is not magic. It is a systems failure and systems can be engineered.</p>

        <p>Life itself is a thermodynamic process. Living organisms survive by continuously resisting entropy. Cells detect damage and repair it. Proteins fold into precise shapes. Biological systems constantly monitor themselves and correct errors. As long as this repair process continues, life persists. When it fails, decay begins. What we call death is simply the moment when repair falls behind entropy. This realization changes everything. If death is the result of biological systems failing to maintain themselves, then the boundary between life and death is not metaphysical. It is technical. It is a problem of energy, information, and repair. The dream of immortality, once confined to faith, begins to look like an engineering challenge. In its simplest form, the condition for life can be expressed as: where the total capacity to repair, maintain, and restore the system A(t) must remain greater than or equal to the forces that degrade it B(t). Life persists only as long as the systems that repair it are stronger than the forces that degrade it. The dream of immortality, once confined to faith, begins to look like an engineering challenge.</p>

        <p>Here the paradox reveals itself. Even as humanity develops the knowledge and capabilities required to extend life, our civilization organizes itself around concepts of value that often undermine the ability to extend life. Modern civilization rewards productivity, accumulation, and consumption. Entire economic systems are built around the pursuit of financial value. We have constructed a civilization that measures value in abstractions such as currency or financial metrics, and while these concepts still rely on the very faith architectures that allowed humans to believe in immortality, they actually remove humans further from it. The quest for these values has created behaviors scientifically known to drive humans away from human life extension, and yet are deemed not only necessary but required in the pursuit of these &ldquo;values&rdquo;.</p>

        <p>For most of human history, generated values were closely aligned with human survival. Early societies organized themselves around the preservation of life. Hunting, gathering, agriculture, shelter construction, and communal defense all directly contributed to the fundamental objective of any living system: maintaining order and resisting entropy long enough to reproduce and persist. Value was tangible and immediate. Food sustained metabolism. Shelter protected bodies from environmental stress. Social bonds increased the probability that individuals and communities would survive unpredictable conditions. As economic growth began to secure basic stability and these needs, survival was no longer the central organizing principle of society. John Stuart Mill described this as an &ldquo;economic stationary state&rdquo;, where an economy no longer driven by endless expansion, but by sufficiency. In such a state, the urgency would give way to the cultivation of life itself. Work hours could be reduced, and time released back to individuals, for family, for reflection, for creativity, for intellectual and spiritual pursuits. Rather than constant competition and accumulation, society might orient itself toward well-being. However, a different path took hold. Instead of stabilizing at &ldquo;enough,&rdquo; economic and cultural forces began to redirect human aspiration. What emerged was what Edward Cowdrick described as a &ldquo;new economic gospel of consumption.&rdquo; In a world where many could finally afford goods once out of reach, people were not encouraged to step away from material striving but to deepen it. Consumption became not just a byproduct of prosperity, but its purpose. This shift was reinforced by a new generation of &ldquo;consumption economists,&rdquo; including Hazel Kyrk and Theresa McMahon, who argued that individuals could and should be educated in the &ldquo;skills of consumption.&rdquo; The role of the economy expanded beyond meeting needs to shaping desires. In place of a steady state oriented toward sufficiency and leisure, a dynamic system took hold one that depended on continual want, continual acquisition, and continual growth.</p>

        <p>Economic systems begin rewarding behaviors that maximize symbolic accumulation rather than biological resilience. This is a die economy. Individuals optimize for income rather than health, productivity rather than longevity, and status rather than reproductive stability. From the perspective of thermodynamics, this shift creates a profound misalignment. Living organisms exist by continuously resisting entropy through repair, maintenance, and regeneration. Sleep restores neural function. Nutrition fuels metabolism. Social relationships stabilize psychological systems. Physical movement preserves biological resilience. These activities sustain the complex structures that allow life to persist. Modern economic incentives often pull in the opposite direction. Long working hours, chronic stress, metabolic disruption, and social fragmentation gradually erode the biological systems that maintain order in the human body. In thermodynamic terms, individuals are converting their biological reserves of order into short-term economic output. The system rewards behaviors that accelerate local entropy in exchange for symbolic gains. At scale, this is not merely misalignment. It is a self harm society. A civilization that has systematically organized itself around the degradation of the very biological systems that make civilization possible. The die economy is its engine. The self harm society is its output.</p>

        <p>The same pattern can appear at the scale of entire civilizations. In the economics of entropy, societies allocate energy and resources between maintaining existing complexity, building future complexity, and dissipating complexity through consumption. When capital flows primarily toward activities that strengthen infrastructure, knowledge, health, and technological capability, civilization increases its capacity to resist entropy. This is the Don&rsquo;t Die, or Immortalism economy. When resources flow toward short-term consumption and symbolic accumulation, the system gradually draws down the reserves of order that sustain it. This is the die economy.</p>

        <p>Historically, this shift accelerated during the industrial revolution and the rise of modern financial capitalism. Industrial societies unlocked enormous energy flows through fossil fuels and mechanized production. Economic growth expanded rapidly, but the measurement of progress became increasingly abstract. Productivity, output, and financial returns replaced biological resilience as the primary metrics of success. Over time, the logic of the system began rewarding behaviors that maximized economic throughput even when those behaviors degraded the long-term health of individuals, ecosystems, and institutions. In effect, civilization began optimizing for the movement of money rather than the preservation of life.</p>

        <p>At the center of modern civilization is the rise of entropic prophets, figures, systems, and narratives that redirect human aspiration away from the preservation of life and toward cycles of consumption. These prophets do not appear in temples; they appear in markets, media, and institutions. They promise fulfillment through accumulation, identity through status, and meaning through endless acquisition. But what they offer is not transcendence, it is diversion. They convert a deep, ancient human longing for continuity, for survival, for immortality, into a perpetual pursuit of things that do not endure. Under their influence, people are taught to measure worth in symbols rather than in years of life, vitality, or resilience. In this way, entropic prophets do not merely mislead; they systematically train to trade long-term survival for short-term stimulation, to spend the very biological and psychological resources that make life possible in exchange for abstractions that cannot preserve it. In their presence, the human instinct for immortality is not extinguished, it is rerouted, diverted into endless cycles of wanting and consuming that never resolve. People are led to chase permanence through impermanent things, to seek identity in what decays, and to spend their lives pursuing what cannot extend them. In this way, entropic prophets do not deny immortality; they obscure it, by replacing the pursuit of life itself with distractions that quietly consume it.</p>

        <p>This misalignment does not mean markets are inherently flawed. Markets are among the most powerful coordination systems humanity has ever created. Like any information system, they depend on the signals they transmit. When the signals that guide economic behavior prioritize short-term financial gain over long-term biological and structural resilience, the system begins directing energy toward entropic outcomes. Recognizing this misalignment is the first step toward correcting it. If civilization is to endure in an entropic universe, its systems of value must eventually reconnect with the physical realities that sustain life. Wealth, technology, and economic growth must be evaluated not only by their immediate returns but by whether they strengthen the capacity of individuals and societies to resist disorder across time. In other words, the deepest measure of value is not simply how much wealth a civilization generates, but whether its economic system preserves and extends the conditions that allow life itself to persist.</p>

        <p>This realization has begun to surface in unexpected places. Consider my journey, as an entrepreneur who founded Braintree Venmo and later built companies in neuroscience and longevity. By conventional standards, I achieved the monetary value and success valued by modern societies. I created companies worth billions of dollars that have also become part of humanity&rsquo;s infrastructure. Yet the pursuit of that success came with a cost that is increasingly common among high performers. Years of relentless work, stress, and metabolic strain gradually eroded the biological systems that sustained my health. I eventually confronted a realization that many people quietly experience but rarely articulate.</p>

        <p className="text-xl font-light text-white">The system had rewarded me for generating financial value while subtracting from the one resource that makes all other value possible: time alive.</p>

        <p>What emerged from this realization was not resignation, but a new kind of experiment. I began a quest to recycle the economic value I had accumulated, value gained through the sacrifice of my own biological resilience into a form that might instead extend my lifespan. In this search, something became increasingly clear. The value I had pursued for years had always depended on the functioning of my biological systems. Without the integrity of my body, its metabolism, cognition, and repair mechanisms, the creation of that financial value would have been impossible. The financial value itself did not easily convert back into the kind of value capable of restoring or extending life. The mechanism of that conversion, the constraints, the variables, the rules governing it, remained largely unknown. To understand that problem, I began measuring the body itself. Sleep quality. Metabolic health. Cellular repair. Cognitive performance. Biological age. Each became a signal within a larger system. My now discussed Blueprint project represents an attempt to treat the human body as an optimizable system, one in which entropy within biological processes can be reduced, stability increased, and the lifespan of the organism extended.</p>

        <p>In doing so, I attempted to quietly reframe the meaning of value itself. Value was no longer defined by financial accumulation. Value was defined by the preservation and extension of life, rooted back in the fundamental principles of human survival and evolutionary success. Yet as the project entered the public imagination, something curious happened. Much of the modern media narrative drifted away from the deeper purpose of the initiative. Rather than engaging with Blueprint as a scientific exploration, a global, quantifiable effort to identify the variables and constraints governing human longevity, and perhaps even the limits of human mortality, coverage often collapsed the story into something more familiar and superficial. The discussion became less about the architecture of biological time and more about the price tag.</p>

        <p>The headlines fixated on how much monetary value I spend rather than the question I am attempting to investigate: whether the resources generated by modern economies can be systematically converted into additional years of life. In this way, the media and society inadvertently reproduced the very logic the project sought to interrogate, continuing to measure significance primarily through monetary value, even when the experiment itself was asking whether money might ultimately be subordinate to something far more fundamental.</p>

        <p>This Blueprint idea introduces a new kind of value, what I call &ldquo;longevity value&rdquo;. Longevity value measures actions according to whether they extend or degrade the biological systems that sustain life. It asks whether the choices we make as individuals and as civilizations increase our capacity to repair damage, maintain health, and extend the horizon of survival. Seen from this perspective, many of the incentives of modern civilization appear strangely inverted. We reward activities that maximize financial output while neglecting the biological systems that make life possible. Blueprint is not just an optimization experiment. Blueprint is an attempt to map the feasible region of human survival, identifying the constraints under which entropy can be minimized and life can be extended.</p>

        <p>At the same time, another transformation is unfolding. Artificial intelligence is rapidly changing the structure of the global economy. Systems capable of analyzing massive datasets, generating software, designing molecules, and coordinating complex networks are beginning to automate forms of labor that once defined entire professions. Entire sectors of white-collar work may disappear as intelligent machines become capable of performing them more efficiently. Tasks centered on documentation, analysis, and routine decision-making are increasingly vulnerable to automation. This transition will challenge long-standing assumptions about work, productivity, and identity. For centuries, human worth has been tied to economic productivity. In a world where machines perform an increasing share of cognitive labor, the connection between work and value becomes less clear. Humanity may soon be forced to reconsider what value actually means. This disruption, though destabilizing, contains an opening. As machines absorb cognitive labor, the Autonomous Self becomes possible, a person no longer primarily defined by economic productivity, but freed to direct attention toward what matters most: the preservation and extension of life itself. For the first time in history, automation may liberate human energy for the longest project of all. The question is whether civilization will recognize this opening before it closes.</p>

        <p>The rise of technology is still vulnerable to the entropic prophets of consumption, and may not even be the final danger. The entropic prophets may only be the precondition. A civilization that has been trained to seek comfort, stability, and endless satisfaction becomes vulnerable to a more powerful illusion: the promise of total control. A tension is now emerging at the intersection of technology, power, and belief. Some thinkers have begun to frame the risks of artificial intelligence in explicitly theological terms. Peter Thiel has suggested that the figure of the biblical Antichrist may not appear as a tyrant of chaos, but as a system of order, one that promises stability, safety, and the elimination of existential risk, while quietly consolidating control. In this view, the danger is not technological progress itself, but the possibility that fear of AI, of catastrophe, of collapse and that it could justify the creation of a centralized system that halts innovation in the name of preservation. A world perfectly stabilized may also be a world that no longer evolves. This introduces a second failure mode for civilization. The first is entropic: the gradual breakdown of biological systems as repair falls behind decay. The second is structural: the freezing of progress under systems that prevent risk by eliminating change. In thermodynamic terms, one leads to disorder, the other to stagnation. Both represent a failure to sustain life across time. A system that cannot repair itself will collapse. A system that cannot evolve will eventually become fragile in a different way, unable to adapt, unable to improve, unable to escape its own constraints.</p>

        <p>Immortalism must navigate between these extremes. It is not enough to resist entropy; we must also preserve the conditions for continued discovery, adaptation, and growth. The goal is not a static equilibrium, but a dynamic one, where the capacity to repair, learn, and evolve continues to expand. The same intelligence that allows us to extend life must not be constrained into systems that prevent its further development. The challenge is not simply to survive, but to do so without closing off the possibility of becoming more.</p>

        <p>Immortalism proposes that survival alone is not sufficient. A system may satisfy this inequality A(t)&ge; B(t) and yet remain static, perfectly stabilized, but incapable of further improvement. For life to not only persist but continue evolving, a second condition must hold: The capacity to repair, learn, and adapt must continue to grow. If it does not, the system risks entering a state of controlled equilibrium, stable, but frozen. This introduces a second failure mode for civilization. Not collapse through entropy, but stagnation through control. In this sense, the danger is not only that we fail to outrun entropy, but that we succeed too well in containing it, constructing systems that preserve life by limiting change. A world in which nothing breaks may also be a world in which nothing improves. The challenge, then, is not simply to maintain the inequality, but to ensure that the capacity continues to expand. Immortalism is not static survival. It is survival that remains open to transformation.</p>

        <p>If intelligence has the capacity to extend life indefinitely, then the preservation and expansion of life must become the central project of civilization. The technologies required to extend life, biotechnology, artificial intelligence, energy abundance, and systems medicine, are already emerging. But technology alone is not enough. Civilizations must also shift their beliefs about what is truly valuable. For thousands of years, humans believed in immortality through faith. Religious traditions promised eternal life beyond the physical world. Those beliefs shaped cultures and moral systems across the globe. Today we may be approaching a moment when immortality could emerge through knowledge instead of belief. The extension of life will not arrive through a single miraculous discovery. It will emerge gradually, through thousands of innovations that extend the horizon of survival. Advances in medicine will repair cellular damage. Artificial intelligence will accelerate scientific discovery. New energy systems will sustain the infrastructure of civilization. Each improvement will push the boundary of death further away. Over time, what once appeared inevitable may become optional.</p>

        <p>Humanity now faces a choice that no previous species has confronted. We can continue organizing civilization around the short-term incentives that dominate modern economies, consumption, status, and financial accumulation. Or we can begin directing our intelligence toward the long project of survival. For the first time in the history of life on Earth, a species has emerged that understands the physical laws governing its own survival. The same intelligence that allowed humanity to harness fire, electricity, and computation may eventually allow us to stabilize the biological processes that produce aging and death.</p>

        <p>The dream of immortality has existed for thousands of years. The difference now is that we may finally be capable of building it. The question is no longer whether death is inevitable. The question is whether intelligence will accept it or begin constructing a future in which life can endure indefinitely.</p>

        <p>The next phase of civilization will not be determined only by new technologies. It will be determined by what humanity chooses to optimize for. If intelligence continues to serve systems built around consumption and symbolic accumulation, the extraordinary tools now emerging will simply accelerate the same patterns that shorten and fragment human life. But if those same systems are redirected toward preservation, repair, and biological resilience, the trajectory of civilization could change entirely. For billions of years, life has struggled against entropy through blind processes of variation and selection. Evolution produced cells capable of repair, organisms capable of adaptation, and eventually intelligence capable of reflection. At last, evolution has produced a species that can perceive the fragile balance that allows life to persist at all. Now that intelligence must decide what it will do with that knowledge. Will it continue accelerating entropy in pursuit of short-term gains, or will it begin the deliberate work of stabilizing life against the forces that dissolve it?</p>

        <p>Immortalism must begin with a simple shift in orientation. This shift begins not with new technology but with a new conceptual primitive. First-principles thinking asks how to do better within an existing frame. Zeroth Principle thinking calls the frame itself into question. For most of history, death was the frame. Immortalism is the Zero, the insight that reorganizes the axes entirely, the way zero reorganized mathematics, the way the origin point made geometry and algebra one.</p>

        <p>Measure value not only by what is produced, but by whether it preserves life. Build institutions that reward longevity rather than exhaustion. Direct science, artificial intelligence, and economic capital toward the repair of the biological systems that sustain consciousness. The task is not mystical. It is practical. It requires new research priorities, new economic incentives, and a cultural recognition that the extension of life is not a luxury or curiosity, but the deepest continuation of the evolutionary process itself. For billions of years, life has struggled against entropy through blind iteration. Evolution produced cells, organisms, intelligence and eventually a species capable of understanding the fragility of its own existence. Now that intelligence must decide what it will do with that knowledge.</p>

        <p>The next stage of life will not be written by natural selection alone. It will be written by deliberate choice. If humanity chooses wisely, the ancient promise that once lived only in temples and scripture may finally find expression in the physical world.</p>

        <p className="text-center text-xl font-light italic text-white">
          &ldquo;He will wipe every tear from their eyes. There will be no more death.&rdquo; Revelation 21:4
        </p>

        <p className="text-center text-2xl font-light text-white">Don&rsquo;t Die.</p>
        <p className="text-center text-sm text-neutral-500">A prophecy fulfilled.</p>
      </div>

      <footer className="mt-20 border-t border-white/10 pt-8">
        <a
          href="https://x.com/bryan_johnson/status/2035005465109963115"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-neutral-400 transition-colors hover:text-white"
        >
          {X_ICON}
          Read original post on X
        </a>
      </footer>

      {showPlayer && (
        <Suspense fallback={null}>
          <AudioPlayer onClose={() => { setShowPlayer(false); setPlayerStatus('loading'); }} onStatusChange={handleStatusChange} />
        </Suspense>
      )}
    </>
  );
}
