// Static data for the Future Planner: buckets she fills, paths she browses,
// and seed prompts used by the offline idea engine and the Believe section.

export type BucketDef = {
  key: BucketKey;
  title: string;
  subtitle: string;
  placeholder: string;
  emoji: string;
};

export type BucketKey =
  | "interests"
  | "loves"
  | "morals"
  | "skills"
  | "dreams"
  | "pastWork"
  | "pastHustles"
  | "bugs"
  | "admires"
  | "curiosities"
  | "environments"
  | "signatures";

export const BUCKETS: readonly BucketDef[] = [
  {
    key: "interests",
    title: "Interests",
    subtitle: "Things you keep coming back to",
    placeholder: "vintage fashion, indie film, mushrooms…",
    emoji: "✦",
  },
  {
    key: "loves",
    title: "Loves & small joys",
    subtitle: "Scenes, songs, smells, moments",
    placeholder: "a long table outdoors, the smell of cedar…",
    emoji: "♡",
  },
  {
    key: "morals",
    title: "Morals & values",
    subtitle: "Your compass — non-negotiable",
    placeholder: "honesty over politeness, slow over fast…",
    emoji: "✸",
  },
  {
    key: "skills",
    title: "Skills & strengths",
    subtitle: "What you're actually good at (honest, not modest)",
    placeholder: "reading a room, putting outfits together…",
    emoji: "✺",
  },
  {
    key: "dreams",
    title: "Dreams",
    subtitle: "The life and work you'd love to live in",
    placeholder: "a small studio with a roster of artists…",
    emoji: "✷",
  },
  {
    key: "pastWork",
    title: "Past work",
    subtitle: "Jobs and roles — what you liked, what drained you",
    placeholder: "barista at X — loved the regulars, hated the AM shifts…",
    emoji: "▸",
  },
  {
    key: "pastHustles",
    title: "Past hustles",
    subtitle: "Side projects, gigs, mini-businesses you've tried",
    placeholder: "sold vintage on IG for a summer…",
    emoji: "▹",
  },
  {
    key: "bugs",
    title: "Things that bug you",
    subtitle: "Where you'd help if you could — the friction points",
    placeholder: "how hard it is for new designers to get seen…",
    emoji: "✖",
  },
  {
    key: "admires",
    title: "People you admire",
    subtitle: "Real, fictional, alive, gone — paths that resonate",
    placeholder: "Solange, Phoebe Philo, your aunt who never asked permission…",
    emoji: "◐",
  },
  {
    key: "curiosities",
    title: "Curiosities",
    subtitle: "Questions you keep asking, things you want to learn",
    placeholder: "how do small agencies actually pay their people?",
    emoji: "✧",
  },
  {
    key: "environments",
    title: "Environments",
    subtitle: "Places, scenes, kinds of rooms you light up in",
    placeholder: "behind the scenes, golden hour, kitchen at the party…",
    emoji: "◑",
  },
  {
    key: "signatures",
    title: "Your signatures",
    subtitle: "What people always say about you (the receipts)",
    placeholder: "\"you somehow always know who to introduce to who\"…",
    emoji: "✶",
  },
] as const;

export const BUCKET_MAP: Record<BucketKey, BucketDef> = Object.fromEntries(
  BUCKETS.map((b) => [b.key, b])
) as Record<BucketKey, BucketDef>;

// -- Paths library ---------------------------------------------------------

export type PathDef = {
  id: string;
  title: string;
  shortPitch: string;
  longPitch: string;
  dayToDay: string[];
  pullsFrom: BucketKey[];
  tags: string[];
  featured?: boolean;
};

