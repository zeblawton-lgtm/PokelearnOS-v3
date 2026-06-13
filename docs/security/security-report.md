# PokelearnOS — Security Report

**Date:** 2026-05-26
**Version:** 1.0.0

## Threat Model Summary

PokelearnOS is a child-facing kiosk application with the following threat model:

- **Attacker model:** Curious child attempting to exit kiosk or access inappropriate content
- **Secondary model:** Unauthorized adult attempting to change parental settings without PIN
- **Out of scope:** Nation-state attacks, network-based attacks (no external exposure in kiosk mode)

## Security Controls

### Child Safety Controls

| Control | Implementation | Status |
|---------|---------------|--------|
| Kiosk mode | Chromium `--kiosk` flag, no address bar | IMPLEMENTED |
| OS lockdown | Restricted `kids` user, no shell, no sudo | IMPLEMENTED (kiosk) |
| No external content | All educational content bundled | IMPLEMENTED |
| No unrestricted LLM | LLM_PROVIDER=none default | IMPLEMENTED |
| No PokéAPI runtime | Sprites and artwork bundled locally | IMPLEMENTED |
| Screen exit prevention | GDM lockdown + dconf restrictions | IMPLEMENTED (kiosk) |

### Parent PIN Security

| Property | Detail |
|----------|--------|
| Algorithm | SHA-256 with application salt ("pokelearnos") |
| Default PIN | 1234 (must change on deployment) |
| Storage | `settings` table, key `parent_pin_hash` |
| Transmission | HTTPS in production (Replit proxy TLS) |
| Brute force | Failed PIN attempts are rate limited |

**Recommendation:** Change the default PIN before child use.

### Network Security (Kiosk Mode)

| Control | Status |
|---------|--------|
| Backend binds to 127.0.0.1 | IMPLEMENTED via APP_ENV=kiosk |
| No external API calls at runtime | IMPLEMENTED |
| No cloud LLM | IMPLEMENTED |
| No telemetry | IMPLEMENTED |

### Data Privacy

| Data | Storage | Retention |
|------|---------|-----------|
| Child profiles (name, age) | Local PostgreSQL/SQLite | Until manually deleted |
| Session records | Local DB | Indefinite (local only) |
| Question attempts | Local DB | Indefinite (local only) |
| Parent PIN hash | Local DB | Until changed |

**No data leaves the device in kiosk mode.**

## Secrets in Code

- No API keys in source code
- No hardcoded passwords (default PIN is documented, not embedded)
- `SESSION_SECRET` environment variable used for session signing (Replit secret)

## Remaining Risks

1. **Default PIN 1234** — Must be changed before child use. Documented prominently.
2. **No HTTPS in kiosk mode** — Backend serves on `http://127.0.0.1` (loopback only, acceptable).
