## Inspiration

The idea sparked from nostalgia for classic NES games and the challenge of bringing that authentic 8-bit experience to modern platforms. We wanted to democratize game creation by combining AI with retro aesthetics, letting anyone describe a game idea and see it come to life instantly.

## What it does

RES-9000 is a **NES-style game console** that runs directly in Reddit posts. Users can:
- Generate games using natural language prompts via AI (Gemini)
- Play authentic 8-bit games with 128×128 pixel displays
- Compete on leaderboards with other Reddit users
- Experience classic gaming with modern web technology

## How we built it

We crafted a **multi-layered architecture**:
- **Frontend**: HTML5 Canvas rendering with pixel-perfect 8×8 sprites
- **Game Engine**: QuickJS sandbox for secure JavaScript execution
- **AI Integration**: Gemini API for procedural game generation
- **Backend**: Express.js with Redis for state management
- **Platform**: Reddit's Devvit framework for seamless integration

The trickiest part was getting secure JS execution to run using QuickJS - ensuring user-generated code couldn't break out of the sandbox.

## Challenges we ran into

- **Sandboxing complexity**: Ensuring user-generated games run safely without compromising security
- **Performance optimization**: Maintaining 60 FPS with Canvas rendering and QuickJS execution
- **AI prompt engineering**: Teaching LLMs to generate valid game code with proper sprite definitions
- **Screen resolution**: Balancing authentic retro feel with modern usability (settling on 128×128)
- **Server timeout constraints**: Fitting AI game generation into 30-second server-side fetch timeout, which led us to use Gemini 2.5 Flash Lite for its speed

## Accomplishments that we're proud of

- **Authentic retro experience** with genuine NES-style graphics and sound
- **AI-powered game creation** that actually works reliably
- **Robust security model** with proper sandboxing
- **Reddit integration** that feels native to the platform
- **Complete game ecosystem** with leaderboards and social features

## What we learned

Building a game engine taught us the intricacies of **low-level graphics programming**. The biggest lesson: **Simple interfaces can hide incredible complexity** - a single text prompt generates complete games with sprites and game logic.

## What's next for RES-9000

- **Audio system**: 4-channel NES-style sound synthesis
- **Advanced graphics**: Background scrolling and tile animations
- **Better AI generation**: External services to overcome 30-second timeout limits

*The future is retro, and it's powered by AI.*