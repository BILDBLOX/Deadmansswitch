# Deadman's Switch

A small, self-contained desktop app that gives you a physical-feeling "kill
switch" for your PC: lift the safety cover, arm the launch button, then
confirm with a global hotkey to instantly close the apps you picked, sign
out, shut down, or throw up a fullscreen decoy tab. MIT licensed, zero
runtime dependencies beyond Electron, and built to be easy to drop into
other projects.

## Why

Sometimes you want one unmistakable action that gets you out of whatever's
on screen — closing distracting apps, ending a stream/game instantly, or
covering your screen with something boring — without fumbling through a
dozen alt-tabs. This app makes that action deliberate (two stages, one of
them a system-wide hotkey) so it's very hard to trigger by accident, but
still just two beats once you've decided to use it.

## How it works

1. **Lift the cover.** Click the hinged safety lid over the button. The
   button lights up and becomes live.
2. **Press the button.** A hazard-striped blast shield slides down and
   locks over the button — it can't be pressed again. The app is now
   *armed* and status shows `ARMED`.
3. **Press the trigger hotkey** (default `F3`, configurable) — anywhere,
   even if the app isn't focused. This is what actually fires the switch:
   pressing the hotkey before arming does nothing at all.

Once triggered, the app runs your configured action and then closes
itself.

You can cancel any time before the hotkey fires by clicking **DISARM** or
pressing `Esc`, which resets the cover.

## Configuring what it does

Click the gear icon (only available while the switch is disarmed) to open
Settings:

- **Processes** — pick from currently running processes, or type in any
  process name (e.g. `chrome.exe`, `Discord.exe`, `Spotify.exe`) to add it
  to the close list. Nothing is closed unless you put it here.
- **Action** — after closing the selected processes, optionally also:
  - do nothing else,
  - sign out of Windows,
  - shut down the PC, or
  - open a fullscreen decoy tab at a URL you choose (e.g. a work document).
- **Hotkey** — click the box and press whatever key/combo you want as the
  trigger. Must be something Electron can register as a global shortcut.

Settings are saved to a JSON file in the app's user-data directory and
persist between launches.

## Safety by design

- **The hotkey is inert until you arm it.** Registering the global
  shortcut only happens after you've lifted the cover *and* pressed the
  button — so an app that happens to also use `F3` won't get accidentally
  hijacked, and a stray keypress before arming is a no-op.
- **System-critical processes can never be selected**, no matter what's in
  the config file. `src/processes.js` hard-codes a blocklist (Explorer,
  the login/session/shell processes, Defender, `services.exe`, `lsass.exe`,
  etc., plus the app's own process) that's checked again immediately
  before anything is closed. The goal is to end user-facing apps —
  browsers, games, chat clients — never the OS itself.
- **Config can't change once armed.** Settings are locked out the moment
  the button is pressed, so what fires is exactly what you saw when you
  armed it.

This is a convenience tool, not a sandbox — it shells out to `taskkill`
and `shutdown`, the same commands you could run yourself. Only add
processes/actions you're comfortable having end instantly.

## Get it (no build required)

Grab the latest build from a [Release](../../releases) on this repo — two
flavors, both single files, both just double-click-and-run:

- **`Deadman's Switch Setup <version>.exe`** — one-click installer. Installs
  to your user profile (no admin needed), adds a Start Menu entry and
  desktop shortcut.
- **`Deadman's Switch Portable <version>.exe`** — no install at all. Drop it
  anywhere (even a USB stick) and double-click it to run.

Both are unsigned (no code-signing certificate), so Windows SmartScreen will
likely show a "Windows protected your PC" prompt the first time. Click
**More info → Run anyway**. This is normal for small open-source tools
without a paid certificate, not a sign anything is wrong — you can read
every line of what it does right here in this repo.

## Requirements

- Windows (uses `taskkill` and `shutdown`; process listing uses
  `tasklist`). The UI will run on other platforms for development, but the
  close/sign-out/shutdown actions are Windows-specific.
- [Node.js](https://nodejs.org/) 18+ to run from source.

## Running from source

```bash
npm install
npm start
```

## Building a standalone .exe

```bash
npm install
npm run dist
```

This uses [electron-builder](https://www.electron.build/) (configured in
`package.json`) to produce, in `dist/`:

- `Deadman's Switch Setup <version>.exe` — the one-click NSIS installer
- `Deadman's Switch Portable <version>.exe` — the no-install portable build

Both bundle their own Electron/Chromium runtime, so nothing else needs to
be installed on the machine that runs them. The app icon lives at
`build/icon.ico`.

Building the Windows target from Linux/macOS needs [Wine](https://www.winehq.org/)
installed (`wine` + `wine32`/`wine64` — used only to write the `.exe`'s
icon and version info, nothing else). Building from Windows itself needs
nothing extra.

## Using this in another project

The app has no runtime npm dependencies beyond Electron itself, and the
logic is split into small, dependency-free modules under `src/` so you can
lift what you need:

- `src/processes.js` — list running processes / force-close a list of
  process names, with the protected-process blocklist baked in.
- `src/actions.js` — sign out, shut down, or open a fullscreen "decoy"
  window; wraps `processes.js` to run the full trigger action.
- `src/config.js` — load/save a JSON config file in the OS user-data
  directory.

`main.js` wires these into an Electron app (window, IPC, global hotkey
arm/disarm state machine); `src/renderer/` is the animated UI. Copy the
whole repo in as a starting point, or `require()` the `src/` modules
directly from your own Electron `main` process.

## Project structure

```
main.js                 Electron main process: window, IPC, hotkey/arm state
preload.js               contextBridge API exposed to the renderer
src/
  config.js               Config load/save (JSON in userData)
  processes.js             Process listing/killing + protected blocklist
  actions.js                Sign out / shut down / open decoy tab
  renderer/
    index.html               UI markup
    styles.css                Animated console/hatch/blast-shield styling
    app.js                     Renderer state machine + settings panel
```

## License

MIT — see [LICENSE](LICENSE).
