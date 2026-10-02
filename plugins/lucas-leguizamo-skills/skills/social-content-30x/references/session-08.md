# Session 8 — AI for content creation: projects, skills, viral research and generation (Sesión 8 — Sistemas de venta con contenido)

Problem: creators want AI to produce more content without becoming a 100% clone of their references → map the manual workflow first, give the AI persistent brand context (project / skills), then automate research, generation and measurement step by step.

> Note: the program index titles this session "sales systems with content", but the class was entirely about applied AI for content creation. Use this file for AI/automation questions.

## Key ideas
- **Four-phase frame: research → create → automate → measure.** All matter, but *creating* is the most important: you can create without researching, never the reverse.
- **Map the manual process before automating anything.** "Si no tenemos nuestro proceso manual medianamente definido, no vamos a poder automatizar" (if the manual process isn't reasonably defined, you can't automate it). Write it down or simply dictate it to the AI.
- **Reference loop used by the instructors' team:** know who you are (niche, what you talk about) → whom you talk to (ICP) → find references → analyze them → adapt to your brand → publish → measure → repeat. The loop is what lets you scale: you always know what worked.
- **ICP (ideal customer profile)** = patterns of who your customer really is and *why* they buy, not just demographics. Example used: people who go to a gym to socialize vs. to train need different messaging; a gym that turned every class into a small, hyper-focused "event" (specific formats, women-only, glutes-only…) won because its ICP wanted experiences, not equipment. Understanding the ICP makes selling easier and focuses the content.
- **UGC (user-generated content)** = content made by other people, usually talking about your product/service. The same pipeline builds a UGC piece, an avatar or any talking AI character: create the avatar → give it a personality → communicate that personality.
- **AI "projects" = persistent brand context** with four parts:
  1. *Instructions* — rules every answer must follow (e.g., "every script has hook + development + CTA", "these 10 formats work for me").
  2. *Memory* — what the tool learns across chats in the project (can be private or shared).
  3. *Context / knowledge base* — upload product PDFs, scripts, transcripts of what already worked, docs of hooks from references, a spreadsheet of references with their transcripts.
  4. *Scheduled tasks* — recurring prompts (daily scripts, weekly ideas, daily project analysis).
