// Stage: a box of rigid bodies rendered as DOM elements. Used for the hero letters,
// the capability pills and the contact letters. One Matter engine per stage; a stage
// only steps while it is on screen.
(function () {
  const { Engine, Bodies, Body, Composite, Events } = Matter;

  function Stage(el, opts = {}) {
    const engine = Engine.create({ gravity: { x: 0, y: opts.gravity == null ? 1.4 : opts.gravity } });
    engine.positionIterations = 8; engine.velocityIterations = 6;
    const world = engine.world;
    const items = []; // { el, body, w, h }
    let walls = [], w = 0, h = 0, running = false, raf = 0, last = 0;
    const listeners = { collide: [] };

    function bounds() {
      const r = el.getBoundingClientRect();
      w = r.width; h = r.height;
      walls.forEach((b) => Composite.remove(world, b));
      const T = 400;
      walls = [
        Bodies.rectangle(w / 2, h + T / 2, w + 2 * T, T, { isStatic: true }),          // floor
        Bodies.rectangle(-T / 2, h / 2, T, h * 4, { isStatic: true }),                 // left
        Bodies.rectangle(w + T / 2, h / 2, T, h * 4, { isStatic: true }),              // right
        Bodies.rectangle(w / 2, -h * 1.5 - T / 2, w + 2 * T, T, { isStatic: true }),   // ceiling, high up
      ];
      Composite.add(world, walls);
    }

    function add(child, { x, y, angle = 0, mass, shape = "box" } = {}) {
      const r = child.getBoundingClientRect();
      const bw = r.width, bh = r.height;
      const body = shape === "pill"
        ? Bodies.rectangle(x, y, bw, bh, { chamfer: { radius: bh / 2 } })
        : Bodies.rectangle(x, y, bw, bh);
      body.restitution = opts.restitution == null ? 0.25 : opts.restitution;
      body.friction = 0.6; body.frictionAir = 0.012;
      if (mass) Body.setMass(body, mass);
      Body.setAngle(body, angle);
      Composite.add(world, body);
      const item = { el: child, body, w: bw, h: bh };
      items.push(item);
      child.classList.add("body");
      return item;
    }

    function render() {
      for (const { el: c, body, w: bw, h: bh } of items) {
        c.style.transform = `translate3d(${(body.position.x - bw / 2).toFixed(1)}px,${(body.position.y - bh / 2).toFixed(1)}px,0) rotate(${body.angle.toFixed(3)}rad)`;
      }
    }

    function step(now) {
      const dt = Math.min(32, now - last || 16.6); last = now;
      Engine.update(engine, dt);
      render();
      if (running) raf = requestAnimationFrame(step);
    }
    function start() { if (running) return; running = true; last = 0; raf = requestAnimationFrame(step); }
    function stop() { running = false; cancelAnimationFrame(raf); }

    // drag + throw: pointer events on the bodies themselves, so page scroll still works elsewhere
    let drag = null;
    function onDown(e) {
      const item = items.find((i) => i.el === e.currentTarget);
      if (!item) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      const r = el.getBoundingClientRect();
      drag = { item, px: e.clientX - r.left, py: e.clientY - r.top, vx: 0, vy: 0, t: performance.now() };
      Body.setStatic(item.body, false);
      item.el.classList.add("held");
      start();
    }
    function onMove(e) {
      if (!drag) return;
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      const now = performance.now(), dt = Math.max(1, now - drag.t);
      drag.vx = (x - drag.px) / dt * 16; drag.vy = (y - drag.py) / dt * 16;
      drag.px = x; drag.py = y; drag.t = now;
      Body.setPosition(drag.item.body, { x, y });
      Body.setVelocity(drag.item.body, { x: drag.vx, y: drag.vy });
      Body.setAngularVelocity(drag.item.body, drag.item.body.angularVelocity * 0.9);
    }
    function onUp() {
      if (!drag) return;
      Body.setVelocity(drag.item.body, { x: drag.vx, y: drag.vy });
      drag.item.el.classList.remove("held");
      drag = null;
    }
    function bindDrag(item) {
      item.el.addEventListener("pointerdown", onDown);
      item.el.addEventListener("pointermove", onMove);
      item.el.addEventListener("pointerup", onUp);
      item.el.addEventListener("pointercancel", onUp);
      item.el.addEventListener("lostpointercapture", onUp);
    }

    // the pointer as a physical object: a circle that follows it and shoves bodies aside
    const probe = Bodies.circle(-1000, -1000, opts.probe || 28, { isStatic: true, restitution: 0.1, friction: 0.05, render: { visible: false } });
    Composite.add(world, probe);
    let probeOn = false;
    function probeTo(x, y) {
      const r = el.getBoundingClientRect();
      const lx = x - r.left, ly = y - r.top;
      const inside = lx > -40 && lx < w + 40 && ly > -40 && ly < h + 40;
      if (inside) {
        // move via velocity so the impulse transfers to what it touches
        Body.setPosition(probe, { x: lx, y: ly });
        if (!probeOn) { probeOn = true; }
        start();
      } else if (probeOn) { probeOn = false; Body.setPosition(probe, { x: -1000, y: -1000 }); }
    }
    Events.on(engine, "beforeUpdate", () => {
      // static bodies don't transfer momentum; nudge anything overlapping the probe
      if (!probeOn) return;
      for (const { body } of items) {
        const dx = body.position.x - probe.position.x, dy = body.position.y - probe.position.y;
        const d = Math.hypot(dx, dy), reach = probe.circleRadius + Math.max(body.bounds.max.x - body.bounds.min.x, body.bounds.max.y - body.bounds.min.y) / 2;
        if (d < reach && d > 0.01) {
          const k = (1 - d / reach) * 0.0028 * body.mass;
          Body.applyForce(body, body.position, { x: dx / d * k, y: dy / d * k - 0.0006 * body.mass });
        }
      }
    });

    // assemble: pull every body to a target slot with springs, then release
    let assembling = 0;
    function assemble(targets, ms = 900) {
      assembling = performance.now() + ms;
      const t0 = performance.now();
      const starts = items.map(({ body }) => ({ x: body.position.x, y: body.position.y, a: body.angle }));
      items.forEach(({ body }) => { body.isSensor = true; }); // pass through each other on the way
      start();
      (function tick() {
        const k = Math.min(1, (performance.now() - t0) / ms), e = 1 - Math.pow(1 - k, 3);
        items.forEach(({ body }, i) => {
          const t = targets[i]; if (!t) return;
          Body.setVelocity(body, { x: 0, y: 0 }); Body.setAngularVelocity(body, 0);
          Body.setPosition(body, { x: starts[i].x + (t.x - starts[i].x) * e, y: starts[i].y + (t.y - starts[i].y) * e });
          Body.setAngle(body, starts[i].a + (0 - starts[i].a) * e);
        });
        if (k < 1) requestAnimationFrame(tick);
        else items.forEach(({ body }, i) => { body.isSensor = false; const t = targets[i]; if (t) { Body.setPosition(body, t); Body.setAngle(body, 0); Body.setVelocity(body, { x: 0, y: 0 }); Body.setAngularVelocity(body, 0); } });
      })();
    }

    function scatter(power = 1) {
      for (const { body } of items) {
        Body.setVelocity(body, { x: (Math.random() - 0.5) * 30 * power, y: -(12 + Math.random() * 22) * power });
        Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.4 * power);
      }
      start();
    }
    function gravity(x, y) { engine.gravity.x = x; engine.gravity.y = y; start(); }
    function impulse(x, y) { for (const { body } of items) Body.applyForce(body, body.position, { x: x * body.mass * 0.02, y: y * body.mass * 0.02 }); start(); }

    // settle the simulation when everything is at rest
    Events.on(engine, "afterUpdate", () => {
      if (drag) return;
      const awake = items.some(({ body }) => body.speed > 0.05 || Math.abs(body.angularSpeed) > 0.002);
      if (!awake) stop();
    });
    Events.on(engine, "collisionStart", (ev) => {
      for (const pair of ev.pairs) {
        const sp = Math.hypot(pair.bodyA.velocity.x - pair.bodyB.velocity.x, pair.bodyA.velocity.y - pair.bodyB.velocity.y);
        if (sp > 3) listeners.collide.forEach((fn) => fn(sp, pair));
      }
    });

    // only simulate while visible
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) start(); else stop(); }, { threshold: 0.05 });
    io.observe(el);

    // keep bodies inside on resize: rebuild walls and pull anything outside back in
    let rt = 0;
    addEventListener("resize", () => {
      clearTimeout(rt);
      rt = setTimeout(() => {
        bounds();
        for (const { body, w: bw } of items) {
          if (body.position.x > w - bw / 2) Body.setPosition(body, { x: w - bw / 2, y: body.position.y });
          if (body.position.x < bw / 2) Body.setPosition(body, { x: bw / 2, y: body.position.y });
        }
        start();
      }, 120);
    });

    bounds();
    return {
      add: (child, o) => { const it = add(child, o); bindDrag(it); return it; },
      start, stop, scatter, gravity, impulse, render, probeTo, assemble,
      onCollide: (fn) => listeners.collide.push(fn),
      get size() { return { w, h }; },
      items, engine,
    };
  }

  window.Stage = Stage;
})();
