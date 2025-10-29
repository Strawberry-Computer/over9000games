## Inspiration

The idea sparked from nostalgia for classic NES games and the challenge of bringing that authentic 8-bit experience to modern platforms. I wanted to democratize game creation by combining AI with retro aesthetics, letting anyone describe a game idea and see it come to life instantly.

## What it does

RES-9000 is a **NES-style game console** that runs directly in Reddit posts. Users can:
- Generate games using natural language prompts via ChatGPT 5
- Play authentic 8-bit games with 128×128 pixel displays
- Compete on leaderboards with other Reddit users
- Experience classic gaming with modern web technology
- Enjoy 4-channel NES-style audio and side-scrolling worlds

## How I built it

I crafted a **multi-layered architecture**:
- **Frontend**: HTML5 Canvas rendering with pixel-perfect 8×8 sprites and 4-channel Web Audio
- **Game Engine**: QuickJS sandbox for secure JavaScript execution
- **AI Integration**: ChatGPT 5 API for procedural game generation
- **Backend**: Express.js with Redis for state management and async job processing
- **Platform**: Reddit's Devvit framework for seamless integration
- **Local Development**: Proprietary testbed system using Node.js ESM loader hooks to intercept and mock Devvit APIs, enabling full local development without deploying to Reddit's infrastructure

The trickiest parts were:
1. Getting secure JS execution to run using QuickJS - ensuring user-generated code couldn't break out of the sandbox
2. Building the testbed system to mock Reddit's proprietary Devvit platform locally without modifying source code

## Challenges I ran into

- **Sandboxing complexity**: Ensuring user-generated games run safely without compromising security
- **Performance optimization**: Maintaining 60 FPS with Canvas rendering and QuickJS execution
- **AI prompt engineering**: Teaching ChatGPT 5 to generate valid game code with proper sprite definitions
- **Screen resolution**: Balancing authentic retro feel with modern usability (settling on 128×128)
- **Server timeout constraints**: Implementing async job architecture to handle AI game generation within Reddit's API constraints

## Accomplishments that I'm proud of

- **Authentic retro experience** with genuine NES-style graphics, 4-channel audio, and side-scrolling support
- **ChatGPT 5-powered game creation** that actually works reliably from simple text prompts
- **Overcoming Reddit's timeout limits** by leveraging ChatGPT's Responses API with async job polling
- **Proprietary Reddit testbed system** using Node.js loader hooks to mock Devvit APIs for local development without altering source code
- **Robust security model** with proper QuickJS sandboxing for user-generated code
- **Reddit integration** that feels native to the platform with seamless post creation
- **Complete game ecosystem** with leaderboards, high scores, and social features

## What I learned

Building a game engine taught me the intricacies of **low-level graphics programming**. The biggest lesson: **Simple interfaces can hide incredible complexity** - a single text prompt generates complete games with sprites and game logic.