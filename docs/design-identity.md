# jobu! identity

The latest user reference asks for more gray/black, a light-gray canvas, and pink as accent/highlight. Retain the minimal inbox and its workflows. Write the displayed name as **jobu!**, with no preceding logo icon. The supplied mascot sheet remains the character reference; the live character is an original inline SVG with independently animated pupils and expressions.

## Palette and readability

| Token | Color | Use |
| --- | --- | --- |
| Pink accent | `#F078AC` | Active underline, unread dots, wordmark punctuation |
| Soft pink | `#F7BAD4` | Avatar, active count, S-tier lettering, header focus outlines |
| Background | `#E9E9EC` | Light-gray application canvas |
| Charcoal | `#242328` | Header, main actions, titles, S-tier badge |
| Secondary | `#68636D` | Supporting copy and dates on light surfaces |
| Brand ink | `#96214F` | Small pink text and focus outlines on light surfaces |
| White | `#FFFFFF` | Reading surfaces, text on charcoal actions/header |

Use white text on charcoal actions, dark text on light reading surfaces, and light gray for the dark search input's placeholder. Pink is an accent, not the canvas color. The representative browser contrast checks target 4.5:1 for normal text using the actual computed foreground and opaque ancestor background. Do not use opacity to wash out read or skipped rows.

Use **S / A / B / C** with a short label in the inbox and a single tier summary plus reasons in details. S has a charcoal badge with pink lettering, A has a pale-pink highlight, and B/C use neutral grays. No numeric fit score, growth score, or progress bar. Missing data is labelled **รอเช็กข้อมูล** independently; hard constraints have their own warning. See README.md for the meanings and provisional import rules.

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
