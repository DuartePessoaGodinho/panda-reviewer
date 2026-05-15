# Panda Reviewer

A desktop app that keeps your GitLab merge requests in front of you without interrupting your flow.

---

## The problem

Merge requests get stale. You forget to review them, your own MRs wait for feedback, and checking GitLab means opening a browser, navigating to the right project, and losing context. It's friction — small but constant.

## What it does

Panda Reviewer sits quietly in your system tray and polls GitLab in the background. It surfaces two things:

- **MRs waiting for your review** — so nothing gets missed
- **Your own open MRs** — so you can track feedback and status at a glance

When something needs attention, it's one click away. No browser, no context switching.

## How it works

The app connects to your GitLab instance using a personal access token you configure once. It polls for MR activity on a background interval and updates the tray icon when there's something to look at.

From the main window you can:
- See all MRs needing review, grouped and prioritized
- Browse diffs directly in the app
- Open the repo in your IDE with one click
- Run an AI-assisted review from your local branch
- Approve MRs without touching the browser

Everything is stored locally — no servers, no accounts, no telemetry.

## Installation

Download the latest release from the [Releases](../../releases) page:

- **Panda Reviewer Setup x.x.x.exe** — installs the app (recommended)
- **Panda Reviewer x.x.x.exe** — portable, no installation needed

## Setup

1. Open the app — the Settings window appears on first launch
2. Enter your GitLab URL (e.g. `https://gitlab.com`)
3. Paste a GitLab personal access token with `api` scope
4. Optionally configure your local repo paths and preferred IDE

The app lives in the system tray from that point on.

## Development

- `npm run dev` builds the Electron main process, starts Vite, and launches the app.
- `npm run build` type-checks and builds the Electron and renderer bundles.
- `npm run icons` regenerates `assets/icon.png` and `assets/icon.ico` from the scripted panda artwork. The Windows package uses `assets/icon.ico`; the Electron window and tray use `assets/icon.png`.

---

Built with Electron.
