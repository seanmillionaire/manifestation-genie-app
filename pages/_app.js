// /pages/_app.js
import '../styles/globals.css'

export default function App({ Component, pageProps }) {
  return <Component {...pageProps} />
}

  return (
    <>
      <Head>
        {/* Brand font */}
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet" />
        {/* Theme variables */}
        <style>{`
          :root{
            --bg:#0f1020;          /* page background */
            --card:#16172a;        /* card background */
            --soft:#21233a;        /* subtle borders */
            --text:#e8e9f1;        /* body text */
            --muted:#a6a8bf;       /* secondary text */
            --brand:#8b5cf6;       /* main brand color (purple) */
            --brand-2:#22d3ee;     /* accent (cyan) */
            --me:#8b5cf6;          /* my bubble */
            --genie:#262842;       /* genie bubble */
          }
          html,body{margin:0;padding:0;background:var(--bg);color:var(--text);font-family:Poppins,system-ui,Arial;}
          a{color:var(--brand)}
          *{box-sizing:border-box}
        `}</style>
      </Head>
      <Component {...pageProps} />
    </>
  )
}
