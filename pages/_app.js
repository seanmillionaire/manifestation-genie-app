// /pages/_app.js
import '../styles/globals.css'
import '../styles/light-theme.css'
import Head from 'next/head'

const LOGO_SRC = 'https://storage.googleapis.com/mixo-sites/images/file-a7eebac5-6af9-4253-bc71-34c0d455a852.png'

function LogoHeader() {
  return (
    <div style={{
      width:'100%', display:'flex', alignItems:'center', justifyContent:'center',
      padding:'14px 12px', borderBottom:'1px solid #e5e7eb', background:'#fff',
      position:'sticky', top:0, zIndex:50
    }}>
      <img src={LOGO_SRC} alt="Manifestation Genie" style={{height:36, width:'auto'}} />
    </div>
  )
}

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
        <style>{`
          :root{
            --bg:#ffffff;
            --card:#ffffff;
            --soft:#f8fafc;
            --text:#111111;
            --muted:#334155;
            --brand:#6633CC;
            --gold:#FFD600;
            --green:#16a34a;
            --purple:#6633CC;
            --border:#e5e7eb;
          }
          html,body{
            margin:0;
            padding:0;
            background:var(--bg);
            color:var(--text);
            font-family:Poppins,system-ui,Arial;
            min-height:100%;
          }
          *{box-sizing:border-box}
          .pageWrap{
            display:flex;
            flex-direction:column;
            min-height:100vh;
          }
          main{ flex:1; }
          footer{
            text-align:center;
            padding:20px 12px;
            font-size:14px;
            color:var(--muted);
            border-top:1px solid var(--border);
            line-height:1.6;
            background:#fff;
          }
          footer a{
            color:#0b67ff;
            text-decoration:none;
            font-weight:600;
          }
          footer a:hover{ text-decoration:underline; }
        `}</style>
      </Head>
      <div className="pageWrap">
        <LogoHeader />
        <main>
          <Component {...pageProps} />
        </main>
        <footer>
          <div>© {new Date().getFullYear()} Manifestation Genie. All rights reserved.</div>
          <div>
            Powered by{' '}
            <a href="https://hypnoticmeditations.ai" target="_blank" rel="noopener noreferrer">
              HypnoticMeditations.ai
            </a>
          </div>
        </footer>
      </div>
    </>
  )
}
