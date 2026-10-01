@AGENTS.md

# Shared test account (do NOT create ad-hoc test accounts)

The DB (Neon Postgres, shared/live -- see .env DATABASE_URL) previously
accumulated ~20 one-off accounts from agents testing features (emails like
`v3_<timestamp>@example.com`, `final_three_<timestamp>@example.com`, etc.)
that had to be cleaned up (2026-08-30). To avoid this recurring, use this
one account for manual testing / screenshot scripts / curl checks instead
of registering a new one each time:

    email:    agent-test@fundas.local
    password: AgentTest123!
    fullName: Agent Test Account
    role:     patient

If you need it reset or re-provisioned (e.g. after clearing its scan
history), re-run (idempotent, upserts by email):

    node --env-file=.env --env-file=.env.local scripts/create-user.mjs agent-test@fundas.local "AgentTest123!" "Agent Test Account" patient

Only the real account `haminhphuong@gmail.com` and this shared test account
should exist as users in this DB. If a test genuinely requires a second/
third concurrent account (e.g. multi-user flows), create it, but clean it
up (delete the User row -- and its Scan/MultidiseaseScreening rows, and any
Cloudinary uploads under `fundas/raw/`) at the end of that session rather
than leaving it for someone else to find later.
