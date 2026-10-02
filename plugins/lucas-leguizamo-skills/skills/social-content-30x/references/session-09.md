# Session 9 — Digital assets and AI avatars (Sesión 9 — Activos digitales y avatares con IA)

Problem: you cannot (or do not want to) record every piece of content yourself → build an AI avatar with a defined identity (DNA sheet), a consistent look (character sheet), a cloned voice (ElevenLabs) and a talking video model (HeyGen), then automate only a few base formats in a hybrid with real human content.

## Key ideas
- **An avatar is not an agent.** An avatar is a representation with identity and personality (who it is, what it does, how it talks). An agent (e.g. a bot that searches and analyzes automatically) has no personality.
- Two senses of "avatar" are used in the program: the **customer avatar** (who you are talking to) and the **digital avatar** (the character that produces content). Do not confuse them.
- Reference case: "Cora", the fictional "sister" of Andrés Bilbao, an AI-built persona posting about AI; it reached ~30,000 followers before a ban. It copies proven formats, but a human curates what it talks about.
- **The hard part is identity, not technology.** Generating an avatar keeps getting easier; giving it a clear personality and a clear niche is the real work. The same identity exercise applies to your own personal brand.
- **AI works better with context and references.** "AI doesn't know anything" by itself — feed it the DNA sheet once so you do not have to re-explain who you are and what your audience's pains are every time.
- **Visual anchors** make content recognizable at first glance and keep you in the audience's memory: a signature background/set (e.g. Bilbao's bookshelf spot), hair, Legos in the background, a watch, glasses, a mole, red lipstick, a coffee mug, a signet ring. Most creators do not define them deliberately — do it.
- Build characters like film characters: a past event that marked them, the wound it left, a desire, a visible flaw that humanizes them, a mission.
- **Reference-image trick for avatar photos:** take a Pinterest image of the setting/format you want (e.g. podcast set), paste it with the avatar's character sheet and prompt "recreate image 1 with the person from image 2". Output usable for Stories, carousels and as the base frame for talking video.
- HeyGen's native voice is weak → connect ElevenLabs via API key and pick the cloned voice directly inside HeyGen, so no manual audio download/upload is needed.
- Use **real spoken content** (no music) to clone a voice: people speak differently when reading a script than when creating content.
- The talking-video model copies whatever the person does in the base video: a static base video produces a static avatar. Invest in that first recording.
- **Anti-ban posture:** Instagram does not currently detect "avatar vs. not avatar" ("Hoy por hoy, Instagram no sabe si es avatar o si no es avatar" — today Instagram can't tell whether it's an avatar), but it does detect bot behavior patterns. Make it look organic and use the account like a person.
- **Hybrid, not all-or-nothing:** neither fully automated nor fully recorded. Automate only the formats that are most expensive to record.
- Avatars are a complement: "lo más importante es que nos vean a nosotros" (the most important thing is that people see us); the instructors expect human content to win long-term.
- **Bots do not learn by themselves.** Give them a weekly feedback loop with winners vs. losers and their metrics; treat the bot like a new employee who needs context.
- Referent filtering (Apify, Virlo, the course's content bot): specific hashtags + a curated list of referents + minimum thresholds (likes, followers, comments, saves) combined into a score. Thresholds scale with niche size — small niches can use much smaller referents.
- A quick tool can start as a Claude artifact; when it needs a database, build it properly (the course's internal referent tool was built with Claude plus a developer).
- If a content bot produces non-actionable scripts, the problem is the referents and the instructions: fix referents first, then ask for transcript + adaptation with explicit limits, then iterate (CTA always present, fixed structure).
- High-volume needs (e-commerce/UGC, product photos, property tours) are solved by defining 4–6 fixed formats and building a node/template where only the person and/or product changes. Run the cost math first — AI tools are not cheap at volume.
- Scheduling: possible via Metricool or other third-party tools (not directly through Meta); test manual vs. scheduled posting before switching.
- **Trial reel tactic:** re-post a proven winner as a trial reel (it reaches non-followers) with a follow-oriented CTA (e.g. "if you don't follow me, the button is right below") to convert reach into followers.
- In a "100 videos" challenge, AI content is acceptable if it looks equally authentic; test it on a share of the output and compare.
- **LinkedIn is different:** copying formats there reads as plagiarism (on Reels, changing the face/voice transforms the piece; on text it does not). Three LinkedIn pillars: (1) give lots of value and usable resources, (2) tell experiences and anecdotes (what you did and why it worked), (3) build connections and collaborations with other accounts.

## Numbers & rules of thumb
- Cora (Andrés Bilbao's avatar): ~30,000 followers before being banned.
- HeyGen Free: 0 USD/month, 3 videos/month, max 1 minute each, watermark.
- HeyGen Creator: 29 USD/month, videos up to 30 minutes.
- HeyGen avatar creation: ~20 photos of the person.
- ElevenLabs instant voice clone: ~10 seconds of audio — not enough for professional results.
- ElevenLabs professional voice clone: at least 30 minutes of audio + identity verification (the person reads a passage live).
- Bilbao's voice clone: 30+ of his videos stitched in CapCut into ~1 hour of audio.
- Reference-image generation: Nano Banana Pro, 9:16 (Reels format), ~3 variations per run.
- Base formats to automate: 3 (the most expensive to record). Higgsfield example: 5 defined Story formats, swap only the character sheet and hit "run".
- Referent list for scraping: 20–30 accounts (Apify pulls their content first). The course uses referents with tens of thousands of likes; smaller niches can use smaller ones.
- Weekly bot feedback: transcripts of the 2 videos that worked + the 5 that didn't, with metrics.
- Adapting a referent: set explicit limits, e.g. change only ~10%.
- AI vs. real test: ~10% AI content vs. 90% real, compare results — preferably on an alternate account.
- High-volume e-commerce on TikTok: 100–200 videos/week demand.
- Product photography example: 6 photos per piece (white background for Google Shopping, in use, angle, close-up with hand, in its box, etc.).
- Real-estate tour automation build estimate: ~1 week; 4–5 video formats.
- DNA sheet: 3 words that define the personality.

## Frameworks / step-by-step methods

**A. DNA sheet (ficha de ADN) — for an avatar or your own brand**
1. Niche the character speaks to.
2. Name, age, gender, origin; occupation.
3. One phrase that defines the character (a catchphrase people associate with you).
4. Appearance: hair, eyes, skin, distinctive features, clothing style.
5. Visual anchors (set/background, recurring objects, accessories).
6. Voice and soul: tone (serious/direct, close/friendly, energetic), language, 3 personality words.
7. Main setting (office, studio, park…).
8. Target audience (as detailed as possible).
9. Past event that marked them → the wound/emotional load it left → desire they pursue → visible flaw that humanizes → life mission.

**B. Avatar-to-scale pipeline**
1. Build the character sheet (front + side views) from a reference image — Higgsfield, Magnific or Google Flow.
2. Find the target setting/format on Pinterest; recreate it with the character ("recreate image 1 with the person from image 2"), 9:16.
3. In HeyGen: New avatar → real person (clone yourself) or virtual character → upload ~20 photos; add each generated setting photo as a new "look/style".
4. In ElevenLabs: Voices → Create voice → Professional voice clone → upload 30+ min of clean spoken audio → verify identity.
5. Tune speed, stability, similarity and exaggeration; regenerate until it sounds like the person.
6. Connect: ElevenLabs Developers → API keys → create key → paste into HeyGen Voice → Import from third party. Select the cloned voice in HeyGen.
7. Paste the script in HeyGen, choose the model (Avatar 4 stable/generic motion; Avatar 5 beta, more movement, exaggerated expressions), generate. Start by testing both.

**C. Recording the base video for a talking avatar**
1. Record in the final format (vertical for Reels/TikTok, horizontal if needed).
2. Good, even lighting — not dark, not overexposed; face features (eyebrows, expressions) clearly visible.
3. Front-facing — side angles make the AI force eye contact and distort the eyes.
4. Natural gestures, pauses, hand movement, a wink if you wink — everything you do gets replicated.
5. Calm setting; be yourself rather than performing stiffly.

**D. Avoiding bans with avatar content**
1. Make it look organic: calm spot, phone-quality look, even some grain.
2. Hybrid: automate only 3 base formats; keep the rest human.
3. Never clone someone who already exists or a celebrity.
4. Operate the account like a person: interact, reply, comment.
5. Test on an alternate account first so you don't damage the main account's learning.

**E. Weekly loop for a content bot**
1. Each week feed it transcripts of the winners and losers with their metrics.
2. Ask it to find patterns.
3. Keep a weekly report/PDF and reload it if the bot loses memory.

## Tools mentioned
- **HeyGen** — best tool for talking avatars in the instructor's view. Free 0 USD (3 videos/month, ≤1 min, watermark); Creator 29 USD/month (videos up to 30 min). Models: Avatar 4, Avatar 5 (beta).
- **ElevenLabs** — voice cloning (instant vs. professional); paid plan required to use the API with HeyGen.
- **Higgsfield** — character sheets and image/video generation. Connect via MCP/CLI, API or ChatGPT plugin. *Canvas* (node automations: reference image + character + prompt → image → video, shows credit cost per generation), *Marketing Studio* (templates for e-commerce, product, UGC), *Supercomputer* (agent with community-built skills: Stories, ads, motion graphics, shorts; connects to ChatGPT, Slack, YouTube, Instagram, WhatsApp, Telegram, Discord).
- **Magnific**, **Google Flow** — alternatives for character sheets/images; these platforms aggregate many models.
- **Nano Banana Pro** — image model used to recreate reference photos.
- **Seedance** — preferred over Veo 3 for video generation.
- **Pinterest** — source of setting/format reference images.
- **CapCut** — stitch many clips into one long audio track for voice cloning.
- **Apify**, **Virlo** — referent/content scraping and filtering.
- **Claude** (artifacts, Claude Code), **Bolt** — build internal tools/apps that connect to Higgsfield or Magnific via MCP/API.
- **Metricool** — post scheduling.
- **ManyChat** — auto welcome DMs to new followers (raised in chat).

## Pitfalls / what instructors warned against
- Treating the avatar as the main strategy — it is a complement; being seen as yourself matters most.
- Fully automating an account: bot-like patterns get detected and banned (the Cora case had a ban).
- Cloning an existing person or a celebrity.
- Relying on instant voice cloning (~10 s) for professional output; using audio with music or read-aloud scripts for cloning.
- Using HeyGen's built-in voice instead of a cloned ElevenLabs voice.
- Static, dark, overexposed or side-angle base videos — the avatar inherits those flaws.
- Avatar 5 (beta) can exaggerate expressions; test before committing.
- Expecting a bot to improve on its own without a structured weekly feedback loop.
- Blaming the bot for weak scripts when the referents/instructions are the problem.
- Scaling AI production (e.g. 100–200 videos/week) without first calculating tool costs.
- Copying formats on LinkedIn (plagiarism there).
- Testing AI content on the main account and hurting its learning — use an alternate account.
- Switching to scheduled posting without testing it against manual posting first.
