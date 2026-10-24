// Everything the site says lives here. The page generator (scripts/gen-pages.js) and the browser both read it.
export const CONTENT = {
  name: 'Adham Momen',
  role: 'Developer & Builder',
  location: 'Independent',
  email: 'adhammomen64@gmail.com',
  github: 'https://github.com/adhammomen',
  year: '2026',

  tagline: 'Systems, made tangible.',
  intro: 'I build the systems underneath and the surfaces people touch: platforms, servers, products and interfaces, from the first line to the box they run on.',

  statement: ['I build the systems', 'underneath and the', 'surfaces people touch.'],
  statementSub: 'Platforms, servers, products and interfaces, from the first line to the box they run on.',

  signal: ['Quiet where it should be,', 'loud where it matters.'],
  signalSub: 'Most of a system should disappear. The few parts people feel should be impossible to miss.',

  capabilities: [
    { key: 'platforms', title: 'Platforms', video: 'platforms',
      text: 'Products from the database to the button: the API, the data model, sign-in, billing and the realtime parts in between.',
      items: ['Full-stack products', 'APIs & data', 'Auth, billing, realtime'] },
    { key: 'infrastructure', title: 'Infrastructure', video: 'infrastructure',
      text: 'The box it all runs on. I keep my own servers alive, deploy them, automate them and watch them.',
      items: ['Self-hosted servers', 'Deploys & automation', 'Monitoring'] },
    { key: 'interfaces', title: 'Interfaces', video: 'interfaces',
      text: 'The surface people touch: product design, creative development, WebGL and motion, like the page you are scrolling.',
      items: ['Product design', 'Creative development', 'WebGL & motion'] },
  ],

  // tags drive the filters on /work. status: 'In progress' or 'Shipped'. images live in assets/img/work/<slug>-N.(avif|jpg)
  projects: [
    { slug: 'ordium', title: 'Ordium', year: '2026', kind: 'Platform · Server', tags: ['Platform', 'Server'], status: 'In progress',
      line: 'The big one, built end to end.',
      summary: 'The big one. A platform I am building end to end, running on a server I keep alive myself.',
      body: ['Ordium is the big one: the platform, the backend under it and the server under that, all built by me. It is still being built, so this page stays short on purpose.', 'Details soon. The visuals here are placeholders made for this site, not screenshots.'],
      images: 2, links: [] },
    { slug: 'kingsmaker', title: 'Kingsmaker', year: '2026', kind: 'Product', tags: ['Product'], status: 'In progress',
      line: 'A side idea that refused to leave.',
      summary: 'Started as a side idea and refused to leave. A product in the making.',
      body: ['Kingsmaker started as a side idea and kept coming back until it became a product of its own. It is in progress.', 'Details soon. The visuals here are placeholders made for this site, not screenshots.'],
      images: 2, links: [] },
    { slug: 'two-windows', title: 'Two Windows', year: '2026', kind: 'Experiment · Browser APIs', tags: ['Experiment'], status: 'Shipped',
      line: 'A portfolio bigger than a browser window.',
      summary: 'A portfolio bigger than a browser window. Open a second one and both become holes onto the same desk, with a cursor host walking between them.',
      body: [
        'The page pins itself to the monitor. Open a second window and the page reflows to the size of the screen; every window shows the slice of it that sits where the window sits. Drag one across the screen and it slides across the page.',
        'A second cursor, labelled with my name, gives the tour: it writes my name in pen, walks between the windows, sketches the architecture of a project on the other sheet and moves your window into place when the browser allows it.',
        'Dragged over the first window, a window becomes an x-ray of the page; made small, it becomes a loupe. The first window runs the show and the others mirror it over a BroadcastChannel, with no server.',
      ],
      images: 2, links: [{ label: 'Open it', href: 'lab/two-windows/', local: true }, { label: 'Source', href: 'https://github.com/adhammomen/Portfolio' }] },
    { slug: 'proof', title: 'Proof', year: '2026', kind: 'Experiment · Testing', tags: ['Experiment'], status: 'Shipped',
      line: 'Every claim is a test that runs in your browser.',
      summary: 'A portfolio where every claim is a test that runs live in the visitor\'s browser and gets stamped PASS, FAIL or PENDING.',
      body: [
        'Every claim on the page is a test, and the tests run when the page opens, against the real thing: the server\'s vitals, the GitHub API, the page\'s own weight, speed, contrast and console, and the visitor\'s device.',
        'Each claim gets stamped as it runs, with the evidence and the test\'s source one tap away. What is not done yet is stamped PENDING on the page instead of being left out.',
      ],
      images: 2, links: [{ label: 'Open it', href: 'lab/proof/', local: true }, { label: 'Source', href: 'https://github.com/adhammomen/Portfolio' }] },
  ],

  flagship: 'ordium',

  // the homepage is the A, floor by floor, top to bottom. Floor numbers match assets/js/mark.js.
  floors: [
    { key: 'hero', name: 'Hero' },
    { key: 'statement', name: 'Statement' },
    { key: 'capabilities', name: 'Capabilities' },
    { key: 'progress', name: 'In progress', projects: ['ordium', 'kingsmaker'] },
    { key: 'shipped', name: 'Shipped', projects: ['two-windows', 'proof'] },
    { key: 'signal', name: 'Signal' },
    { key: 'base', name: 'About · Contact' },
  ],
  available: 'Available for new work',
  aboutShort: 'Independent developer. I build platforms end to end and keep the servers they run on alive.',

  lab: [
    { title: 'Two Windows', href: 'lab/two-windows/' },
    { title: 'Proof', href: 'lab/proof/' },
  ],
};
