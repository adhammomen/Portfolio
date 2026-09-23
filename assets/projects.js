// All site content lives here. Edit freely — the site re-renders from this file.
// project.status: "finished" | "in-progress"
// project.note: what the host writes in the margin next to it, in his own handwriting.
window.PORTFOLIO = {
  name: "Adham Momen",
  role: "Developer & Builder",
  tagline: "I build the systems underneath, then the surface people touch.",
  manifesto:
    "Most portfolios are a museum: quiet rooms, things behind glass. I'd rather walk you through the workshop myself. Everything here runs on a server I built and keep alive, and every project started as a problem I couldn't leave alone.",
  capabilities: ["Full-stack", "Systems & infrastructure", "Self-hosted servers", "Product design", "Interfaces & motion", "Automation"],
  links: {
    github: "https://github.com/adhammomen",
    email: "", // add an address: the host types it out for the visitor at the end
  },
  host: {
    intro: ["hey — I'm Adham.", "let me show you around."],
    idle: ["still there?", "scroll a bit, there's more.", "take your time.", "I'll wait."],
    dodge: ["ha, too slow.", "nope.", "you can't catch me."],
    solo: "ok — I'll stay out of your way. tap me if you want the tour again.",
    contact: "this is where you find me →",
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
      note: "this one is the big one. still building it.",
    },
    {
      title: "Kingsmaker",
      status: "in-progress",
      year: "2026",
      description: "Description coming soon.",
      tags: ["Product"],
      repo: "",
      demo: "",
      note: "started as a side idea, wouldn't leave me alone.",
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
      note: "you're looking at it.",
    },
  ],
};