export const AGENCY_PATH: PathDef = {
  id: "hybrid-agency",
  featured: true,
  title: "A hybrid creative + talent agency",
  shortPitch:
    "A small house that both makes the work AND reps the people who make it. Half studio, half family.",
  longPitch: `A small, intentional shop that does two things under one roof:

1) Creative. We make the work — direction, styling, production, design — for brands and artists who share our taste.

2) Talent. We rep the talent inside our orbit (including, potentially, you) — booking, negotiating, building careers, saying no on their behalf when the room needs it.

Why hybrid: agencies that only book people watch from the sidelines; agencies that only make work don't build futures for the people inside them. We do both, on purpose, for a small roster.

What we'd build first:
• A roster of 3–6 humans we believe in
• A reel of work we've personally touched
• A clear taste — what we say yes and no to, in writing
• A monthly intake of one new collab to keep the work alive
• An operating rhythm that respects slowness — no hustle theatre

The point of bringing this to you: this is a path we could walk together. Partner-shaped, not employee-shaped. Your interests, morals, and instincts would be the filter on everything we say yes to.`,
  dayToDay: [
    "Coffee + look at the week — who needs you, what's on the calendar",
    "One creative block: building a treatment, sourcing, a fitting",
    "One talent block: a call with a roster human about their next move",
    "Ship something small every day — even just a clean follow-up email",
  ],
  pullsFrom: ["morals", "interests", "skills", "admires", "dreams", "pastWork", "pastHustles"],
  tags: ["agency", "partnership", "creative", "talent", "hybrid"],
};

