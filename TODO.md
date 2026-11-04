# TODO / Decision Log

Unattended maintenance pass, 2026-11-05. Items below need a human decision or follow-up.

## Deployment

- [ ] Verify DNS for `wiki.mcnb.dev` points at GitHub Pages; after the first successful workflow run, confirm the Pages settings show `wiki.mcnb.dev` (the API currently still reports the historical `wiki.samuelcheston.com`).
- [ ] Decide whether the legacy `gh-pages` branch can be deleted once the Actions pipeline has deployed successfully a few times.
- [ ] `htaccess.example` is an Apache leftover; delete it if no Apache deployment is planned.

## Documentation centralization

- [ ] WinnerProxy pages `api.md` and `deployment.md` still live only in the frozen `CoreMatch/HRPAuth-Wiki` repository; import them into this wiki when their content is refreshed (data-flow and troubleshooting were imported and corrected on 2026-11-05).
- [ ] `CoreMatch/HRPAuth-Wiki` is frozen: only the dead pointer in `HRPAuth/configuration.md` was fixed (it pointed at HA-Contract files that moved to the contract archive). Other frozen pages may still drift; treat this wiki as the only live documentation.

## Upstream drift documented (not fixed) here

- WinnerProxy hasJoined stage 3 (`POST /register` body mismatch) and the batch query double prefix are documented as drift on the WinnerProxy pages; the code fix is tracked in HA-Contract's `docs/dev/WinnerProxy/README.md` and WinnerProxy's knowledge base.
- The HRPAuth-Spigot plugin still sends the retired `manage_token` field on force-bind; harmless (ignored server-side) until the plugin is updated.
