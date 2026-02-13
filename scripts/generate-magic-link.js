#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const email = process.argv[2];
if (!email) {
  console.error("Usage: node scripts/generate-magic-link.js <email>");
  process.exit(1);
}

const envFiles = [".env.local", ".env"]; // load defaults if not already defined
for (const file of envFiles) {
  const fullPath = path.join(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    const lines = fs.readFileSync(fullPath, "utf-8").split(/\r?\n/);
    for (const line of lines) {
      if (!line || line.trim().startsWith("#")) continue;
      const idx = line.indexOf("=");
      if (idx === -1) continue;
      const key = line.slice(0, idx).trim();
      const value = line.slice(idx + 1).trim();
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const redirectTo = process.env.NEXT_PUBLIC_MAGIC_LINK_REDIRECT ||
  "https://barsportspredictapp.vercel.app/auth/callback";

if (!url || !serviceRoleKey) {
  console.error("Missing Supabase env vars. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set (in .env.local).\nLoaded env: ", envFiles);
  process.exit(1);
}

async function main() {
  const supabase = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data, error } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: {
      emailRedirectTo: redirectTo,
    },
  });

  if (error) {
    console.error("Error generating link:", error.message);
    process.exit(1);
  }

  if (!data?.properties?.action_link) {
    console.error("No magic link returned", data);
    process.exit(1);
  }

  console.log("Magic link generated:\n" + data.properties.action_link);
}

main();
