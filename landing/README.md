# Addicted Landing

Digital product studio landing page with immersive 3D WebGL experience.

## Tech Stack

- **Vite** — Build tool and dev server
- **Three.js** — 3D graphics and WebGL
- **Simplex Noise** — Procedural noise for organic animations
- **Resend** — Email API for contact form
- **Vercel** — Deployment and serverless functions

## Project Structure

```
├── src/
│   ├── main.js        # Three.js scene, animations, interactions
│   └── style.css      # Global styles
├── api/
│   └── send-email.js  # Vercel serverless function for email
├── assets/            # Product images
├── public/            # Static assets (favicon)
├── index.html         # Main landing page
├── agency.html        # Agency info page
├── privacy.html       # Privacy policy
├── terms.html         # Terms of use
└── vercel.json        # Vercel configuration
```

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Features

- **3D Animated Sphere** — Interactive liquid metal sphere with scroll-driven animations
- **Particle System** — Mouse-reactive floating particles
- **Glass Morphism UI** — Modern frosted glass card design
- **Drum Pad Sounds** — Interactive service icons with Web Audio API
- **Contact Form** — Email integration via Resend API
- **Responsive Design** — Optimized for mobile and desktop

## Environment Variables (Vercel)

```
RESEND_API_KEY=re_your_api_key
RESEND_FROM_EMAIL=Addicted Studio <noreply@addicted.design>
PROTON_EMAIL=your@email.com
```

## License

© 2025 Addicted Studio. All rights reserved.


