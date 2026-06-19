# stelow-pi

Pi extension stub for [stelow](https://github.com/cali/stelow).

## Overview

This is a lightweight stub package that allows `stelow` to be installed as a pi extension. The actual extension implementation lives in the main [`@renatocaliari/stelow`](https://www.npmjs.com/package/@renatocaliari/stelow) package.

## Installation

```bash
pi install npm:stelow-pi
```

Or via the main package:

```bash
pi install npm:@renatocaliari/stelow
```

## Dual-Install Pattern

This package follows the dual-install pattern (same as [context-mode](https://github.com/mksglu/context-mode)):

| Install Method | Target | Purpose |
|---------------|--------|---------|
| `npm install -g @renatocaliari/stelow` | CLI + Skills | CLI tools and 16 product skills |
| `pi install npm:stelow-pi` | Extension | Pi extension hooks and UI |

## Usage

Once installed, the extension automatically:

- Registers `/sw-start` and `/sw-start` commands
- Tracks workflow phases in `.product-workflow/tracking.json`
- Shows workflow progress in the UI footer
- Notifies on phase transitions

## Requirements

- Node.js >= 20.0.0
- pi.dev

## See Also

- [Main Package](https://github.com/cali/stelow) - Full documentation
- [DUAL-INSTALL-PATTERN.md](https://github.com/cali/stelow/blob/main/docs/DUAL-INSTALL-PATTERN.md) - Pattern reference