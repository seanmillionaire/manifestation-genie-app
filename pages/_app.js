import "../styles/globals.css";
import { useEffect } from "react";
import { supabase } from "../src/supabaseClient"; // <-- named import

export default function MyApp({ Component, pageProps }) {
  useEffect(() => {
    const { data: { subscription } = { subscription: null } } =
      supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user?.id) upsertToday(session.user.id);
      });

    // also run once on mount for current session
    supabase.auth.getSession().then(({ data }) => {
      const uid = data?.session?.user?.id;
      if (uid) upsertToday(uid);
    });

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  return <Component {...pageProps} />;
}

async function upsertToday(userId) {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  await supabase
    .from("user_daily_visits")
    .upsert(
      { user_id: userId, visit_date: today },
      { onConflict: "user_id,visit_date", ignoreDuplicates: true }
    );
}
