import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { getMe, acceptManifestForGood, saveTipStep } from "./home.api";
import { AgreementCard } from "./components/AgreementCard";
import { TipGuide } from "./components/TipGuide";
import { TIP_SLIDES } from "./content";

const AGREEMENT_VERSION = 1;

export default function HomeScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [savingAgree, setSavingAgree] = useState(false);
  const [profile, setProfile] = useState(null);
  const [tipStep, setTipStep] = useState(0);
  const [justAgreed, setJustAgreed] = useState(false);

  const agreed =
    !!profile?.agreements?.manifestForGood?.accepted &&
    (profile?.agreements?.manifestForGood?.version ?? 0) >= AGREEMENT_VERSION;

  useEffect(() => {
    let mounted = true;
    (async () => {
      const me = await getMe();
      if (!mounted) return;
      setProfile(me);
      setTipStep(me.onboarding?.tipGuide?.step ?? 0);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  const onAgree = async () => {
    if (agreed || savingAgree) return;
    setSavingAgree(true);
    try {
      await acceptManifestForGood({ version: AGREEMENT_VERSION });
      setProfile((p) => ({
        ...(p || {}),
        agreements: {
          ...(p?.agreements ?? {}),
          manifestForGood: {
            version: AGREEMENT_VERSION,
            accepted: true,
            at: new Date().toISOString(),
          },
        },
      }));
      setJustAgreed(true);
      setTimeout(() => setJustAgreed(false), 900);
    } finally {
      setSavingAgree(false);
    }
  };

  const onTipStep = async (nextStep, completed) => {
    setTipStep(nextStep);
    // fire-and-forget to keep UI snappy
    saveTipStep({
      step: nextStep,
      completedAt: completed ? new Date().toISOString() : undefined,
    }).catch(() => {});
  };

  const welcome = useMemo(
    () => `Welcome to the portal, ${profile?.firstName ?? "friend"} 👋`,
    [profile?.firstName]
  );

  if (loading) {
    return (
      <main className="px-6 py-8 max-w-screen-md mx-auto">
        <div className="h-6 w-40 rounded animate-pulse bg-neutral-200" />
        <div className="mt-4 h-20 w-full rounded-lg animate-pulse bg-neutral-200" />
      </main>
    );
  }

  return (
    <main className="px-6 py-6 max-w-screen-md mx-auto">
      {/* Global header handled in /pages/_app.js */}
      <h1 className="text-2xl font-semibold tracking-tight">{welcome}</h1>

      <section className="mt-4">
        <AgreementCard
          agreed={agreed}
          agreedAt={profile?.agreements?.manifestForGood?.at}
          version={AGREEMENT_VERSION}
          onAgree={onAgree}
          saving={savingAgree}
          justAgreed={justAgreed}
        />
      </section>

      {agreed && (
        <section className="mt-6">
          <TipGuide
            slides={TIP_SLIDES}
            step={tipStep}
            onStepChange={onTipStep}
            onFinish={() => router.push("/vibe")}  {/* your existing route */}
          />
        </section>
      )}
    </main>
  );
}
