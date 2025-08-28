// /pages/_app.js — App wrapper with shared header matching Chat theme
import '../styles/globals.css'
import Head from 'next/head'
import { useRouter } from 'next/router'
import Logo from '../components/Logo'

export default function App({ Component, pageProps }) {
  const router = useRouter()
  const showHeader = router.pathname === '/chat' || router.pathname === '/login'

  return (
    <>
      <Head>
        <title>Manifestation Genie</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </Head>

      <div className="mg-app">
        {showHeader && (
          <header className="mg-header">
            <div className="mg-header-inner">
              <div className="mg-brand" onClick={() => router.push('/')}>
                <Logo size={40} withText />
              </div>
            </div>
          </header>
        )}

        <main className="mg-main">
          <Component {...pageProps} />
        </main>

        <footer className="mg-footer">
          <div>© {new Date().getFullYear()} Manifestation Genie. All rights reserved.</div>
          <div>
            Powered by{' '}
            <a href="https://hypnoticmeditations.ai" target="_blank" rel="noopener noreferrer">
              HypnoticMeditations.ai
            </a>
          </div>
        </footer>
      </div>

      <style jsx>{`
        .mg-app{
          min-height:100vh;
          display:flex;
          flex-direction:column;
          background: var(--midnight);
          color: var(--white);
        }
        .mg-header{
          position:sticky; top:0; z-index:50;
          backdrop-filter: blur(8px);
          background: linear-gradient(180deg, rgba(13,27,42,0.85), rgba(13,27,42,0.55));
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        .mg-header-inner{
          max-width:1000px; margin:0 auto;
          padding:14px 20px;
          display:flex; align-items:center; justify-content:space-between;
        }
        .mg-brand{ cursor:pointer; display:flex; align-items:center; gap:8px }
        .mg-main{ flex:1; }
        .mg-footer{
          border-top:1px solid rgba(255,255,255,0.08);
          padding:20px;
          display:flex; gap:16px; flex-wrap:wrap; justify-content:center;
          color: rgba(255,255,255,0.7);
          background: rgba(13,27,42,0.7);
        }
        .mg-footer a{ color: var(--gold); text-decoration:none }
        .mg-footer a:hover{ text-decoration:underline }
      `}</style>
    </>
  )
}
