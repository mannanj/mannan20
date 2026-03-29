'use client';

import { useState, useCallback } from 'react';

export default function BeCourageouslyYouArticle() {
  const [authenticated, setAuthenticated] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!code.trim()) return;
      setLoading(true);
      setError('');
      try {
        const res = await fetch('/api/episodes/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: code.trim() }),
        });
        const data = await res.json();
        if (data.success) {
          setAuthenticated(true);
        } else {
          setError('Invalid access code');
        }
      } catch {
        setError('Connection failed');
      } finally {
        setLoading(false);
      }
    },
    [code]
  );

  if (!authenticated) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <form onSubmit={handleSubmit} className="flex w-72 flex-col gap-4">
          <input
            type="password"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Access code"
            autoFocus
            className="w-full border border-white/20 bg-transparent px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:border-white/50"
            disabled={loading}
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="w-full border border-white/20 py-2.5 text-sm text-white/70 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-30"
          >
            {loading ? 'Verifying...' : 'Enter'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <>
      <header className="mb-16">
        <h1 className="mb-4 text-4xl font-light tracking-tight">Be Courageously You</h1>
        <p className="mb-6 text-sm text-neutral-500">Faizan Ishaq</p>
      </header>

      <div className="mb-12 overflow-hidden rounded-lg">
        <video
          controls
          playsInline
          preload="metadata"
          className="w-full"
          src="https://hq19kliyhzkpvads.public.blob.vercel-storage.com/video/be-courageously-you.mp4"
        />
      </div>

      <div className="space-y-6 text-[15px] leading-relaxed text-neutral-300">
        <p>Don't get so wrapped up in other people's definitions of how you should be to achieve the things that you want. There's so many different videos that I'm seeing around like how men must be a certain way to achieve the kind of woman that they want, or you must attain these specific things using this specific rule set, and if you don't do it in that way you won't attain those things.</p>

        <p>And I'm just kind of recognizing like all of that is just a certain belief system, and those people that are believing it are stepping into that reality and really believing that they must be that certain way to achieve those things.</p>

        <p>If you feel like for some reason you can't align with those things and it makes you feel like, oh, because you can't align with those things you're not meant to achieve the things that you desire — that's just not the truth. You're tuning in to someone else's reality, and the reason that you feel like you can't fit into it is because that belief system is not for you.</p>

        <p className="text-xl font-light text-white">You are able to achieve the things that you want through being who you are.</p>

        <p>Like, you don't need to subscribe to anybody else's rule set. Once you recognize that, you are able to attain the things that you want while also staying true to yourself — and not having to step into some perfectionistic version of yourself which is not even possible to do in the first place.</p>

        <p>Recognize that you can just attract from the place of naturally being yourself. Don't subscribe to other people's belief systems. Don't step into other people's realities.</p>

        <p>Instead, bring the power back to yourself and recognize that, hey, this does not align with me and I don't want things to come into my life by me having to be this way that doesn't align with who I am.</p>

        <p className="text-center text-xl font-light italic text-white">I'm going to choose to be me, and I'm going to get those things anyways — through a reality that aligns for me.</p>
      </div>
    </>
  );
}
