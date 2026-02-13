/* eslint-disable @typescript-eslint/no-require-imports */
const { createClient } = require("@supabase/supabase-js");

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error("Missing Supabase env");

  const supabase = createClient(url, anon);
  const res = await supabase.auth.signInWithOtp({
    email: process.argv[2] ?? "dustin.taylor.mba@gmail.com",
    options: {
      emailRedirectTo: "https://barsportspredictapp.vercel.app/auth/callback",
    },
  });
  console.log(JSON.stringify(res, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
