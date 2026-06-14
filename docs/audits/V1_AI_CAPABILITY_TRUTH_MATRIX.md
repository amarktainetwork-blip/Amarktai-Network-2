# V1 AI Capability Truth Matrix

The canonical matrix remains `src/lib/ai-capability-taxonomy.ts`. Phase V1 execution wiring is documented in `V1_ALL_AI_CAPABILITIES_WIRED.md`.

| Status | Count |
| --- | ---: |
| Working through the connected-app execution contract | 62 |
| Partially wired | 0 |
| Provider available, not wired | 0 |
| Unavailable | 0 |
| **Total** | **62** |

`working` means the capability has an approved provider route, a registered adapter, payload validation, a connected-app scope, and a truthful runtime result contract. It does not mean credentials, provider account access, custom endpoints, or artifact storage are configured in every deployment. Those conditions return `needs_configuration` or `failed`; they never return fake success.

Provider and model selection still derives from the canonical provider mesh and universal model catalog. This document is an audit summary, not another runtime registry.
