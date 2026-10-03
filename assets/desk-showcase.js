// A progressively enhanced screenshot tour. Links still open the full images
// without JavaScript; the controls operate only public synthetic captures.
const tour = document.querySelector("[data-desk-tour]");
if (tour) {
  const links = [...tour.querySelectorAll("[data-tour-view]")];
  const list = tour.querySelector(".tour-choices");
  const image = tour.querySelector("[data-tour-image]");
  const phone = tour.querySelector("[data-tour-mobile]");
  const title = tour.querySelector("[data-tour-title]");
  const caption = tour.querySelector("[data-tour-caption]");
  const full = tour.querySelector("[data-tour-full]");
  const panel = tour.querySelector(".tour-screen");
  const status = tour.querySelector("[data-tour-status]");
  list.setAttribute("role", "tablist");
  list.setAttribute("aria-label", "Explore Canary Desk");
  panel.setAttribute("role", "tabpanel");
  panel.tabIndex = 0;
  let request = 0;
  let selected = links[0];
  const narrow = matchMedia("(max-width: 760px)");
  const targetFor = link => narrow.matches && link.dataset.mobile ? link.dataset.mobile : link.href;
  const syncFull = () => { full.href = targetFor(selected); };
  narrow.addEventListener("change", syncFull);
  syncFull();

  links.forEach((link, i) => {
    link.id = "desk-view-" + link.dataset.tourView;
    link.setAttribute("role", "tab");
    link.setAttribute("aria-controls", panel.id);
    link.setAttribute("aria-selected", String(i === 0));
    link.tabIndex = i === 0 ? 0 : -1;
    link.addEventListener("click", event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      choose(link);
    });
    link.addEventListener("keydown", event => {
      let index = links.indexOf(link);
      if (event.key === "ArrowRight") index = (index + 1) % links.length;
      else if (event.key === "ArrowLeft") index = (index + links.length - 1) % links.length;
      else if (event.key === "Home") index = 0;
      else if (event.key === "End") index = links.length - 1;
      else if (event.key === " ") { event.preventDefault(); choose(link); return; }
      else return;
      event.preventDefault();
      links[index].focus();
      choose(links[index]);
    });
  });
  panel.setAttribute("aria-labelledby", links[0].id);

  async function choose(link) {
    const version = ++request;
    status.textContent = "";
    panel.setAttribute("aria-busy", "true");
    const next = new Image();
    next.src = targetFor(link);
    try {
      await next.decode();
      if (version !== request) return;
      phone.srcset = link.dataset.mobile || link.href;
      image.src = link.href;
      image.alt = link.dataset.alt;
      title.textContent = link.dataset.title;
      caption.textContent = link.dataset.caption;
      selected = link;
      syncFull();
      full.setAttribute("aria-label", "Open full-size " + link.textContent.trim() + " screenshot");
      tour.dataset.selected = link.dataset.tourView;
      panel.setAttribute("aria-labelledby", link.id);
      links.forEach(item => {
        const active = item === link;
        item.setAttribute("aria-selected", String(active));
        item.tabIndex = active ? 0 : -1;
      });
    } catch {
      if (version === request) {
        status.textContent = link.textContent.trim() + " did not load. Choose it again, or ";
        const direct = document.createElement("a"); direct.href = targetFor(link); direct.target = "_blank"; direct.rel = "noopener"; direct.textContent = "open the image directly \u2197";
        status.append(direct, ".");
      }
    } finally {
      if (version === request) panel.removeAttribute("aria-busy");
    }
  }
}

// Full-size always means the same image currently shown by each picture.
for (const link of document.querySelectorAll("a[data-responsive-image]")) {
  const img = link.querySelector("img");
  const sync = () => { if (img?.currentSrc) link.href = img.currentSrc; };
  img?.addEventListener("load", sync);
  link.addEventListener("click", sync);
  matchMedia("(max-width: 760px)").addEventListener("change", () => requestAnimationFrame(sync));
  sync();
}
