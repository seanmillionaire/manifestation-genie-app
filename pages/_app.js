// /pages/_app.js
import '../styles/globals.css'
import '../styles/light-theme.css'
import Head from 'next/head'

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet" />
        <style>{`
          :root{
            --bg:#0D1B2A;          
            --card:#16172a;        
            --soft:#21233a;        
            --text:#FFFFFF;        
            --muted:#a6a8bf;       
            --brand:#5A189A;       
            --gold:#FFD700;        
            --green:#00C853;       
            --purple:#5A189A;      
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
          main{
            flex:1;
          }
          footer{
            text-align:center;
            padding:20px 12px;
            font-size:14px;
            color:rgba(255,255,255,0.7);
            border-top:1px solid rgba(255,255,255,0.08);
            line-height:1.6;
          }
          footer a{
            color:var(--gold);
            text-decoration:none;
            font-weight:600;
          }
          footer a:hover{
            text-decoration:underline;
          }
        `}</style>
      </Head>
      <div className="pageWrap">
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
