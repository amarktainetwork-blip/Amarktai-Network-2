# Repo Workbench

Repo Workbench is the guarded coding workspace inside Amarktai Network. It can import GitHub repos, browse and edit files, run the Amarktai Coding Agent, generate and apply patch proposals, run checks, commit, push, create pull requests, and optionally merge or deploy.

## Required Environment

```bash
REPO_WORKSPACE_ROOT=/var/amarktai/workspaces
REPO_WORKBENCH_ALLOW_CUSTOM_COMMANDS=false
REPO_WORKBENCH_ALLOW_MAIN_PUSH=false
REPO_WORKBENCH_ALLOW_MERGE=false
REPO_WORKBENCH_ALLOW_DEPLOY=false
GIT_AUTHOR_NAME=Amarktai Agent
GIT_AUTHOR_EMAIL=amarktainetwork@gmail.com
```

## GitHub Setup

Open `/admin/dashboard/repo-workbench`, paste a GitHub token in the GitHub Connection card, and click **Save token**. The backend validates the token against GitHub's `/user` endpoint and masks it in all responses.

Without a token, public import may still work, but listing private repos, pushing, creating PRs, checking PRs, and merging are blocked.

## Import A Repo

Use the repo selector or enter `owner/repo`, choose a branch, then click **Import/sync**. Repos are stored under:

```text
/var/amarktai/workspaces/repos/
```

If the repo already exists, the backend fetches and updates instead of blindly recloning.

## Run Agent Work

Use the Agent Task panel:

- **Audit** inspects architecture and blockers.
- **Plan** creates a fix/build plan.
- **Generate patch** creates a patch proposal without applying it.
- **Apply patch** applies only after explicit approval.
- **Run AI** runs the guided audit/plan/patch pipeline.

The agent prompt requires surgical changes, no fake success, preserved working features, and verification commands.

## Run Checks

Allowed commands:

- `npm ci`
- `npm install`
- `npm run lint`
- `npm test`
- `npm run build`
- `npx prisma generate`
- `npx prisma db push`
- `git status`
- `git diff --stat`

Custom commands are blocked unless `REPO_WORKBENCH_ALLOW_CUSTOM_COMMANDS=true`.

## Pull Requests

After applying changes:

1. Enter a commit message.
2. Click **Commit**.
3. Click **Push**.
4. Click **Create PR**.
5. Use **PR status** to inspect mergeability.

Merging is disabled by default. Enable only with:

```bash
REPO_WORKBENCH_ALLOW_MERGE=true
```

## Deploy

Deploy is disabled by default. Enable only with:

```bash
REPO_WORKBENCH_ALLOW_DEPLOY=true
```

The dashboard requires a confirmation string:

```text
DEPLOY owner/repo
```

The backend runs only the approved deploy script and stores logs.

## Safety Rules

- No shell commands are built from unsafe strings.
- Commands run through `execFile`.
- Paths are resolved under `REPO_WORKSPACE_ROOT`.
- Branch names and repo names are sanitized.
- Secret/env files are blocked from view/edit.
- Binary and large files are blocked from the editor.
- Push to `main` is blocked unless `REPO_WORKBENCH_ALLOW_MAIN_PUSH=true`.
- Merge and deploy are disabled unless explicitly enabled by env.
- Logs redact tokens, API keys, bearer tokens, and secrets.

## Troubleshooting

- **GitHub token missing**: save a token in the GitHub card.
- **AI unavailable**: configure GenX or an approved direct coding provider.
- **Workspace not writable**: fix permissions on `REPO_WORKSPACE_ROOT`.
- **Merge disabled**: set `REPO_WORKBENCH_ALLOW_MERGE=true`.
- **Deploy disabled**: set `REPO_WORKBENCH_ALLOW_DEPLOY=true`.
- **Custom command rejected**: use an allowed command or explicitly enable custom commands.
