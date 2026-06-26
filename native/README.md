# PIXEL FURY: ETHEREAL SPIRE — Native C++ Core

This directory contains a standalone C++20 gameplay simulation core for Pixel Fury. It models the requested production systems in deterministic, testable code:

- locked 60 FPS frame constants and Fibonacci attack timing;
- six physics-driven heroes with unique movement, specials, dashes, and hidden abilities;
- 25-floor tower planning, boss placement, bonfire flags, and rubber-band difficulty;
- adaptive enemy AI drives, including Archdemon tendency tracking and the hidden `SEARCH_GLITCH_OPENING` state;
- synthesized audio event generation for whoosh, impact, grunt, and timer layers;
- Verlet cloth dynamics for capes/scarves/robes;
- input buffering, negative-edge release queries, and mash-protection semantics.

## Build and test

```bash
cmake -S native -B native/build
cmake --build native/build
ctest --test-dir native/build --output-on-failure
```

Run the deterministic sample simulation:

```bash
./native/build/pixel_fury_sim
```
