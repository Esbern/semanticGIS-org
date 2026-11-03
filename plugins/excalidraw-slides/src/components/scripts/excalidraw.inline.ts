// @ts-nocheck
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 40; // high enough for a small frame shown as a slide
const ZOOM_STEP = 0.15;

function initExcalidraw() {
  const framePage = document.querySelector(".page[data-frame='excalidraw']");
  if (framePage) {
    initSidebar(framePage);
    initPanZoom(framePage);
    return;
  }

  const embeddedPages = document.querySelectorAll(".excalidraw-page");
  for (const page of embeddedPages) {
    initPanZoom(page);
  }
}

function initSidebar(page) {
  const toggle = page.querySelector(".excalidraw-sidebar-toggle");
  if (!toggle) return;

  toggle.addEventListener("click", () => {
    page.classList.toggle("excalidraw-sidebar-open");
  });

  window.addCleanup(() => {
    page.classList.remove("excalidraw-sidebar-open");
  });
}

function initPanZoom(page) {
  const container = page.querySelector(".excalidraw-container");
  if (!container) return;

  const svg = container.querySelector("svg");
  if (!svg) return;

  container.style.backgroundColor = "var(--excalidraw-bg, var(--light))";

  var overlaysContainer = page.querySelector(".excalidraw-overlays");

  let zoom = 1;
  let panX = 0;
  let panY = 0;
  let isDragging = false;
  let startX = 0;
  let startY = 0;

  function positionOverlays() {
    if (!overlaysContainer) return;
    var overlays = overlaysContainer.querySelectorAll(".excalidraw-overlay");
    if (overlays.length === 0) return;

    var offX = parseFloat(overlaysContainer.getAttribute("data-offset-x")) || 0;
    var offY = parseFloat(overlaysContainer.getAttribute("data-offset-y")) || 0;

    var ctm = svg.getScreenCTM();
    var containerRect = container.getBoundingClientRect();
    if (!ctm) return;

    for (var i = 0; i < overlays.length; i++) {
      var el = overlays[i];
      var ex = parseFloat(el.getAttribute("data-x")) || 0;
      var ey = parseFloat(el.getAttribute("data-y")) || 0;
      var ew = parseFloat(el.getAttribute("data-w")) || 0;
      var eh = parseFloat(el.getAttribute("data-h")) || 0;

      var svgX = ex + offX;
      var svgY = ey + offY;

      var screenLeft = svgX * ctm.a + ctm.e - containerRect.left;
      var screenTop = svgY * ctm.d + ctm.f - containerRect.top;
      var screenWidth = ew * ctm.a;
      var screenHeight = eh * ctm.d;

      el.style.left = screenLeft + "px";
      el.style.top = screenTop + "px";
      el.style.width = screenWidth + "px";
      el.style.height = screenHeight + "px";
      el.style.display = "flex";
    }
  }

  positionOverlays();

  function applyTransform() {
    svg.style.transform = "translate(" + panX + "px, " + panY + "px) scale(" + zoom + ")";
    positionOverlays();
  }

  function handleWheel(e) {
    e.preventDefault();
    var delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom + delta));
    applyTransform();
  }

  function handleMouseDown(e) {
    if (e.button !== 0) return;
    isDragging = true;
    startX = e.clientX - panX;
    startY = e.clientY - panY;
    container.style.cursor = "grabbing";
  }

  function handleMouseMove(e) {
    if (!isDragging) return;
    panX = e.clientX - startX;
    panY = e.clientY - startY;
    applyTransform();
  }

  function handleMouseUp() {
    isDragging = false;
    container.style.cursor = "grab";
  }

  var zoomInBtn = page.querySelector(".excalidraw-zoom-in");
  var zoomOutBtn = page.querySelector(".excalidraw-zoom-out");
  var resetBtn = page.querySelector(".excalidraw-reset");

  if (zoomInBtn) {
    zoomInBtn.addEventListener("click", function () {
      zoom = Math.min(MAX_ZOOM, zoom + ZOOM_STEP);
      applyTransform();
    });
  }

  if (zoomOutBtn) {
    zoomOutBtn.addEventListener("click", function () {
      zoom = Math.max(MIN_ZOOM, zoom - ZOOM_STEP);
      applyTransform();
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", function () {
      zoom = 1;
      panX = 0;
      panY = 0;
      applyTransform();
    });
  }

  var lastTouchDist = 0;

  function handleTouchStart(e) {
    if (e.touches.length === 1) {
      isDragging = true;
      startX = e.touches[0].clientX - panX;
      startY = e.touches[0].clientY - panY;
    } else if (e.touches.length === 2) {
      isDragging = false;
      var dx = e.touches[0].clientX - e.touches[1].clientX;
      var dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDist = Math.sqrt(dx * dx + dy * dy);
    }
  }

  function handleTouchMove(e) {
    e.preventDefault();
    if (e.touches.length === 1 && isDragging) {
      panX = e.touches[0].clientX - startX;
      panY = e.touches[0].clientY - startY;
      applyTransform();
    } else if (e.touches.length === 2 && lastTouchDist > 0) {
      var dx = e.touches[0].clientX - e.touches[1].clientX;
      var dy = e.touches[0].clientY - e.touches[1].clientY;
      var dist = Math.sqrt(dx * dx + dy * dy);
      var scale = dist / lastTouchDist;
      zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom * scale));
      lastTouchDist = dist;
      applyTransform();
    }
  }

  function handleTouchEnd() {
    isDragging = false;
    lastTouchDist = 0;
  }

  // --- Slideshow: zoom to the drawing's frames one at a time ---
  var article = container.closest(".excalidraw-page");
  var slides = [];
  try {
    slides = JSON.parse((article && article.getAttribute("data-slides")) || "[]");
  } catch (err) {
    slides = [];
  }
  var current = -1;
  var counter = page.querySelector(".excalidraw-slide-counter");

  // A slide sets the SVG's viewBox to the frame (plus a small margin): the browser then fits the
  // frame to the window exactly as it fits the whole drawing, so no zoom arithmetic is needed.
  var fullViewBox = svg.getAttribute("viewBox");

  function fitSlide(i) {
    var slide = slides[i];
    if (!slide || slide.width <= 0 || slide.height <= 0) return;
    var m = Math.max(slide.width, slide.height) * 0.025;
    svg.setAttribute(
      "viewBox",
      slide.x - m + " " + (slide.y - m) + " " + (slide.width + 2 * m) + " " + (slide.height + 2 * m),
    );
    zoom = 1;
    panX = 0;
    panY = 0;
    applyTransform();
  }

  function showSlide(i) {
    if (slides.length === 0) return;
    current = Math.max(0, Math.min(slides.length - 1, i));
    page.classList.add("excalidraw-presenting");
    if (counter) counter.textContent = current + 1 + " / " + slides.length;
    fitSlide(current);
  }

  function leaveSlides() {
    current = -1;
    if (fullViewBox) svg.setAttribute("viewBox", fullViewBox);
    page.classList.remove("excalidraw-presenting");
    if (counter) counter.textContent = slides.length + " slides";
    zoom = 1;
    panX = 0;
    panY = 0;
    applyTransform();
  }

  function handleKey(e) {
    if (slides.length === 0) return;
    var target = e.target;
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
    if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") {
      e.preventDefault();
      showSlide(current + 1);
    } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
      e.preventDefault();
      showSlide(current < 0 ? 0 : current - 1);
    } else if (e.key === "Home") {
      showSlide(0);
    } else if (e.key === "End") {
      showSlide(slides.length - 1);
    } else if (e.key === "Escape" && !document.fullscreenElement) {
      leaveSlides();
    }
  }

  function handleResize() {
    if (current >= 0) fitSlide(current);
  }

  function handleFullscreenChange() {
    if (!document.fullscreenElement && current >= 0) leaveSlides();
    else handleResize();
  }

  var prevBtn = page.querySelector(".excalidraw-slide-prev");
  var nextBtn = page.querySelector(".excalidraw-slide-next");
  var presentBtn = page.querySelector(".excalidraw-slide-present");
  function onPrev() {
    showSlide(current < 0 ? 0 : current - 1);
  }
  function onNext() {
    showSlide(current + 1);
  }
  function onPresent() {
    if (article && article.requestFullscreen && !document.fullscreenElement) {
      article.requestFullscreen().then(function () {
        showSlide(current < 0 ? 0 : current);
      }, function () {
        showSlide(current < 0 ? 0 : current);
      });
    } else {
      showSlide(current < 0 ? 0 : current);
    }
  }
  if (resetBtn) resetBtn.addEventListener("click", leaveSlides);
  if (prevBtn) prevBtn.addEventListener("click", onPrev);
  if (nextBtn) nextBtn.addEventListener("click", onNext);
  if (presentBtn) presentBtn.addEventListener("click", onPresent);
  if (slides.length > 0) {
    document.addEventListener("keydown", handleKey);
    window.addEventListener("resize", handleResize);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
  }

  container.addEventListener("wheel", handleWheel, { passive: false });
  container.addEventListener("mousedown", handleMouseDown);
  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", handleMouseUp);
  container.addEventListener("touchstart", handleTouchStart, { passive: true });
  container.addEventListener("touchmove", handleTouchMove, { passive: false });
  container.addEventListener("touchend", handleTouchEnd);

  window.addCleanup(function () {
    container.removeEventListener("wheel", handleWheel);
    container.removeEventListener("mousedown", handleMouseDown);
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
    container.removeEventListener("touchstart", handleTouchStart);
    container.removeEventListener("touchmove", handleTouchMove);
    container.removeEventListener("touchend", handleTouchEnd);
    document.removeEventListener("keydown", handleKey);
    window.removeEventListener("resize", handleResize);
    document.removeEventListener("fullscreenchange", handleFullscreenChange);
    if (resetBtn) resetBtn.removeEventListener("click", leaveSlides);
    if (prevBtn) prevBtn.removeEventListener("click", onPrev);
    if (nextBtn) nextBtn.removeEventListener("click", onNext);
    if (presentBtn) presentBtn.removeEventListener("click", onPresent);
    page.classList.remove("excalidraw-presenting");
  });
}

document.addEventListener("nav", initExcalidraw);
