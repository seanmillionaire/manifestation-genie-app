// pages/demo.tsx
import { useRouter } from "next/router";
import Head from "next/head";

export default function DemoPage() {
  const router = useRouter();

  return (
    <>
      <Head>
        <title>Free Demo • Manifestation Genie</title>
      </Head>

      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-lg p-6 md:p-8">
          <h1 className="text-2xl md:text-3xl font-semibold mb-3">
            Try Manifestation Genie — Free Demo
          </h1>

          <p className="text-gray-600 mb-6">
            This demo shows a safe, limited experience. No account needed.
          </p>

          {/* Put your limited demo UI here. Keep actions harmless & local only. */}
          <section className="space-y-4">
            <div className="p-4 rounded-xl border">
              <p className="font-medium">Sample Prompt</p>
              <p className="text-gray-600 text-sm">
                “I want clarity for today’s intention.”
              </p>
            </div>

            <div className="p-4 rounded-xl bg-gray-50 border">
              <p className="text-sm">
                ✨ Demo Response: “Breathe slowly. Write one sentence that starts
                with ‘Today I choose…’. Keep it kind and simple.”
              </p>
            </div>
          </section>

          <div className="mt-8 flex flex-col md:flex-row gap-3">
            <button
              className="w-full md:w-auto px-5 py-3 rounded-xl border"
              onClick={() => router.push("/login")}
              aria-label="Log in to unlock everything"
            >
              Log in to unlock everything
            </button>

            <button
              className="w-full md:w-auto px-5 py-3 rounded-xl bg-black text-white"
              onClick={() => router.push("/")}
              aria-label="Back to home"
            >
              Back to Home
            </button>
          </div>

          <p className="mt-4 text-xs text-gray-500">
            100% private demo. We don’t save demo entries.
          </p>
        </div>
      </main>
    </>
  );
}
