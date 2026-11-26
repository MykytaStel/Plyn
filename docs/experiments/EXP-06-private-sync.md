# EXP-06 Private sync between devices

Status: not started · Feeds: after [0.30](../ROADMAP.md#0300--quality-gate) · Time box: 3 days (design only, no shipping code)

## Question

What is the simplest way for one reader to keep the same library and progress on a phone and a laptop, without their texts ever being readable by a server?

## Why it matters

Readers switch devices. Today the only path is a manual JSON backup (made easier in 0.21 through the share sheet). Sync is also the biggest privacy risk Plyn could take on, so it gets a design before any code.

## What we know

- `src/services/sync/types.ts` has a placeholder `SyncAdapter` contract (pull, push, delete documents).
- Invariant 6: user text never leaves the device, except the URL for URL import. Any sync must either keep data on devices (peer-to-peer, user's own cloud files) or encrypt it end-to-end so the server stores only ciphertext.
- Progress is a character offset, so merging progress is simple (latest wins, or furthest wins). Bookmarks and thoughts are sets.

## Options to compare

1. **Files in the reader's own cloud:** export/import a backup to iCloud Drive / Google Drive through the share sheet or File System Access API. No server. Manual or semi-automatic.
2. **End-to-end encrypted relay:** the Worker stores encrypted blobs (Workers KV, D1 or R2) keyed by a random library id; the key never leaves the devices (pairing by QR code). Needs key backup and recovery design.
3. **Device-to-device:** WebRTC transfer while both devices are open, paired by QR code. No storage on a server, but needs signalling and both devices online.

## Plan

1. For each option: threat model (what a server breach exposes), offline behaviour, conflict handling, cost, and what happens when a device is lost.
2. Define the merge rules per entity (document, progress, bookmarks, notes, thoughts, settings, stats).
3. Write the decision as a design in `docs/superpowers/specs/`.

## Success criteria

- A design where a full server breach exposes no text, titles or notes.
- Merge rules tested on paper against 5 conflict scenarios (same document read on two devices offline, delete on one and read on the other, and so on).

## Constraints

- No accounts with email/password unless unavoidable.
- The app stays fully usable without sync.

## Result

## Decision
