/* VidShare 포트폴리오 사이트 — 공통 동작
   1) 스크롤 등장  2) 스크린샷 라이트박스  3) 사이드 목차 현재 위치 표시 */

(function () {
  "use strict";

  /* ---------- 1. 스크롤 등장 ---------- */

  var targets = document.querySelectorAll(".reveal");

  if (!("IntersectionObserver" in window)) {
    targets.forEach(function (el) { el.classList.add("in"); });
  } else {
    var revealer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("in");
          revealer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.06 }
    );
    targets.forEach(function (el) { revealer.observe(el); });
  }

  /* ---------- 2. 스크린샷 라이트박스 ---------- */

  var shots = document.querySelectorAll("figure.shot img");

  if (shots.length) {
    var box = document.createElement("div");
    box.className = "lightbox";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.hidden = true;
    box.innerHTML =
      '<button class="lightbox-x" type="button" aria-label="닫기">&times;</button>' +
      '<div><img alt=""><p class="lightbox-cap"></p></div>';
    document.body.appendChild(box);

    var boxImg = box.querySelector("img");
    var boxCap = box.querySelector(".lightbox-cap");
    var lastFocus = null;

    function open(img) {
      lastFocus = document.activeElement;
      boxImg.src = img.src;
      boxImg.alt = img.alt || "";
      var cap = img.closest("figure").querySelector("figcaption");
      boxCap.textContent = cap ? cap.textContent.trim() : "";
      box.hidden = false;
      box.classList.add("open");
      document.body.style.overflow = "hidden";
      box.querySelector(".lightbox-x").focus();
    }

    function close() {
      box.classList.remove("open");
      box.hidden = true;
      boxImg.removeAttribute("src");
      document.body.style.overflow = "";
      if (lastFocus) lastFocus.focus();
    }

    shots.forEach(function (img) {
      img.tabIndex = 0;
      img.setAttribute("role", "button");
      img.addEventListener("click", function () { open(img); });
      img.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(img); }
      });
    });

    box.addEventListener("click", function (e) {
      if (e.target === box || e.target.classList.contains("lightbox-x")) close();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && box.classList.contains("open")) close();
    });
  }

  /* ---------- 3. 사이드 목차 현재 위치 ---------- */

  var sideLinks = document.querySelectorAll(".side a[href^='#']");
  if (!sideLinks.length) return;

  var byId = {};
  var sections = [];

  sideLinks.forEach(function (link) {
    var el = document.getElementById(link.getAttribute("href").slice(1));
    if (!el) return;
    byId[el.id] = link;
    sections.push(el);
  });
  if (!sections.length) return;

  var LINE = 130; // 뷰포트 상단에서 이만큼 아래를 "현재 읽는 지점"으로 본다
  var painted = null;

  function paint() {
    // 기준선을 이미 지나친 섹션 중 마지막 것. 섹션 높이가 제각각이어도
    // (스크린샷 갤러리처럼 아주 긴 섹션 포함) 항상 하나로 정해진다.
    var current = sections[0];
    for (var i = 0; i < sections.length; i++) {
      if (sections[i].getBoundingClientRect().top <= LINE) current = sections[i];
    }

    // 문서 끝에서는 마지막 섹션을 짧더라도 활성으로 둔다
    var atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
    if (atBottom) current = sections[sections.length - 1];

    if (current === painted) return;
    painted = current;
    sideLinks.forEach(function (l) { l.classList.remove("is-active"); });
    byId[current.id].classList.add("is-active");
  }

  var queued = false;
  function onScroll() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () { queued = false; paint(); });
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  paint();
})();
