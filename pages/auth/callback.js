// pages/auth/callback.js
import { useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../src/supabaseClient";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    // Supabase automatically parses the hash fragment from the URL
    supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        // redirect after login success
        router.push("/home"); // 👈 change this to your main app page
      }
    });
  }, [router]);

  return <p>Finishing sign-in, please wait...</p>;
}
