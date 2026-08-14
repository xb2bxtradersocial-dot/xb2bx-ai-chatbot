# XB2BX Assistant — Frontend (React Chat Widget)

A polished, mobile-responsive chat widget for the XB2BX AI Assistant, built with
**React + Vite**. It talks to the backend in `../server` (`POST /api/chat`),
renders the assistant's **markdown** replies (tables, bold, lists), and keeps a
per-browser session so conversations group correctly in the admin panel.

## Design

Cream card · olive gradient header · serif headings · black pill buttons —
an elegant, minimal widget that works full-screen on mobile and as a centered
card on desktop. All branding/colours/copy are white-labelled in
[`src/config.js`](src/config.js) and the CSS variables in
[`src/styles.css`](src/styles.css).

## Run locally

```bash
npm install
cp .env.example .env     # point VITE_API_URL at your backend /api/chat
npm run dev              # http://localhost:5173
```

Make sure the backend is running first (`cd ../server && npm start`).

## Build for production

```bash
npm run build            # outputs to dist/
npm run preview          # preview the production build
```

Deploy `dist/` to any static host (Vercel, Netlify, etc.) and set
`VITE_API_URL` to your deployed backend URL.

## Structure

```
client/
  index.html
  vite.config.js
  .env                      VITE_API_URL
  src/
    main.jsx                React entry
    App.jsx                 State + API wiring
    config.js               Brand, copy, quick replies, API URL
    api.js                  sendMessage() + session id
    icons.jsx               Inline SVG icons
    styles.css              All styling (CSS variables for theming)
    components/
      Header.jsx
      WelcomeScreen.jsx
      MessageList.jsx
      Message.jsx           Markdown rendering
      QuickReplies.jsx
      Composer.jsx
      TypingIndicator.jsx
```

## Embed on any website (WordPress, etc.)

The build outputs a loader at `/embed.js` that injects a floating launcher bubble
(bottom-right) which opens the chat in an iframe. After deploying this `client/`
app (e.g. to Vercel), add ONE line before `</body>` on the target site:

```html
<script src="https://YOUR-WIDGET-URL/embed.js" defer></script>
```

`embed.js` auto-detects its own host, so the iframe loads from the same place.
On mobile it expands full-screen; the launcher toggles open/closed and the in-chat
✕ collapses it. The widget calls the backend set in `.env` / `src/config.js`.

## Customise

- **Brand / copy / quick replies** → `src/config.js`
- **Colours / fonts / sizing** → CSS variables at the top of `src/styles.css`
- **Embed on a real site** → render `<App />` into a container, or wrap it as a
  floating launcher bubble; the widget markup is self-contained.
