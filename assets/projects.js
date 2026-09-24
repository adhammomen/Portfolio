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
