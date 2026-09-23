(function () {
  const data = window.PORTFOLIO;
  const $ = (id) => document.getElementById(id);

  const el = (tag, attrs = {}, text) => {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    if (text) node.textContent = text;
    return node;
  };

  document.title = `${data.name} — Portfolio`;
  $("name").textContent = data.name;
  $("tagline").textContent = data.tagline;
  $("about").textContent = data.about;
  $("footer-name").textContent = data.name;
  $("year").textContent = new Date().getFullYear();

  const links = $("links");
  if (data.links.github) links.append(el("a", { href: data.links.github }, "GitHub"));
  if (data.links.email) links.append(el("a", { href: `mailto:${data.links.email}` }, "Email"));

  const STATUS_LABEL = { finished: "Finished", "in-progress": "In progress" };

  function render(filter) {
    const grid = $("projects");
    grid.replaceChildren();
    data.projects
      .filter((p) => filter === "all" || p.status === filter)
      .forEach((p) => {
        const card = el("article", { class: "card" });
        const top = el("div", { class: "card-top" });
        top.append(el("h3", {}, p.title));
        top.append(el("span", { class: `badge ${p.status}` }, STATUS_LABEL[p.status] || p.status));
        card.append(top, el("p", {}, p.description));

        if (p.tags && p.tags.length) {
          const tags = el("ul", { class: "tags" });
          p.tags.forEach((t) => tags.append(el("li", {}, t)));
          card.append(tags);
        }

        const actions = el("div", { class: "actions" });
        if (p.repo) actions.append(el("a", { href: p.repo }, "Code"));
        if (p.demo) actions.append(el("a", { href: p.demo }, "Live demo"));
        if (actions.childElementCount) card.append(actions);

        grid.append(card);
      });
  }

  document.querySelectorAll(".filter").forEach((btn) =>
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      render(btn.dataset.filter);
    })
  );

  render("all");
})();
