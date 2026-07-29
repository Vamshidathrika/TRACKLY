---
name: harness-testing-agent
description: AI-driven visual E2E testing agent integrated with awizemann/harness. Drives web apps (WKWebView), iOS Simulators, and macOS apps via Set-of-Mark visual overlays, executing actions and reporting friction points. Triggers on requests like "run harness test", "test web UI", "E2E visual test", "test user flow", "run UI testing agent".
---

# Harness Testing Agent Skill

This skill configures and operates **Harness** ([https://github.com/awizemann/harness.git](https://github.com/awizemann/harness.git)) as an AI-driven user testing agent in Antigravity / Claude.

Harness is a native macOS developer tool and standalone MCP server (`harness-mcp`) that drives UI targets using **Set-of-Mark (SoM)** visual overlays. It enables step-level UI testing without requiring API keys or external LLM loops for direct actions.

---

## 1. Quick Setup & Installation

To build and install `harness-mcp` locally on macOS:

```bash
# Run the automated setup script in project root:
./scripts/setup-harness.sh
```

Or manually:
```bash
git clone https://github.com/awizemann/harness.git ~/.harness-src
cd ~/.harness-src
xcodegen generate
xcodebuild -project Harness.xcodeproj -scheme HarnessMCP -configuration Debug -derivedDataPath ./.build/derived build
# Copy standalone binary to executable path
cp ./.build/derived/Build/Products/Debug/harness-mcp /usr/local/bin/harness-mcp
```

---

## 2. MCP Tools Reference (`harness` server)

When `.mcp.json` is configured, the following tools are exposed by `harness-mcp`:

### Step-Level Direct UI Sessions (No API Key Required)
| Tool | Description | Key Arguments |
|---|---|---|
| `start_ui_session` | Launches target UI | `platform` ("web" \| "ios"), `url` (for web), `viewport` ("desktop" \| "mobile"), `artifact_dir` |
| `observe_ui` | Takes visual screenshot with Set-of-Mark overlays | `session_id`, `clean` (boolean for raw image without badges) |
| `act_ui` | Performs a single UI action and auto-observes | `session_id`, `tool` ("tap_mark", "type", "scroll", "navigate", "key_shortcut"), `target_mark_id`, `text` |
| `end_ui_session` | Gracefully closes target session | `session_id` |
| `list_ui_sessions` | Lists currently active UI sessions | None |

### Autonomous Run Management
| Tool | Description |
|---|---|
| `start_run` | Starts an autonomous LLM-driven test run for a goal |
| `get_run_status` | Polls current status of an ongoing run |
| `get_run_result` | Fetches final verdict, action log, and friction report |
| `list_runs` | Lists historical agent runs |

---

## 3. Web Testing Workflow (Example: Next.js App)

### Step 1: Ensure Target Dev Server is Running
Ensure the application web server is up (e.g., `http://localhost:3000`).

### Step 2: Start UI Session
```json
// Call start_ui_session
{
  "platform": "web",
  "url": "http://localhost:3000",
  "viewport": "desktop"
}
// Returns session_id: "ui_sess_12345"
```

### Step 3: Observe & Act (Set-of-Mark)
1. Call `observe_ui`: Receives screenshot with numbered mark badges (e.g., `[1] Login button`, `[2] Email input`).
2. Call `act_ui`:
   ```json
   {
     "session_id": "ui_sess_12345",
     "tool": "type",
     "target_mark_id": 2,
     "text": "test@example.com"
   }
   ```
   ```json
   {
     "session_id": "ui_sess_12345",
     "tool": "tap_mark",
     "target_mark_id": 1
   }
   ```

### Step 4: End Session & Summarize Report
Call `end_ui_session` and present summary:
- **Goal Completion**: PASS / FAIL / BLOCKED
- **Replayable Actions**: List of executed steps with mark IDs
- **Friction Points**: Flagged delays, broken element targets, or unexpected visual behavior

---

## 4. Operational Best Practices

1. **Absolute Paths for Artifacts**: Always supply absolute paths when setting `artifact_dir`.
2. **Clean Teardown**: Always call `end_ui_session` in a `finally` block or completion step to avoid lingering WKWebView instances.
3. **Concurrency**: Harness limits concurrent UI sessions to **2** per machine.
