// /components/AppHero.jsx
import Logo from './Logo';

export default function AppHero() {
  return (
    <section
      style={{
        background: 'var(--midnight)',
        padding: '40px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.08)'
      }}
    >
      <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
        <Logo size={56} withText />
        <h1 style={{ margin: '18px 0 8px', fontSize: 34 }}>
          One track. One listen. <span className="accent-magic">A permanent shift begins.</span>
        </h1>
        <p style={{ opacity: .9, margin: '0 0 22px', fontSize: 18 }}>
          Your AI genie that turns inspiration into action—without the fluff.
        </p>
        <button className="btn btn-primary">Enter the Genie</button>
      </div>
    </section>
  );
}
