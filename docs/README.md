# AmarktAI V1 Documentation

AmarktAI is a capability-first AI engine. The V1 user flow is:

`User or connected app -> AmarktAI capability -> router -> provider adapter -> job/artifact/result`

Provider and model details are infrastructure concerns. The normal product experience starts with capabilities.

## V1 Dashboard

- Command Center
- Studio
- Capabilities
- Connected Apps
- Artifacts
- Jobs
- Settings

## Canonical Truth

- Providers: `src/lib/provider-mesh.ts`
- Models: `src/lib/universal-model-catalog.ts`
- Capabilities: `src/lib/ai-capability-taxonomy.ts`
- Execution routing: `src/lib/capability-router.ts`
- Dashboard navigation: `src/lib/dashboard-nav.ts`

## Current Audits

- [Capability truth matrix](./audits/V1_AI_CAPABILITY_TRUTH_MATRIX.md)
- [All capabilities wired](./audits/V1_ALL_AI_CAPABILITIES_WIRED.md)
- [Deployment readiness](./audits/V1_DEPLOYMENT_READINESS.md)
- [Final source-of-truth cleanup](./audits/V1_FINAL_SOURCE_OF_TRUTH_AND_TEST_CLEANUP.md)
- [Product truth forensic audit](./audits/V1_PRODUCT_TRUTH_FORENSIC_AUDIT.md)
- [Test truth inventory](./audits/V1_TEST_TRUTH_INVENTORY.md)
- [Documentation cleanup](./audits/V1_DOCS_CLEANUP_REPORT.md)

## Verification

```powershell
npx.cmd tsc --noEmit
npm.cmd run build
npm.cmd test
```
