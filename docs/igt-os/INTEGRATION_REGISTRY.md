# INTEGRATION REGISTRY

Source of truth is DERIVED at request time: `GET /api/integrations` (admin/ops). Nothing is stored or fabricated; it reports
whether the server is configured (env var NAMES only), which accounts are connected, token expiry and last sync.

Lifecycle used: NOT_CONFIGURED (server cannot start OAuth) -> ACCESS_REQUIRED (no connected account / no adapter) -> HEALTHY | DEGRADED | ERROR.
Thresholds (code constants in `routes/integrations.ts`): stale sync > 36h = DEGRADED; token expires < 3 days = DEGRADED; expired token = ERROR.
Response never contains tokens, refresh tokens, emails or secret values (test enforced).

| Provider | Adapter | Status today | Needs |
|---|---|---|---|
| Meta Ads (Marketing API) | NOT BUILT | ACCESS_REQUIRED | Marketing API access + client ad-account approval |
| Google Ads | NOT BUILT | ACCESS_REQUIRED | developer token + client account linking |
| Google Analytics 4 | NOT BUILT | ACCESS_REQUIRED | GA4 Data API access per property |
| Google Business Profile | NOT BUILT | ACCESS_REQUIRED | Business Profile API approval |
| Instagram / Facebook Pages | built | NOT_CONFIGURED / per-account health | META_APP_ID, META_APP_SECRET + client consent |
| YouTube | built | NOT_CONFIGURED / per-account health | GOOGLE_CLIENT_ID/SECRET + channel consent |
| Google Calendar + Gmail (per employee) | built | NOT_CONFIGURED / ACCESS_REQUIRED | same Google OAuth client |
| GitHub App | built | NOT_CONFIGURED / ACCESS_REQUIRED | GITHUB_APP_ID, GITHUB_INSTALLATION_ID, GITHUB_PRIVATE_KEY |

Adapter contract to follow when building the Ads adapters: read-only scopes first; encrypted token storage (existing AES helper);
`last_synced_at` + `last_error` per account; sync failure surfaces as DEGRADED/ERROR, never as zero spend/leads; fixtures for
success / expired / revoked / rate-limited / partial / outage / duplicate webhook.
