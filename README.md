# SubtleSports

Subtle live cricket &amp; tennis scores in your terminal — a small [Ink](https://github.com/vadimdemedes/ink) TUI.

## Install / run

Run it directly with `npx`, no install required:

```bash
npx subtlesports
```

Or install it globally:

```bash
npm i -g subtlesports
subtlesports
```

Requires Node.js ≥ 18.

## Usage

1. **Sport picker** — shown on every launch, choose cricket or tennis.
2. **Match list** — live matches for the chosen sport.
3. **Live match view** — live, polling score updates for the selected match.

### Keybindings

| Key | Action |
| --- | --- |
| `↑` / `↓` | Navigate |
| `enter` | Select |
| `o` | Open match in browser |
| `esc` | Back |
| `q` | Quit |

Cricket detail views:

| Key | Action |
| --- | --- |
| `s` | Scorecard |
| `b` | Ball-by-ball |
| `p` | Partnership |

## Tennis notes

Covers both ATP and WTA tours. Grand Slams are shown first, and matches are grouped by
draw type (singles / doubles / mixed). A serving indicator is shown on featured courts
where ESPN provides it.

## Data sources

- **Cricket**: ESPN cricinfo
- **Tennis**: ESPN tennis scoreboard

Both are free and require no API key.

## Config

SubtleSports reads (and creates on first run) `~/.subtlesports/config.json`:

```json
{
  "pollIntervalSeconds": 30,
  "preferredTeams": []
}
```

- `pollIntervalSeconds` — how often live match data is refreshed.
- `preferredTeams` — team names to highlight/prioritize in match lists.