export const PATHS: PathDef[] = [
  AGENCY_PATH,
  {
    id: "creative-director",
    title: "Creative Director (in-house at a brand)",
    shortPitch: "You own the look, feel, and yes/no on a brand's whole world.",
    longPitch:
      "You set the visual + tonal direction for a brand's everything — campaigns, store, packaging, social, events. You don't make all the work; you decide what work gets made, by whom, and whether it's good enough to ship.",
    dayToDay: [
      "Review work-in-progress from the team and outside collaborators",
      "Briefings with leadership on what's next",
      "Casting decisions — photographers, stylists, talent",
      "Editing more than making",
    ],
    pullsFrom: ["interests", "morals", "skills", "admires"],
    tags: ["leadership", "fashion", "brand"],
  },
  {
    id: "producer",
    title: "Producer (commercial / editorial / events)",
    shortPitch: "The person who actually makes the shoot or event happen.",
    longPitch:
      "Budgets, schedules, crew, locations, permits, vendors, vibes-on-set. The producer keeps everyone fed, paid, on-time, and in the right mood. Invisible when it works.",
    dayToDay: [
      "Building a call sheet",
      "Negotiating with locations and vendors",
      "Managing a budget down to the dollar",
      "Solving the thing that just broke",
    ],
    pullsFrom: ["skills", "signatures", "environments", "pastWork"],
    tags: ["production", "events", "operations"],
  },
  {
    id: "stylist",
    title: "Stylist (wardrobe / prop / set)",
    shortPitch: "You dress the people or the world they're in.",
    longPitch:
      "You build the visual context — clothing on bodies, props in hands, sets behind the camera. You pull, fit, sew, return. Taste is the whole job.",
    dayToDay: [
      "Pulls and returns at showrooms and archives",
      "Fittings with talent",
      "On-set adjusting in real time",
      "Building decks and references",
    ],
    pullsFrom: ["interests", "loves", "skills", "signatures"],
    tags: ["styling", "fashion", "set", "production"],
  },
  {
    id: "casting",
    title: "Casting Director",
    shortPitch: "You decide who walks into the frame.",
    longPitch:
      "You find, vet, and select faces — for film, commercials, fashion, music. Half scout, half therapist, half taste-maker. You're the reason a project feels like a world instead of a stock photo.",
    dayToDay: [
      "Scouting in person and online",
      "Running casting sessions and self-tape reviews",
      "Negotiating bookings",
      "Building relationships with agencies",
    ],
    pullsFrom: ["signatures", "interests", "admires", "environments"],
    tags: ["casting", "talent", "production"],
  },
  {
    id: "talent-manager",
    title: "Talent Manager",
    shortPitch: "You build careers for a small roster, one yes and no at a time.",
    longPitch:
      "Different from agent: you live with the talent's career, not just the next booking. You decide what they say yes to, who they meet, what shape the next year takes. Long game, small roster, deep loyalty.",
    dayToDay: [
      "Long calls with roster about what's next",
      "Reading offers and pitching the answer back",
      "Introductions — the right person to the right person",
      "Saying no on someone else's behalf",
    ],
    pullsFrom: ["morals", "signatures", "admires", "dreams"],
    tags: ["talent", "management", "long-game"],
  },
  {
    id: "booking-agent",
    title: "Booking Agent (music / talent)",
    shortPitch: "You build the calendar and chase the cheque.",
    longPitch:
      "You source gigs, negotiate fees, paper the deal, collect deposits. Faster-paced than management — the relationship is the calendar.",
    dayToDay: [
      "Pitching to venues / brands",
      "Negotiating contracts and riders",
      "Confirming details day-of",
      "Chasing payment",
    ],
    pullsFrom: ["skills", "signatures", "pastHustles"],
    tags: ["talent", "music", "events"],
  },
  {
    id: "brand-strategist",
    title: "Brand Strategist / Consultant",
    shortPitch: "You help small brands figure out who they actually are.",
    longPitch:
      "Sessions with founders. You ask the right questions, surface the throughline, write the words that will sit on their site, deck, and packaging. You're paid for the clarity, not the deliverable.",
    dayToDay: [
      "1:1 strategy calls",
      "Audits of existing brand materials",
      "Writing positioning, manifestos, taglines",
      "Sitting in on team meetings as outside eyes",
    ],
    pullsFrom: ["morals", "skills", "signatures", "curiosities"],
    tags: ["consulting", "brand", "strategy"],
  },
  {
    id: "curator",
    title: "Curator (objects / shows / experiences)",
    shortPitch: "You decide what goes in the room, in what order, for whom.",
    longPitch:
      "Gallery shows, capsule drops, hotel libraries, festival lineups, pop-ups. You're paid for the edit — what's in, what's out, and why.",
    dayToDay: [
      "Sourcing — visits, calls, research",
      "Writing the case for each inclusion",
      "Installing and editing live",
      "Hosting press / opening night",
    ],
    pullsFrom: ["interests", "loves", "admires", "environments"],
    tags: ["curation", "gallery", "events"],
  },
  {
    id: "florist",
    title: "Florist / Floral Designer",
    shortPitch: "You make rooms feel like the right kind of garden.",
    longPitch:
      "Weddings, restaurants, brand events, weekly arrangements. Earlier mornings than you'd like; flowers that smell better than anything else in your week.",
    dayToDay: [
      "Pre-dawn at the flower market",
      "Designing in the studio",
      "Install on-site",
      "Strike and clean-up after",
    ],
    pullsFrom: ["loves", "environments", "skills"],
    tags: ["floral", "events", "craft"],
  },
  {
    id: "set-designer",
    title: "Set Designer",
    shortPitch: "You build the world the shoot happens inside.",
    longPitch:
      "Editorial, commercial, music videos, brand events. You source, design, and oversee the construction of the physical world on camera. The room is the job.",
    dayToDay: [
      "Sketches, mood boards, references",
      "Sourcing and renting props (this might be where rent.co comes in 👀)",
      "Build days with the crew",
      "On-set tweaks",
    ],
    pullsFrom: ["interests", "loves", "skills", "environments", "pastWork"],
    tags: ["set", "design", "production"],
  },
  {
    id: "salon-host",
    title: "Salon host / dinner curator",
    shortPitch: "You make the table. You decide who sits at it.",
    longPitch:
      "A recurring dinner, monthly salon, supper club. You build the room, the menu, the guest list, the conversation. Often the seed of a larger network or business.",
    dayToDay: [
      "Concepting the next dinner's theme + guest list",
      "Cooking or coordinating chef",
      "Hosting (the actual work — being present, steering)",
      "Following up to keep the network alive",
    ],
    pullsFrom: ["loves", "signatures", "environments", "morals"],
    tags: ["hospitality", "community", "events"],
  },
  {
    id: "newsletter-writer",
    title: "Newsletter / Substack writer",
    shortPitch: "You write a few hundred people something they look forward to.",
    longPitch:
      "Pick a niche only you cover. Build slowly. Monetize via paid tier, sponsorships, or it becomes the funnel for everything else (consulting, books, products).",
    dayToDay: [
      "Reading and noting all week",
      "One day of drafting, one of editing",
      "Replying to readers — the magic part",
      "Quarterly: think about format, growth, monetization",
    ],
    pullsFrom: ["curiosities", "interests", "morals", "bugs"],
    tags: ["writing", "media", "audience"],
  },
  {
    id: "community-manager",
    title: "Community / Member experience lead",
    shortPitch: "You're the human face of a small membership, club, or brand.",
    longPitch:
      "Could be a club, a Discord, a member program, a creator collective. You make people feel seen at scale — onboarding, programming, retention, vibes.",
    dayToDay: [
      "Responding to members 1:1",
      "Programming events / meetups / drops",
      "Onboarding new joiners",
      "Quietly removing people who are bad for the room",
    ],
    pullsFrom: ["morals", "signatures", "loves", "environments"],
    tags: ["community", "hospitality", "membership"],
  },
  {
    id: "coach",
    title: "Coach (creative / career / life)",
    shortPitch: "You sit across from someone weekly and help them get unstuck.",
    longPitch:
      "Pick a niche where you have lived authority. Build a small caseload at $X / session. Limited scale, high meaning, real money.",
    dayToDay: [
      "Back-to-back sessions a few days a week",
      "Notes + prep for next sessions",
      "One day of intake calls / marketing",
      "One day of CEU / your own learning",
    ],
    pullsFrom: ["morals", "skills", "signatures", "curiosities"],
    tags: ["coaching", "1-on-1", "services"],
  },
  {
    id: "indie-founder",
    title: "Independent maker / brand founder",
    shortPitch: "You make a small thing very well and sell it directly.",
    longPitch:
      "Candles, jewelry, ceramics, knitwear, perfume, a small line of something. Direct-to-customer, small batches, slow growth, full control. Real economics; real overhead.",
    dayToDay: [
      "Making (the part most people forget exists)",
      "Photographing and listing",
      "Shipping (yes, you ship)",
      "Email / content / community work",
    ],
    pullsFrom: ["loves", "interests", "skills", "morals"],
    tags: ["product", "indie", "brand"],
  },
  {
    id: "show-producer",
    title: "Live show producer (one-off events)",
    shortPitch: "You make the night that everyone talks about for a year.",
    longPitch:
      "Concerts, pop-ups, parties, brand experiences. You build it from a sentence into a thing that takes over a building for one night.",
    dayToDay: [
      "Booking talent, vendors, security",
      "Run-of-show writing and rehearsals",
      "Night-of: walkie, headset, hustle",
      "Post-mortem the next morning",
    ],
    pullsFrom: ["interests", "skills", "environments", "signatures"],
    tags: ["events", "production", "nightlife"],
  },
  {
    id: "creative-consultant",
    title: "Creative consultant (fractional)",
    shortPitch:
      "You're hired by a few brands at once to bring outside taste in.",
    longPitch:
      "Not full-time anywhere; deep with 2–4 clients a quarter. They pay you to be smart and honest in their meetings. Good economics if you can hold the boundary.",
    dayToDay: [
      "1–2 strategy calls per client per week",
      "A retainer-paced project at each",
      "Writing memos that change decisions",
      "Saying no to scope creep",
    ],
    pullsFrom: ["morals", "skills", "signatures", "admires"],
    tags: ["consulting", "fractional", "advisory"],
  },
];