- Even with only context loaded (no instructions/memory), output already adopts the brand's angles, voice and regional slang — far better than a cold chat.
- **One project per client / program**, because memory and context cross-contaminate between brands. If you serve many clients and don't want a project each, use a skill per format instead, or give explicit per-account instructions ("for account X, ignore all other documents").
- A project dedicated to one job works best (e.g., "script generator for selling program X") with full instructions: name, URL, format, price, dates, CTA, speakers + credentials, ICP segments, testimonials, main sales angles, spokespeople and tone per spokesperson, script formats (hook → agitation → solution).
- **Dictate instead of typing prompts.** Speaking conveys far more context; typing makes people terse and tactical. You don't need to know how to structure instructions/memory/context — dictate your goal and ask the AI to organize it for you. Applies to instructions, skills and agents.
- **Skills freeze a validated format.** Once a script mold works, turn it into a skill and invoke it from any chat with no extra instructions. Example skeleton ("3 things" format): hook with a number + promise → reframe line → element 1 → element 2 → mid CTA (save/follow) → element 3 → closing mantra. Answer to "how do I scale without losing identity".
- **Artifacts = shareable interactive mini-apps**, not chats. A chat or a project can't be used by third parties; an artifact can (link; viewer needs at least a free account). Use cases shown: an interactive brand-diagnosis form replacing a multi-page Word brief (≈10 questions, sends a summary by message/PDF/email); a dashboard of viral reels with filters; a script generator that rewrites any script in the spokesperson's style or outputs voice-ready scripts with emotion tags for a TTS tool. Rule: take whatever you do manually or in a document and ask "how could this be an interactive artifact?" — for clients or internal use.
- To let anyone use an artifact without the AI platform, deploy it as a website (Vercel recommended over Netlify because it scales and supports databases).
- **Model tiers:** use the mid/strong general model for most work; reserve the top-tier, token-hungry model for deep research, market studies or exhaustive multi-document diagnoses; trivial questions don't need a strong model.
- **Connectors / MCP** ("Model Context Protocol") link the AI to other tools (analytics, viral-research tools, generation platforms). The chat assistant can't generate images/video by itself, but via a connector to a generation platform it can create and animate images from chat.
- **Viral research can be automated** (scraping/viral-discovery tools via API or MCP: "bring me 10 formats with >1,000 likes in my niche"). The instructors' internal tool pulls references daily, scores them, lets the team approve/reject, reassign a reference to another account, transcribe + translate + rewrite the script in the brand's voice, then hand off to editing.
- **Measure what generic analytics tools don't give you:** followers gained/lost per post, net followers per period, daily average, follower spikes, top posts by likes/views/comments, posting volume vs. target, outlier map (posts above median views = replicate; below = drop).
- **Generation platforms are "model libraries"**: they aggregate third-party image/video/audio models under one credit balance so you don't pay each model separately. Pick one of the two leading ones and learn it.
- **Every model is specialized — choosing wrong burns credits.** Text-heavy posters/ads → GPT image models; realistic people → Nano Banana Pro; faces → Soul; complex scenes with people → Nano Banana; realistic video with audio → Seedance (instructor's #1 at the time). The same prompt yields different results per model.
- **Models leapfrog every few months** (Veo 2 → Veo 3/3.1 → Seedance…). Stay active and re-test.
- **Specialists beat all-in-one for avatars and voice:** HeyGen for talking avatars, ElevenLabs for voice/audio, even though the aggregators also offer them. A talking avatar = a video/image + a separate audio track joined together.
- **Character sheet is mandatory before generating yourself/an avatar:** one horizontal image with four views — frontal close-up of head and face (ears, hair visible), frontal medium shot (head to hip), side medium shot, full body — plus height/weight context, so the model doesn't invent proportions. Use the highest-quality reference photo possible.
- Presets/"recreate" features (and a browser plugin that recreates any Pinterest/web photo with your character) let you ride trends without mastering every tool.
- **Agent teams as a no-workflow alternative:** a desktop agent app can spin up a "marketing department" — creative director (the only one you talk to, approves and reports) + references, strategy, copy, performance, social-media agents — and return references, a 30-day priority plan and copies without any API integrations. Older custom GPTs → now projects, skills and agents; same automation logic.
- Orchestration options once each step is mapped: n8n, the AI coding tool itself, or an agent app.

## Numbers & rules of thumb
- 4 phases: research, create, automate, measure.
- Class deliverables targeted: a brand project, 10 hooks, a first script, a minimum 2-week content calendar, one AI-generated piece.
- Instructors' team ran >10 programs → one AI project per program.
- Manual reference work before automating: ~500–600+ cases done by hand (likes, saved formats, spreadsheet).
- "If this gets me to 500,000 followers, it's easier to do it manually than to keep improving a tool."
- Viral-reels dashboard example: 178 reels analyzed; filter example "≥51,000 likes".
- Internal reference scorecard: references should generally have >10,000 likes (exceptions for small accounts that went viral), scored for alignment with brand/feed and ICP.
- Example research query: "10 formats with >1,000 likes in my niche".
- Posting target per account on the internal dashboard: 12–14 pieces per day (more than 10/day).
- A simple workflow tool (search → analyze → recreate → record → edit) can be built in about one week if the process is defined and simple; complex team tool needed roles/permissions for 6+ designers and 6+ editors.
- Scheduled-task example: every Monday 8 a.m., 3 post ideas from last week's sector news; or 10 new scripts daily.
- Brand-diagnosis artifact: ~10 questions replacing a 4–5-page Word brief.
- Gym example: classes of 10–15 people, 5–10 different sessions per day.
- Character sheet: 4 views.
- Agent team: 5 roles + creative director; 30-day priority plan; agent app free trial 7 days.
- Example reference surfaced by agents: 142,000 likes, 4,400 comments.
- B-roll ask: 3 video options per video.
- Avatar video faces used to distort on longer durations until ~3 months before the class.
- Credits (image, per generation): GPT Image 2 ≈ 6.5 credits; GPT Image 2.5 ≈ 3 credits (16:9 also 3).
- Credits (video): preset clip 42 credits; custom Seedance 2.5 prompt ≈ 45 credits; 12-second Seedance 2.5 clip = 108 credits.
- Use "fast" model versions: nearly the same output, cheaper.
- Unlimited short-term plans (1/3/7 days) exist — e.g., ~USD 420 for 3 days unlimited Seedance 2.5 at 1080p; worth it for a burst project (e.g., a film) vs. burning a monthly plan.
- Deployment cost: domains from ~USD 1 first month; Vercel free tier goes a long way.
- ElevenLabs free tier: a limited character allowance (instructor unsure: ~7,000–15,000 characters); pay when you need tool-to-tool automation.
- Pricing tip for AI-powered services: consumers rarely pay per use; package into plans/subscriptions or credit bundles rather than per-token billing. Ask the AI to report tokens consumed and estimated cost per message to learn your costs.

## Frameworks / step-by-step methods
**A. Build your brand AI project**
1. Create a project; state its purpose (e.g., scripts, brand identity, avatars for social).
2. Dictate instructions: goal, formats that work, script structure (hook + development + CTA), tone.
3. Upload context: product/program PDF, ICP, tone, transcripts of your own winning videos, docs of hooks from references, spreadsheet of references + transcripts.
4. Ask for outputs (hooks, scripts, calendar); for calendars, paste many proven hooks into context first.
5. Add scheduled tasks for recurring ideas/scripts/analysis.
6. When a format is validated, convert it into a skill.

**B. Content workflow to map (then automate)**
1. Define who you are / niche / what you talk about.
2. Define who you talk to (ICP).
3. Find references (manual likes/saves → later scraping tools).
4. Review insights (likes, comments, saves) and approve/reject.
5. Transcribe/translate and adapt the script to your brand voice.
6. Record (or generate) → send to editor → QA the edit.
7. Publish → measure → loop.

**C. Generate yourself/an avatar**
1. Build a character sheet (4 views) from your best photo.
2. Load it as reference in the generation platform.
3. Write a detailed prompt (scene, action, rhythm); test several models side by side and compare cost.
4. For video, use the character image, choose aspect (9:16), keep the subject close to camera.
5. Talking avatar: generate voice (ElevenLabs, with emotion tags) + video/avatar (HeyGen) and combine.

**D. Agent team (alternative to building workflows)**
1. Describe your full process to the agent app (references → classify by ICP → transcribe/translate → recording reminders → approval by an agent that knows your voice → editor follow-up → QA → AI B-roll).
2. Let it propose agents (creative director + references, strategy, copy, performance, social).
3. Load your context (audience, pillars) and train it with feedback.

## Tools mentioned
- **Claude** (web or desktop app; desktop recommended for extra computer-use features): projects, memory, skills, artifacts, scheduled tasks, connectors/MCP, Claude Code (used to build the internal tool), Claude Design (only native image-making option).
- **ChatGPT**: ~USD 20–25/month plan; if you only need images, it may be enough instead of a generation platform. Custom GPTs used earlier for prompt generators.
- **Virlo** (viral content discovery; agents, account tracking, CTA/script/format analysis; API + MCP): free trial; Starter USD 49/mo, Pro USD 200/mo; annual billing ~30% off.
- **Apify** (scraping, API-first; used for Instagram scraping).
- **Higgsfield** (model aggregator + presets, marketing studio, browser recreate plugin, MCP): from USD 15/mo = 200 credits (~100 images or ~11 Seedance 2.0 Fast 8s videos) — not recommended; USD 49/mo = 1,000 credits (~500 Nano Banana images or ~44 videos of 7–8 s) — recommended minimum.
- **Magnific** (ex-Freepik, model aggregator, MCP): COP 65,000 plan = 20,000 credits (~21 videos or ~133 images); COP 146,000 plan includes unlimited Nano Banana and 300+ images with other models. Credit units aren't comparable across platforms.
- Models named: GPT Image 2 / 2.5, Nano Banana, Nano Banana 2, Nano Banana Pro, Soul, Seedream 4.5, Veo 2/3/3.1/3.1 Fast, Kling 3.0 (and Turbo), Seedance 2.0 / 2.5.
- **HeyGen** (avatars), **ElevenLabs** (voice; v3 emotion tags like laughs/gasps/shouts; Multilingual v2), **Wispr Flow** (dictation/transcription), Gemini (transcription), Metricool (social analytics, connectable via MCP), n8n, Vercel/Netlify, Pinterest (reference images), Opus Clip, an agent-team desktop app (name garbled in recording; 7-day trial).

## Pitfalls / what instructors warned against
- Automating before you have a defined manual process — or before you have volume. Early on, liking/saving formats by hand is enough; a half-built tool without experience or content volume may give worse references than manual curation.
- One project for many clients/brands → memory and context bleed between them.
- Copying references 100%: fine while learning (most viewers won't notice), but at scale people notice repetition; use your project/skills to keep the format while adding your identity and tone.
- Typing short, tactical prompts instead of dictating rich context.
- Using the top-tier model for everything (burns tokens); using the wrong generation model (burns credits — the most common early waste).
- Cheapest generation plans are too small to be useful.
- Weak prompts ("dog dancing") give generic output; describe scene, subject, action and rhythm.
- Subject far from the camera in AI video → the model loses facial patterns; low-quality reference photos → worse likeness.
- Paying for tools too early: use free tiers until they stop being useful; pay when you need to automate/scale.
- Not staying current: today's best model is surpassed within months.
- Watching without doing: "Esta clase no va a servir para nada si ustedes no salen de aquí a hacer" (this class is useless unless you go and do it).
