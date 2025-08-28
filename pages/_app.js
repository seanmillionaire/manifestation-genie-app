// /pages/_app.js
import '../styles/globals.css'
import Head from 'next/head'

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>Manifestation Genie</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="app-shell">
        {/* Shared Header */}
        <header className="login-hero">
          <img
            className="login-logo"
            src="https://storage.googleapis.com/mixo-sites/images/file-a7eebac5-6af9-4253-bc71-34c0d455a852.png"
            alt="Manifestation Genie"
          />
          <h1 className="login-title">
            Your Personal AI Genie for Manifesting Dreams into Reality ✨💫
          </h1>
        </header>

        {/* Page content */}
        <main>
          <Component {...pageProps} />
        </main>
      </div>

      <style jsx global>{`
        .app-shell {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }
        .login-hero {
          text-align: center;
          padding: 40px 20px 20px;
        }
        .login-logo {
          max-width: 120px;
          margin: 0 auto 12px;
        }
        .login-title {
          font-size: 20px;
          font-weight: 600;
          color: #fff;
        }
      `}</style>
    </>
  )
}
