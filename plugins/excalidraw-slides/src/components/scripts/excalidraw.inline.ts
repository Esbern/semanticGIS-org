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
  svg.style.transformOrigin = "50% 50%";

  function fitSlide(i) {
    var slide = slides[i];
    if (!slide) return;
    // Measure the frame on screen with no zoom or pan, then work out the zoom and pan that
    // fit it to the container (the transform scales around the SVG's centre).
    zoom = 1;
    panX = 0;
    panY = 0;
    svg.style.transform = "none";
    var ctm = svg.getScreenCTM();
    if (!ctm) return;
    var box = container.getBoundingClientRect();
    var svgBox = svg.getBoundingClientRect();
    var left = slide.x * ctm.a + ctm.e;
    var top = slide.y * ctm.d + ctm.f;
    var w = slide.width * ctm.a;
    var h = slide.height * ctm.d;
    if (w <= 0 || h <= 0) return;
    var z = Math.min(box.width / w, box.height / h) * 0.95;
    var ox = svgBox.left + svgBox.width / 2;
    var oy = svgBox.top + svgBox.height / 2;
    zoom = z;
    panX = box.left + box.width / 2 - ox - z * (left + w / 2 - ox);
    panY = box.top + box.height / 2 - oy - z * (top + h / 2 - oy);
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
