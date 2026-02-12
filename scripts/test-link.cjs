/* eslint-disable @typescript-eslint/no-require-imports */
const { createClient } = require("@supabase/supabase-js");

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("Missing Supabase env");

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const email = "hostdev@example.com";
  await supabase.auth.admin.createUser({ email, email_confirm: true }).catch(() => {});

  const linkRes = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: {
      emailRedirectTo: "http://localhost:3000/auth/callback",
    },
  });

  if (linkRes.error) throw linkRes.error;

  const actionLink = linkRes.data.properties.action_link;
  const resp = await fetch(actionLink, { redirect: "manual" });

  console.log(JSON.stringify({
    action_link: actionLink,
    status: resp.status,
    location: resp.headers.get("location"),
  }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