// -- Idea engine templates -------------------------------------------------

export type IdeaTemplate = {
  needs: BucketKey[];
  render: (e: Partial<Record<BucketKey, string>>) => string;
};

export const IDEA_TEMPLATES: IdeaTemplate[] = [
  {
    needs: ["loves", "morals"],
    render: (e) =>
      `What if you turned your love of "${e.loves}" into a tiny offering for people who care about ${e.morals}? Start with one person, one price.`,
  },
  {
    needs: ["pastHustles", "skills"],
    render: (e) =>
      `Your hustle in "${e.pastHustles}" — what part did you secretly love? Now build a whole thing around just that part, and bring your skill in ${e.skills} to it.`,
  },
  {
    needs: ["interests", "interests"],
    render: (e) =>
      `Cross "${e.interests}" with itself: what would a one-night-only event, club, or pop-up at the intersection look like?`,
  },
  {
    needs: ["bugs", "skills"],
    render: (e) =>
      `Something that bugs you: "${e.bugs}". Your skill in ${e.skills} is exactly the angle. What's the smallest thing you could make that fixes it for ONE person this month?`,
  },
  {
    needs: ["admires", "dreams"],
    render: (e) =>
      `If ${e.admires} were starting from scratch with your dream of "${e.dreams}" — what would the first 90 days look like? Borrow it.`,
  },
  {
    needs: ["dreams"],
    render: (e) =>
      `Your dream of "${e.dreams}" — what's the 1% version someone could experience this week? Make that, ship it, watch the response.`,
  },
  {
    needs: ["skills", "skills"],
    render: (e) =>
      `If you combined "${e.skills}" (one) with your other skill at the same time, what would you call the person who did that? Be the only one of those.`,
  },
  {
    needs: ["environments", "signatures"],
    render: (e) =>
      `You light up in "${e.environments}" — and people say "${e.signatures}" about you. What's a job description that puts you in that room doing exactly that?`,
  },
  {
    needs: ["pastWork", "morals"],
    render: (e) =>
      `Your time at "${e.pastWork}" — if you re-wrote that role with ${e.morals} as the rule, what would it actually do for someone? That's a service.`,
  },
  {
    needs: ["loves", "curiosities"],
    render: (e) =>
      `A 7-day experience for people who love "${e.loves}" and are asking the question "${e.curiosities}". What happens on day 1?`,
  },
  {
    needs: ["morals", "skills"],
    render: (e) =>
      `If ${e.morals} were a brand, what would its first product be? Use your skill in ${e.skills} to make a working sketch by Friday.`,
  },
  {
    needs: ["interests", "admires"],
    render: (e) =>
      `Imagine ${e.admires}'s version of "${e.interests}" but at 1/100th the scale, made by you, this year.`,
  },
  {
    needs: ["signatures", "dreams"],
    render: (e) =>
      `People say "${e.signatures}" about you. Who would PAY you just for that, in service of your dream "${e.dreams}"? Sketch three customer types.`,
  },
  {
    needs: ["pastHustles", "interests"],
    render: (e) =>
      `Bring "${e.pastHustles}" back, but with everything you now know about "${e.interests}". Same idea, ten years smarter — what would change?`,
  },
  {
    needs: ["bugs", "morals"],
    render: (e) =>
      `The world needs more ${e.morals} — and you're bugged by "${e.bugs}". What's the smallest thing only YOU could make that delivers more of the first and less of the second?`,
  },
  {
    needs: ["loves", "environments"],
    render: (e) =>
      `Take your love of "${e.loves}" and put it in "${e.environments}". What's the title of the person who does that for a living?`,
  },
];

