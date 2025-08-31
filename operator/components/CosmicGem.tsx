export default function CosmicGem({ gem }: { gem?: string | null }) {
  if (!gem) return null;
  return (
    <div className="card mb-4 border-dashed">
      <div className="text-sm opacity-80">
        <span className="mr-2">🌌</span>
        {gem}
      </div>
    </div>
  );
}
