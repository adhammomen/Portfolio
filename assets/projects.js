// All site content lives here. Edit freely — the site re-renders from this file.
// Everything the host says is here too. Write it the way you'd actually talk.
// project.status: "finished" | "in-progress"
// project.notes: what the host writes next to it, in order — the first on arrival, the next ones if the visitor lingers.
window.PORTFOLIO = {
  name: "Adham Momen",
  role: "Developer & Builder",
  tagline: "I build the systems underneath, then the surface people touch.",
  manifesto:
    "Most portfolios are a museum: quiet rooms, things behind glass. I'd rather walk you through the workshop myself. Everything here runs on a server I built and keep alive, and every project started as a problm I couldn't leave alone.",
  // a typo the host notices and fixes in front of the visitor. leave it in.
  typo: { wrong: "problm", right: "problem" },
  capabilities: [
    { name: "Full-stack", note: "front to back, no handoffs." },
    { name: "Systems & infrastructure", note: "the part nobody sees until it breaks." },
    { name: "Self-hosted servers", note: "this site is on one right now." },
    { name: "Product design", note: "I decide what to build before how." },
    { name: "Interfaces & motion", note: "case in point." },
    { name: "Automation", note: "if I do it twice, it gets a script." },
  ],
  links: {
    github: "https://github.com/adhammomen",
    email: "", // add an address: the host circles it for the visitor at the end
  },
  host: {
    timezone: "", // e.g. "Africa/Cairo" — with this set, the host knows what time it is where you are
    status: "right now I'm mostly on Ordium.", // what you're up to. the host mentions it once.
    voicePitch: 1, // 0.8 lower, 1.2 higher
    intro: ["hey — I'm Adham.", "let me show you around."],
    lateHere: "it's {time} here. I'll keep it short.",
    timeHere: "it's {time} where I am.",
    joined: "joined",
    away: ["oh hey, you're back.", "back? I got bored.", "there you are."],
    typoLines: ["wait.", "sorry.", "nobody saw that."],
    penHint: "you have a pen too — top right.",
    typeHint: "you can just start typing, by the way.",
    circled: ["that one? sure.", "ok, opening it.", "good pick."],
    scribbled: ["hey, I wrote that.", "rude.", "ok, fair."],
    drew: ["nice.", "an artist.", "I'll allow it.", "what is that?"],
    copied: "copied. tell them I said hi.",
    rightClick: "what are you looking for?",
    selectAll: "take it all, it's fine.",
    printed: "you're printing this? ok.",
    resized: "nice window.",
    // two windows: the page is bigger than one window. open a second and it's the same page, pinned to your monitor
    secondHint: "this page is bigger than one window. open a second one — top right.",
    secondJoined: "opened a second window",
    bigger: "oh — bigger desk. hold on.",
    smaller: "back to one. fine.",
    otherWindow: ["I can be over here too.", "same page. it's just bigger than your window.", "see? one desk, two windows."],
    dragHint: "drag a project into this window and I'll open it here.",
    overThere: "over there →",
    dropped: "ok, here then.",
    windowGone: "back to one window?",
    leaderLost: "wait — where did the other one go?",
    alreadyTwo: "you've got two. move them around.",
    popupBlocked: "your browser blocked it. open this page in a second window yourself.",
    console: "I see you. — Adham",
    returning: ["welcome back.", "want the tour again, or just look around?"],
    greetings: { night: "late night, huh? same.", morning: "morning.", afternoon: "afternoon.", evening: "evening." },
    idle: ["still there?", "scroll a bit, there's more.", "take your time.", "I'll wait.", "no rush."],
    dodge: ["ha, too slow.", "nope.", "you can't catch me.", "careful."],
    skipped: "wait — you skipped the good part.",
    backUp: "back already?",
    linger: ["you're really looking at this one.", "good eye.", "yeah, that one matters to me."],
    solo: "ok — I'll stay out of your way. tap me if you want the tour again.",
    back: "back.",
    contact: "this is where you find me →",
    bye: "thanks for coming by.",
    askNote: "leave me a note before you go?",
    thanks: ["nice.", "that's going on the fridge.", "noted. literally."],
    // the interview: two questions on arrival. the answers change the tour and draft the email
    interview: {
      who: { q: "quick one — who am I talking to?", options: [
        { key: "recruiter", label: "I'm hiring", say: "ok. work first, then how to reach me." },
        { key: "dev", label: "I'm a developer", say: "then you'll want the sketches. and the source." },
        { key: "client", label: "I need something built", say: "good. let me show you what I build." },
        { key: "curious", label: "just looking", say: "fair. look around." },
      ] },
      time: { q: "and how long have you got?", options: [
        { key: "short", label: "30 seconds", say: "fine. the short version." },
        { key: "some", label: "a few minutes", say: "enough." },
        { key: "all", label: "all of it", say: "ok. then I'll tell you everything." },
      ] },
      skipped: "no answer? fine, the usual tour.",
      shortTour: ["best thing I've made:", "and this is where you find me. done."],
      drafted: "I wrote you a draft. it's behind that link.",
      notes: { recruiter: "start here.", dev: "no framework. read the source.", client: "this is the kind of thing I'd build you.", curious: "" },
      drafts: {
        recruiter: { subject: "Hi Adham — about a role", body: "Hi Adham,\n\nI saw your portfolio and I'm hiring for ...\n\nThe role: ...\nWhere / remote: ...\n\nAre you open to a chat this week?\n" },
        dev: { subject: "Hi Adham — fellow developer", body: "Hi Adham,\n\nSaw the site. The bit I liked: ...\n\nQuestion: ...\n" },
        client: { subject: "Hi Adham — I need something built", body: "Hi Adham,\n\nWhat I need built: ...\nWhen: ...\nBudget (rough): ...\n\nCan we talk?\n" },
        curious: { subject: "Hi Adham", body: "Hi Adham,\n\n...\n" },
      },
    },
    // rewind: the slider at the bottom un-draws the page, then it draws itself back
    rewindLines: ["careful, that's my handwriting.", "un-doing me?", "ok, and back."],
    rewound: "and back.",
    // handoff: what earlier visitors left on the page
    someoneWasHere: "someone was here before you.",
    theyLeft: "they left that.",
    // the machine: the server this page lives on
    machineIntro: "this is the box.",
    machineLive: "alive. as of {time}.",
    machineOffline: "the machine's asleep. it does that. last seen {time}.",
    machineNever: "can't reach the box from here.",
    // things the visitor can ask, and what the host does
    asks: [
      { label: "show me your best work", say: "this one.", action: "best" },
      { label: "what do you build?", say: "all of this, top to bottom.", action: "about" },
      { label: "how do I reach you?", say: "right here.", action: "contact" },
      { label: "who are you?", say: "I'm the guy whose name is on the door.", action: "hero" },
    ],
    // free-text replies: [keywords], reply, optional action
    replies: [
      [["hi", "hello", "hey", "yo"], "hey.", null],
      [["ordium"], "ordium is the big one. still building it.", "project:0"],
      [["kingsmaker", "kings"], "kingsmaker started as a side idea and wouldn't leave me alone.", "project:1"],
      [["email", "mail", "contact", "reach", "hire", "work with"], "right here.", "contact"],
      [["server", "host", "infra"], "this page is served from a box I keep alive myself.", "about"],
      [["who", "you"], "I'm the guy whose name is on the door.", "hero"],
      [["thank", "thanks", "cool", "nice", "love"], "appreciated.", null],
      [["bye", "later"], "see you.", null],
    ],
    fallback: ["ask me about a project, or how to reach me.", "try 'ordium'.", "I only know a few words. try 'contact'."],
  },
  // handoff: visitors' pen marks and notes stay on the page for the next visitor.
  // url: an endpoint that stores them (server/host-server.js). empty: this browser only.
  handoff: { url: "" },
  // the machine: live vitals of the server this page runs on (server/host-server.js writes them).
  // url: a JSON endpoint or a static file the server keeps fresh.
  machine: {
    url: "assets/vitals.json",
    name: "ordium",
    lede: "Everything here is served from one box I keep alive myself. This is it.",
    gauges: [
      { key: "uptime", label: "up for" },
      { key: "load", label: "load" },
      { key: "mem", label: "memory" },
      { key: "disk", label: "disk" },
    ],
  },
  projects: [
    {
      title: "Ordium",
      status: "in-progress",
      year: "2026",
      description: "Description coming soon.",
      tags: ["Platform", "Server"],
      repo: "",
      demo: "",
      best: true,
      notes: ["this one is the big one. still building it.", "it runs on the same server as this page.", "ask me about it — type 'ordium'."],
      doodle: "bang",
      // sketch: { nodes: [{ label: "client", x: .2, y: .5 }, { label: "ordium", x: .5, y: .5 }, { label: "db", x: .8, y: .5 }], edges: [[0, 1], [1, 2]] },
    },
    {
      title: "Kingsmaker",
      status: "in-progress",
      year: "2026",
      description: "Description coming soon.",
      tags: ["Product"],
      repo: "",
      demo: "",
      notes: ["started as a side idea, wouldn't leave me alone.", "more on this soon."],
      doodle: "star",
    },
    {
      title: "Host",
      status: "finished",
      year: "2026",
      description:
        "This site. Instead of a museum, a walkthrough: I'm on the page as a second cursor, showing you around in my own handwriting. No frameworks, no build step.",
      tags: ["Creative dev", "GSAP", "SVG", "Typography"],
      repo: "https://github.com/adhammomen/Portfolio",
      demo: "",
      notes: ["you're looking at it.", "yes, I wrote the cursor too."],
      doodle: "check",
      // the host sketches this on the sheet when the project opens. x/y are 0..1 across the napkin.
      sketch: {
        nodes: [{ label: "you", x: 0.14, y: 0.5 }, { label: "the page", x: 0.5, y: 0.5 }, { label: "the host", x: 0.5, y: 0.14 }, { label: "ink layer", x: 0.86, y: 0.5 }],
        edges: [[0, 1, "scroll"], [2, 1, "walks ahead"], [1, 3, "draws on"]],
      },
    },
  ],
};
