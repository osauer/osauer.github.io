// A progressively enhanced screenshot tour. Links still open the full images
// without JavaScript; the controls operate only public synthetic captures.
const tour = document.querySelector("[data-desk-tour]");
if (tour) {
  const links = [...tour.querySelectorAll("[data-tour-view]")];
  const list = tour.querySelector(".tour-choices");
  const image = tour.querySelector("[data-tour-image]");
  const phone = tour.querySelector("[data-tour-mobile]");
  const darkPhone = tour.querySelector("[data-tour-mobile-dark]");
  const darkImage = tour.querySelector("[data-tour-dark]");
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
  const dark = () => document.documentElement.dataset.theme === "dark" || (!document.documentElement.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches);
  const targetFor = link => narrow.matches && link.dataset.mobile
    ? (dark() ? link.dataset.mobileDark : link.dataset.mobile)
    : (dark() ? link.dataset.dark : link.href);
  const syncFull = () => { full.href = targetFor(selected); };
  narrow.addEventListener("change", syncFull);
  window.addEventListener("site-theme-change", () => choose(selected));
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
      darkPhone.srcset = link.dataset.mobileDark || link.dataset.dark;
      darkImage.srcset = link.dataset.dark;
      image.src = link.href;
      image.alt = link.dataset.alt;
      title.textContent = link.dataset.title;
      caption.textContent = link.dataset.caption;
      selected = link;
      tour.querySelector("[data-tour-open]").setAttribute("aria-label", "Enlarge " + link.textContent.trim() + " screenshot");
      syncFull();
      full.setAttribute("aria-label", "Enlarge " + link.textContent.trim() + " screenshot");
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

// Plain activation keeps screenshots inside the page. Native dialog provides
// modal focus containment and Escape; modified clicks retain the image URL.
const viewer = document.createElement("dialog");
viewer.className = "image-viewer";
viewer.setAttribute("aria-labelledby", "viewer-title");
viewer.setAttribute("aria-describedby", "viewer-caption");
viewer.innerHTML = `<header class="viewer-toolbar"><h2 id="viewer-title">Canary Desk screenshot</h2><div class="viewer-actions"><button type="button" data-viewer-zoom disabled>Zoom in</button><button type="button" data-viewer-close autofocus>Close <span aria-hidden="true">×</span></button></div></header><div class="viewer-canvas"><img hidden alt=""><div class="viewer-message"><p role="status"></p><button type="button" data-viewer-retry hidden>Try again</button></div></div><p class="viewer-caption" id="viewer-caption"></p>`;
document.body.append(viewer);
const viewerImage = viewer.querySelector("img");
const viewerCaption = viewer.querySelector(".viewer-caption");
const viewerStatus = viewer.querySelector("[role=status]");
const viewerMessage = viewer.querySelector(".viewer-message");
const viewerZoom = viewer.querySelector("[data-viewer-zoom]");
const viewerRetry = viewer.querySelector("[data-viewer-retry]");
let imageURL, loadVersion = 0, previousOverflow;

async function loadScreenshot() {
  const version = ++loadVersion;
  viewer.classList.remove("is-zoomed");
  viewerZoom.textContent = "Zoom in";
  viewerZoom.setAttribute("aria-pressed", "false");
  viewerZoom.disabled = true;
  viewerImage.hidden = true;
  viewerMessage.hidden = false;
  viewerRetry.hidden = true;
  viewerStatus.textContent = "Loading screenshot…";
  const next = new Image();
  next.src = imageURL;
  try {
    await next.decode();
    if (version !== loadVersion || !viewer.open) return;
    viewerImage.src = imageURL;
    viewerImage.style.setProperty("--viewer-width", `${next.naturalWidth / 2}px`);
    viewerImage.style.setProperty("--viewer-pixels", `${next.naturalWidth}px`);
    viewerImage.hidden = false;
    viewerMessage.hidden = true;
    viewerStatus.textContent = "";
    viewerZoom.disabled = false;
  } catch {
    if (version !== loadVersion || !viewer.open) return;
    viewerStatus.textContent = "This screenshot didn’t load. Try again, or close this view to return to the page.";
    viewerRetry.hidden = false;
  }
}

function closeScreenshot() {
  ++loadVersion;
  document.documentElement.style.overflow = previousOverflow;
  viewer.close();
}
viewer.querySelector("[data-viewer-close]").addEventListener("click", closeScreenshot);
viewer.addEventListener("cancel", event => {
  event.preventDefault();
  closeScreenshot();
});
viewerRetry.addEventListener("click", loadScreenshot);
viewerZoom.addEventListener("click", () => {
  const zoomed = viewer.classList.toggle("is-zoomed");
  viewerZoom.textContent = zoomed ? "Fit image" : "Zoom in";
  viewerZoom.setAttribute("aria-pressed", String(zoomed));
  viewer.querySelector(".viewer-canvas").scrollTo(0, 0);
});
viewer.addEventListener("click", event => {
  if (event.target !== viewer) return;
  const bounds = viewer.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeScreenshot();
});

document.addEventListener("click", event => {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const link = event.target.closest("a[data-responsive-image], a[data-tour-full]");
  if (!link || typeof viewer.showModal !== "function") return;
  event.preventDefault();
  const image = link.querySelector("img") || tour?.querySelector("[data-tour-image]");
  imageURL = image?.currentSrc || link.href;
  viewerImage.alt = image?.alt || "Canary Desk screenshot";
  viewerCaption.textContent = viewerImage.alt;
  previousOverflow = document.documentElement.style.overflow;
  document.documentElement.style.overflow = "hidden";
  viewer.showModal();
  viewer.querySelector("[data-viewer-close]").focus({preventScroll: true});
  loadScreenshot();
});
