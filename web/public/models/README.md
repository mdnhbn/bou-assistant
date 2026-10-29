# Character assets

Place your own character assets in this folder:

- Bou VRM model: bou.vrm
- Aether VRM model: aether.vrm
- Optional front-facing portrait for 2D mode: bou.png and aether.png

The app requests them at /models/bou.vrm, /models/aether.vrm, /models/bou.png, and /models/aether.png. Missing files are handled in the interface and will not crash the app. If a 2D portrait is missing, the UI tries to show a captured frame of the matching VRM model.