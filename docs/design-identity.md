# jobu! identity

The user's latest design brief replaces the earlier green Nextrole identity, while retaining the minimal inbox and all existing workflows. Write the displayed name as **jobu!**. The supplied mascot sheet is a visual reference; the live character is an original inline SVG with independently animated pupils and expressions.

## Palette and readability

| Token | Color | Use |
| --- | --- | --- |
| Primary | `#F43F8E` | Main actions, active underline, unread dots, wordmark punctuation |
| Soft pink | `#FFB5D0` | Brand mark, avatar, active count, mascot body |
| Background | `#FFF6F9` | Application canvas |
| Charcoal | `#29232D` | Titles and primary text |
| Secondary | `#756D77` | Supporting copy, dates, placeholders |
| Brand ink | `#A91957` | Small pink text and focus outlines |
| Action ink | `#1D1821` | Text on primary pink buttons |

Primary pink with white small text falls below AA's 4.5:1 target. Use Action ink on Primary instead. Secondary on Background is approximately 4.70:1; on white it is 4.99:1. Success, growth, unknown, and applied statuses also carry text labels, with separate high-contrast semantic colors. Do not use opacity to wash out read or skipped rows.

Use white surfaces, restrained borders, 12–18 px corners, and consistent spacing. Keep the inbox visible immediately. The mascot occupies a small welcome area, moves into an empty state when appropriate, and appears as a small helper in the import form. It is not repeated on each job row or detail section.

## Live mascot

- Happy greeting on first load; calm as the default.
- Mouse pupils interpolate toward the pointer and stay bounded to ±5.5 px horizontally / ±4 px vertically inside the white eyes.
- Curious on interactive hover or keyboard focus; playful wink when hovering the character.
- Happy squash/stretch on successful actions, surprised on validation errors or empty searches, waiting during a user-requested map load.
- Occasional blinking and a gentle idle movement. Reactions expire back to the context's resting expression.
- One delegated controller with no network calls; cancel pointer frames when hidden, and clear/reset blink timers when the DOM changes.
- Touch keeps pupils centred while maintaining action reactions. Reduced motion disables tracking, blinking, idle movement, and CSS transitions/animations; expressions remain useful as static states.
- The character is decorative (`aria-hidden`) and never adds a tab stop. Form errors, empty-state text, and toast status messages remain available independently of the face.

The browser storage key remains `nextrole.prototype.v1`. Renaming it would lose continuity. The standalone exporter retains the old filename as a compatibility copy, with `jobu-prototype.html` as the new primary artifact.
