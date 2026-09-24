// All the content. Edit freely; the tests in tests.js read from here.
window.CONTENT = {
  name: "Adham Momen",
  role: "Developer & Builder",
  github: "adhammomen",
  email: "", // add an address and the contact test gets something to run against
  premise: "Every claim on this page is a test. They run in your browser, right now, against the real thing.",
  // the machine this site (and the projects) live on: server/host-server.js writes vitals.json
  machine: { url: "assets/vitals.json", name: "ordium", maxAgeHours: 24 },
  projects: [
    {
      title: "Ordium",
      status: "in-progress",
      year: "2026",
      description: "", // coming soon: the test for this will stay pending until there is one
      tags: ["Platform", "Server"],
      repo: "",   // owner/name on GitHub, when public
      demo: "",   // a URL, when live
    },
    {
      title: "Kingsmaker",
      status: "in-progress",
      year: "2026",
      description: "",
      tags: ["Product"],
      repo: "",
      demo: "",
    },
    {
      title: "Two Windows",
      status: "finished",
      year: "2026",
      description: "A portfolio where the page is bigger than a browser window: open a second one and both turn out to be holes onto the same desk, with the owner walking between them as a cursor.",
      tags: ["Creative dev", "Browser APIs", "Typography"],
      repo: "adhammomen/Portfolio",
      demo: "",
    },
  ],
};
