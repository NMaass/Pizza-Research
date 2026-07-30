# Research UI alignment

Pizza Research uses a small local, typed implementation of the Number Research shell and tokens in `client/src/research-ui.tsx` and `client/src/research-theme.css`.

The earlier draft referenced an unpublished Git branch package and declared a `Tabs` export that the package did not provide. That made the branch dependent on mutable external source and allowed TypeScript to pass against an API that would fail at runtime. The local compatibility layer mirrors the current shared package primitives while keeping this repository installable from its existing lockfile.

## Included

- shared shell, header, semantic navigation, buttons, inputs, status messaging, and tokens
- keyboard-accessible navigation and workflow controls
- visible startup, leaderboard, map, OCR, and submission failures
- editable restaurant name and address after receipt OCR
- hash-addressable application views
- no global lowercase transformation for user-entered values

## Follow-up

Once `@nmaass/research-ui` is published with a stable release and lockfile-compatible install path, replace the local compatibility layer with the released package and remove the two local files.
