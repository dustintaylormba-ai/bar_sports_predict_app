/* eslint-disable @typescript-eslint/no-require-imports */
const { createClient } = require("@supabase/supabase-js");

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("Missing Supabase env");

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const email = process.argv[2] ?? "dustin.taylor.mba@gmail.com";
  await supabase.auth.admin.createUser({ email, email_confirm: true }).catch(() => {});

  const linkRes = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: {
      emailRedirectTo: "https://barsportspredictapp.vercel.app/auth/callback",
    },
  });

  if (linkRes.error) throw linkRes.error;
  console.log(JSON.stringify(linkRes.data.properties, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
