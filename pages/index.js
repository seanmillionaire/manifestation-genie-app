// pages/index.js
export default function Home() {
  return null;
}

// Redirect anyone hitting "/" to /login (change to /chat if you prefer)
export async function getServerSideProps() {
  return {
    redirect: {
      destination: '/login', // or '/chat'
      permanent: false,
    },
  };
}
