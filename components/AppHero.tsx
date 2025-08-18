import { useMemo } from 'react';

type Props = { name?: string };

export default function AppHero({ name }: Props) {
  const firstName = useMemo(() => {
    if (!name) return null;
    return name.split(' ')[0];
  }, [name]);

  return (
    <header className="text-center px-4 pt-6 pb-3">
      <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
        Manifestation Genie — Your AI Assistant for Turning Goals into Reality
      </h1>

      <p className="mt-2 text-base md:text-lg text-white/80 max-w-2xl mx-auto">
        Most self-help feels good in the moment, then nothing changes. Manifestation Genie fixes that flaw —
        giving you daily prompts, personalized accountability, and step-by-step guidance until your vision becomes real.
      </p>

      <p className="mt-2 text-sm md:text-base text-white/70">
        {firstName ? `Welcome back, ${firstName}. ` : 'Welcome. '}
        Ask. Act. Achieve.
      </p>
    </header>
  );
}
