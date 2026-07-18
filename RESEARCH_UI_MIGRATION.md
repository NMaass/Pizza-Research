# Shared research UI migration

Pizza Research now consumes `@nmaass/research-ui` from the `research-ui-v0` branch of `NMaass/Chord-Research`.

The shared package owns the Number Research visual foundation and generic interface primitives. Pizza-specific workflow and visualization components remain local.

## Included in this migration

- shared shell, header, tabs, buttons, inputs, status messaging, and tokens
- JetBrains Mono-based visual alignment with the other Research applications
- semantic tab buttons and keyboard focus treatment
- visible startup API failure with retry
- editable restaurant name and address after receipt OCR
- hash-addressable application views
- removal of global lowercase transformation from user-entered values

## Follow-up

After the package API stabilizes, publish it to npm or move it to a dedicated repository and pin consumers to a release tag rather than a branch.
