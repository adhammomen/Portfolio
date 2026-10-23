// Everything the site says lives here.
// project.hue: 0..1, the colour the object turns when you hover the project.
export const CONTENT = {
  name: "Adham Momen",
  role: "Developer & Builder",
  location: "Independent",
  email: "", // add an address and the contact link uses it
  github: "https://github.com/adhammomen",
  hero: { a: "Systems,", b: "made", c: "tangible." },
  statement:
    "I build the systems underneath and the surfaces people touch: platforms, servers, products and interfaces, from the first line to the box they run on. Quiet where it should be, loud where it matters.",
  capabilities: [
    { title: "Platforms", items: ["Full-stack products", "APIs & data", "Auth, billing, realtime"] },
    { title: "Infrastructure", items: ["Self-hosted servers", "Deploys & automation", "Monitoring"] },
    { title: "Interfaces", items: ["Product design", "Creative development", "WebGL & motion"] },
  ],
  projects: [
    { title: "Ordium", year: "2026", kind: "Platform · Server", status: "In progress", hue: 0.58,
      text: "The big one. A platform I am building end to end, running on a server I keep alive myself. Details soon.", link: "" },
    { title: "Kingsmaker", year: "2026", kind: "Product", status: "In progress", hue: 0.08,
      text: "Started as a side idea and refused to leave. A product in the making. Details soon.", link: "" },
    { title: "Two Windows", year: "2026", kind: "Experiment · Browser APIs", status: "Shipped", hue: 0.78,
      text: "A portfolio bigger than a browser window. Open a second one and both become holes onto the same desk, with a cursor host walking between them.", link: "https://github.com/adhammomen/Portfolio" },
    { title: "Proof", year: "2026", kind: "Experiment · Testing", status: "Shipped", hue: 0.36,
      text: "A portfolio where every claim is a test that runs live in the visitor's browser and gets stamped PASS, FAIL or PENDING.", link: "https://github.com/adhammomen/Portfolio" },
  ],
};