// -- Affirmation seeds (selected randomly + her own additions) -------------

export const AFFIRMATION_SEEDS: string[] = [
  "I am allowed to build a life that fits me.",
  "My interests are clues, not distractions.",
  "I don't have to choose between who I am and how I earn.",
  "The version of work that fits me is allowed to exist.",
  "I trust the things that keep coming back.",
  "My morals are a compass, not a cage.",
  "Small steps, taken often, are how a life turns.",
  "What lights me up is a useful signal — not a luxury.",
  "There is room for me in this world, exactly as I am.",
  "I don't need permission to start.",
  "The people I admire were also figuring it out.",
  "I get to define what 'success' means here.",
  "Slowness is a strategy, not a flaw.",
  "I am building, even on the quiet days.",
  "My taste is data — I can trust it.",
];

// -- Reframe templates -----------------------------------------------------

export const REFRAME_TEMPLATES: { match: RegExp; reframes: (x: string) => string[] }[] = [
  {
    match: /\bi('?m| am) too\b\s*(\w[\w\s]*)/i,
    reframes: (x) => [
      `Being ${x} is exactly the angle no one else has — it's a market of one.`,
      `Every person you admire has been called "too ${x}" by someone. They built around it.`,
      `"Too ${x}" is usually code for "I haven't found the room that wants this yet." That room exists.`,
    ],
  },
  {
    match: /\bi don'?t have (the|enough)? ?(.+?)\s*(for|to)/i,
    reframes: (x) => [
      `You may not have the credentials, but you have the lived experience — and lived experience is the rarer one.`,
      `Most things people get paid for, no one had "enough" of when they started.`,
      `What you DO have, named honestly, is probably more than someone else who's already doing it.`,
    ],
  },
  {
    match: /\bno one would (pay|want|buy)\b/i,
    reframes: () => [
      `Someone is searching for this exact thing right now. The job isn't deserving — it's being findable.`,
      `You don't need everyone. You need 10 people. Then 100. Then it's a business.`,
      `"No one would pay" usually means you haven't asked. Asking once is the whole experiment.`,
    ],
  },
  {
    match: /\bit'?s already been done\b/i,
    reframes: () => [
      `It's been done — but not by you, not for the people you'd reach, not in the way only you would do it.`,
      `Every category has 100 versions of the same thing. People still pick the one that feels like them.`,
      `The proof it's been done is the proof there's a market. Be the next, more specific, version.`,
    ],
  },
  {
    match: /\bi'?m (not|never) going to\b/i,
    reframes: () => [
      `You don't have to do "it" — only the next 1% of it. The future you is shaped one small action at a time.`,
      `That sentence is a prediction, not a fact. The prediction can change the moment you do one thing that contradicts it.`,
      `Even if it never becomes "the thing," the trying is the thing. You don't get the practice without it.`,
    ],
  },
];

export const REFRAME_FALLBACK = [
  "Read that doubt back like it was said by a kid you love. Would you let them believe it? No. Don't let yourself either.",
  "What would change if the opposite were true? Live for one hour as if it were. Notice what shifts.",
  "Doubts are usually signals about WHERE you'd grow next — not signals that you shouldn't go.",
];

// -- Visualization prompts -------------------------------------------------

export const VISUALIZATION_PROMPTS: string[] = [
  "Picture the version of you who already does this. What's she wearing? Where is she? What's the morning routine?",
  "It's one year from today. The thing worked. Walk through a Tuesday — from waking up to the last text before bed.",
  "Picture the email you'll get when someone says yes for the first time. Who is it from? What does the subject line say?",
  "It's five years from now. A younger version of you finds your work online. What does she think? What does she feel allowed to want?",
  "Picture the first room where you say out loud what you're building. Who's there? What do they say back?",
  "Imagine the photo that'll be taken on the day this becomes real. What's in the background?",
  "Picture the version of your day that's most ALIGNED — not most productive. What's she doing at 11am?",
  "It's the night you sign a year-long client / deal / contract / whatever. Where do you go to celebrate?",
];

// -- Gratitude prompts -----------------------------------------------------

export const GRATITUDE_PROMPTS: string[] = [
  "Three things from today — at least two have to be small.",
  "One thing about yourself, one thing about someone else, one thing about the day.",
  "One thing you have now that past-you would have wept to know about.",
  "One thing that's hard right now that you'll later be glad happened.",
  "Name a person who showed up for you this week — even in a small way.",
];

// -- Future-letter prompts -------------------------------------------------

export const LETTER_PROMPTS: string[] = [
  "Tell future-you about today. What's true that you don't want her to forget.",
  "What are you scared of right now? Tell her so she remembers you survived it.",
  "What's one piece of advice you'd want her to follow no matter what?",
  "If the thing works out — what do you want her to remember about THIS version of you, the one who couldn't see it yet?",
  "Write the letter you wish someone had written you a year ago.",
];
