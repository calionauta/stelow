---
"@calionauta/stelow": minor
---

Removed the Muxy and Herdr integration trees. The host-agnostic adapter pattern replaces them: Pi is specialized under `extensions/stelow/adapters/pi/`, Fusion receives generated `.fusion/commands/` artifacts, and the canonical TypeScript scope parser remains covered in `extensions/stelow/state.ts`.
