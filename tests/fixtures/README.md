Place only anonymised fixtures here.
Private samples go in `tests/fixtures/private/` (gitignored).

## Unit tests

```bash
npm test
```

Runs Node’s built-in test runner (`tests/*.test.js`). ICS delivery tests **emulate** iOS Safari vs desktop (UA, `navigator.share`, `window.open`) — they do not launch real WebKit.
