export default function QuickGuide() {
  return (
    <section className="mt-6 border border-gray-200 rounded-lg bg-white px-4 py-4 shadow-sm">
      <h2 className="text-sm font-semibold tracking-wide uppercase text-gray-600">
        How to Use Manifestation Genie
      </h2>

      <ol className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-gray-800">
        <li className="flex items-start gap-3">
          <span className="text-lg">✨</span>
          <div>
            <p className="font-semibold">Ask</p>
            <p className="text-sm text-gray-600">Type your goal, desire, or challenge.</p>
          </div>
        </li>
        <li className="flex items-start gap-3">
          <span className="text-lg">🎯</span>
          <div>
            <p className="font-semibold">Receive</p>
            <p className="text-sm text-gray-600">Get a clear daily action—personalized for you.</p>
          </div>
        </li>
        <li className="flex items-start gap-3">
          <span className="text-lg">🚀</span>
          <div>
            <p className="font-semibold">Act</p>
            <p className="text-sm text-gray-600">Complete the step, check it off, and track progress.</p>
          </div>
        </li>
      </ol>

      <p className="mt-3 text-xs text-gray-500">
        Check in daily — small actions compound into big manifestations.
      </p>
    </section>
  );
}
