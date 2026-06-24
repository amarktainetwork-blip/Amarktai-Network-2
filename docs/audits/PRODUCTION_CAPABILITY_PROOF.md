# Production Capability Proof

Run the deterministic contract proof in development or CI:

```powershell
npm.cmd run proof:production-capabilities
```

This verifies the canonical 62-capability registry, six governed adult capabilities,
all 68 product contracts, input/output/artifact metadata, provider routes, dashboard
behavior, and honest setup or policy states. It also reports current local JSON store
counts.

Run the deployed live proof from an authenticated admin session:

```powershell
$env:AMARKTAI_PROOF_BASE_URL="https://amarktai.co.za"
$env:AMARKTAI_PROOF_COOKIE="amarktai_session=<current-admin-session-cookie>"
npm.cmd run proof:production-capabilities -- --live
```

Live mode tests all six approved provider credentials, invokes the creative workflow
smoke test, verifies the 68-contract API, and reports Jobs, Artifacts, and previewable
artifact counts. It exits non-zero when any provider smoke test fails or the deployed
contract/workflow endpoints fail.

Contract proof is not production proof. Do not call the system production-ready until
live mode passes on the VPS and generated media has been manually previewed.
