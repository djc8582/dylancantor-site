/* Sticky listening bar.
   EDUCATION is six files but one 49:17 timeline: the scrubber spans the whole
   album and seeking crosses file boundaries. It rolls into "I Feel Like" at the
   end. "I Feel Like" on its own does not advance to anything.
   Nothing is downloaded until someone presses play: the <audio> element gets
   its src lazily (preload="none"), and the bar's times come from the measured
   lengths below, so an idle page costs no audio bytes. Playback then streams
   with HTTP range requests. */
(function () {
  /* measured durations of the six EDUCATION parts, in order */
  var ALBUM_LEN = [899.866, 860.160, 163.239, 261.669, 460.617, 311.719];
  var ALBUM_OFF = [], ALBUM_TOTAL = 0;
  for (var z = 0; z < ALBUM_LEN.length; z++) { ALBUM_OFF.push(ALBUM_TOTAL); ALBUM_TOTAL += ALBUM_LEN[z]; }
  var ALBUM_N = ALBUM_LEN.length;

  var TRACKS = [
    { title: "EDUCATION", artist: "Close Quarters", src: "/audio/education-1.mp3", album: true },
    { title: "EDUCATION", artist: "Close Quarters", src: "/audio/education-2.mp3", album: true },
    { title: "EDUCATION", artist: "Close Quarters", src: "/audio/education-3.mp3", album: true },
    { title: "EDUCATION", artist: "Close Quarters", src: "/audio/education-4.mp3", album: true },
    { title: "EDUCATION", artist: "Close Quarters", src: "/audio/education-5.mp3", album: true },
    { title: "EDUCATION", artist: "Close Quarters", src: "/audio/education-6.mp3", album: true },
    { title: "I Feel Like", artist: "IRCAM — binaural mix", src: "/audio/ifeellike-binaural.mp3", len: 253.128 }
  ];

  var RELEASES = [
    { name: "Finch",          id: "5OhOl99IUJG1bYXtMftRXG" },
    { name: "Fritz Rango",    id: "6Z0Ak0Kk23AmTuu7juFcqd" },
    { name: "Bruner",         id: "6PhPHwmqXbgYSihzFU77fu" },
    { name: "Whippet",        id: "4KabMRpPXdbHJeJETz6q8K" },
    { name: "Ozstriker",      id: "6fQElZqvTULbOLZQwGHXO2" },
    { name: "Lord Whippet",   id: "4OzrxEtLvMS2aWTOjGylBq" },
    { name: "iLLER BOYS",     id: "12tbobwCUkZ7dAw99eA229" },
    { name: "Close Quarters", id: "4qhQLFoaOepWbxyHKl7WFk" }
  ];

  var KEY = "dc-player";
  var state = { i: 0, t: 0, playing: false };
  try {
    var saved = JSON.parse(sessionStorage.getItem(KEY) || "null");
    if (saved && typeof saved.i === "number" && TRACKS[saved.i]) state = saved;
  } catch (e) {}

  var pendingSeek = null;   /* position (s, within the current file) to apply once it is loaded */
  var loaded = null;        /* the src actually assigned to the <audio> element */

  function isAlbum(i) { return !!(TRACKS[i] && TRACKS[i].album); }

  function save() {
    try {
      sessionStorage.setItem(KEY, JSON.stringify({ i: state.i, t: curT(), playing: !audio.paused }));
    } catch (e) {}
  }

  function fmt(s) {
    if (!isFinite(s) || s < 0) s = 0;
    var m = Math.floor(s / 60), r = Math.floor(s % 60);
    return m + ":" + (r < 10 ? "0" : "") + r;
  }

  function isLoaded() { return loaded !== null && loaded === TRACKS[state.i].src; }
  /* position within the current file, whether or not it has been fetched yet */
  function curT() {
    if (isLoaded() && pendingSeek === null) return audio.currentTime || 0;
    return pendingSeek !== null ? pendingSeek : 0;
  }
  /* position on the timeline the bar is showing */
  function nowPos() {
    var t = curT();
    return isAlbum(state.i) ? ALBUM_OFF[state.i] + t : t;
  }
  function fullLen() {
    if (isAlbum(state.i)) return ALBUM_TOTAL;
    if (isLoaded() && isFinite(audio.duration)) return audio.duration;
    return TRACKS[state.i].len || 0;
  }
  /* give the <audio> element the current track, only when it is about to play */
  function ensureSrc() {
    var src = TRACKS[state.i].src;
    if (loaded !== src) { loaded = src; audio.src = src; }
    else applySeek();
  }
  function applySeek() {
    if (pendingSeek === null || !isLoaded() || audio.readyState < 1) return;
    audio.currentTime = Math.max(0, Math.min(pendingSeek, audio.duration - 0.25));
    pendingSeek = null;
  }
  function startPlay() {
    panel.hidden = true; embed.innerHTML = "";
    ensureSrc();
    return audio.play().catch(function () { setIcon(false); });
  }
  function partAt(pos) {
    for (var k = ALBUM_N - 1; k >= 0; k--) if (pos >= ALBUM_OFF[k]) return k;
    return 0;
  }

  var bar = document.createElement("div");
  bar.className = "player";
  bar.innerHTML =
    '<div class="pl-panel" hidden>' +
      '<div class="pl-panel-head"><b class="pl-panel-title"></b>' +
      '<button type="button" class="pl-close" aria-label="Close Spotify player">&times;</button></div>' +
      '<div class="pl-embed"></div>' +
    '</div>' +
    '<div class="player-inner">' +
      '<button class="pl-btn pl-play" type="button" aria-label="Play">' +
        '<svg viewBox="0 0 16 16" aria-hidden="true"><path class="pl-icon-play" d="M4 2.5v11l9-5.5z"/><g class="pl-icon-pause"><rect x="4" y="2.5" width="3" height="11"/><rect x="9" y="2.5" width="3" height="11"/></g></svg>' +
      '</button>' +
      '<button class="pl-btn pl-next" type="button" aria-label="Next">' +
        '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 2.5v11l8-5.5z"/><rect x="11.5" y="2.5" width="2" height="11"/></svg>' +
      '</button>' +
      '<div class="pl-meta"><b class="pl-title"></b><span class="pl-artist"></span></div>' +
      '<div class="pl-seekwrap">' +
        '<span class="pl-time pl-cur">0:00</span>' +
        '<input class="pl-seek" type="range" min="0" max="1000" value="0" step="1" aria-label="Seek" aria-valuetext="0:00">' +
        '<span class="pl-time pl-dur">0:00</span>' +
      '</div>' +
      '<button class="pl-btn pl-list" type="button" aria-label="Tracks and releases" aria-expanded="false">' +
        '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="3" width="12" height="1.6"/><rect x="2" y="7.2" width="12" height="1.6"/><rect x="2" y="11.4" width="12" height="1.6"/></svg>' +
      '</button>' +
      '<div class="pl-menu" hidden>' +
        '<div class="pl-tabs">' +
          '<button type="button" class="pl-tab on" data-tab="here" aria-pressed="true">On this site</button>' +
          '<button type="button" class="pl-tab" data-tab="spotify" aria-pressed="false">Releases</button>' +
        '</div>' +
        '<ul class="pl-pane pl-pane-here"></ul>' +
        '<ul class="pl-pane pl-pane-spotify" hidden></ul>' +
      '</div>' +
    '</div>';

  var audio = new Audio();
  audio.preload = "none";

  var q = function (s) { return bar.querySelector(s); };
  var elPlay = q(".pl-play"), elNext = q(".pl-next"),
      elTitle = q(".pl-title"), elArtist = q(".pl-artist"),
      elSeek = q(".pl-seek"), elCur = q(".pl-cur"), elDur = q(".pl-dur"),
      elList = q(".pl-list"), elMenu = q(".pl-menu"),
      paneHere = q(".pl-pane-here"), paneSpot = q(".pl-pane-spotify"),
      panel = q(".pl-panel"), panelTitle = q(".pl-panel-title"), embed = q(".pl-embed");

  TRACKS.forEach(function (t, i) {
    if (t.album && i > 0) return;
    var li = document.createElement("li");
    var sub = t.album ? "Album · " + fmt(ALBUM_TOTAL) : t.artist;
    li.innerHTML = '<button type="button"><b>' + t.title + '</b><span>' + sub + '</span></button>';
    li.dataset.i = i;
    li.querySelector("button").addEventListener("click", function () { load(i, true); closeMenu(); });
    paneHere.appendChild(li);
  });

  RELEASES.forEach(function (r) {
    var li = document.createElement("li");
    li.innerHTML = '<button type="button"><b>' + r.name + '</b><span>Spotify</span></button>';
    li.querySelector("button").addEventListener("click", function () { openEmbed(r); });
    paneSpot.appendChild(li);
  });

  Array.prototype.forEach.call(bar.querySelectorAll(".pl-tab"), function (b) {
    b.addEventListener("click", function () {
      Array.prototype.forEach.call(bar.querySelectorAll(".pl-tab"), function (x) {
        x.classList.toggle("on", x === b);
        x.setAttribute("aria-pressed", String(x === b));
      });
      paneHere.hidden = b.dataset.tab !== "here";
      paneSpot.hidden = b.dataset.tab !== "spotify";
    });
  });

  function openEmbed(r) {
    audio.pause();
    panelTitle.textContent = r.name;
    embed.innerHTML = '<iframe title="Spotify player: ' + r.name + '" style="border-radius:8px" src="https://open.spotify.com/embed/artist/' + r.id +
      '?utm_source=generator" width="100%" height="152" frameborder="0" loading="lazy" ' +
      'allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe>';
    panel.hidden = false;
    closeMenu();
    q(".pl-close").focus();
  }
  q(".pl-close").addEventListener("click", function () { panel.hidden = true; embed.innerHTML = ""; elList.focus(); });

  function markMenu() {
    Array.prototype.forEach.call(paneHere.children, function (li) {
      var i = Number(li.dataset.i);
      li.classList.toggle("on", isAlbum(state.i) ? isAlbum(i) : i === state.i);
    });
  }

  function load(i, play, seekWithin) {
    state.i = ((i % TRACKS.length) + TRACKS.length) % TRACKS.length;
    var t = TRACKS[state.i];
    if (!audio.paused) audio.pause();
    elTitle.textContent = t.title;
    elArtist.textContent = t.artist;
    pendingSeek = (typeof seekWithin === "number") ? seekWithin : null;
    paint();
    markMenu();
    save();
    if (play) startPlay();
  }

  function setIcon(playing) {
    elPlay.setAttribute("aria-label", playing ? "Pause" : "Play");
    bar.classList.toggle("playing", playing);
  }

  function paint() {
    var len = fullLen(), pos = nowPos();
    elDur.textContent = len ? fmt(len) : "0:00";
    elCur.textContent = fmt(pos);
    if (!seeking) {
      elSeek.value = len ? Math.round(pos / len * 1000) : 0;
      elSeek.setAttribute("aria-valuetext", fmt(pos) + " of " + fmt(len));
    }
  }

  elPlay.addEventListener("click", function () {
    if (audio.paused) startPlay();
    else audio.pause();
  });
  elNext.addEventListener("click", function () {
    // from anywhere in the album, next means "I Feel Like"; otherwise wrap round
    load(isAlbum(state.i) ? ALBUM_N : 0, true);
  });

  function closeMenu() {
    var hadFocus = elMenu.contains(document.activeElement);
    elMenu.hidden = true; elList.setAttribute("aria-expanded", "false");
    if (hadFocus) elList.focus();
  }
  elList.addEventListener("click", function (e) {
    e.stopPropagation();
    var open = elMenu.hidden;
    elMenu.hidden = !open;
    elList.setAttribute("aria-expanded", String(open));
  });
  document.addEventListener("click", function (e) { if (!bar.contains(e.target)) closeMenu(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !elMenu.hidden) closeMenu(); });

  var seeking = false;
  elSeek.addEventListener("input", function () {
    seeking = true;
    elCur.textContent = fmt(fullLen() * elSeek.value / 1000);
  });
  elSeek.addEventListener("change", function () {
    var target = fullLen() * elSeek.value / 1000;
    seeking = false;
    if (isAlbum(state.i)) {
      var j = partAt(target), within = target - ALBUM_OFF[j];
      if (j === state.i) seekWithin(within);
      else { load(j, !audio.paused, within); }
    } else {
      seekWithin(target);
    }
    paint();
    save();
  });

  function seekWithin(t) {
    if (isLoaded() && audio.readyState >= 1) audio.currentTime = Math.min(t, audio.duration || t);
    else pendingSeek = t;
  }

  audio.addEventListener("loadedmetadata", function () {
    applySeek();
    paint();
  });
  audio.addEventListener("timeupdate", function () { if (!seeking) paint(); });
  audio.addEventListener("play", function () { setIcon(true); save(); });
  audio.addEventListener("pause", function () { setIcon(false); save(); });

  audio.addEventListener("ended", function () {
    var next = state.i + 1;
    if (isAlbum(state.i) && TRACKS[next]) load(next, true);
    else { setIcon(false); save(); }
  });

  setInterval(function () { if (!audio.paused) save(); }, 2000);
  window.addEventListener("pagehide", save);

  window.dcPlayer = {
    tracks: TRACKS,
    play: function (i) {
      if (typeof i === "string") {
        for (var k = 0; k < TRACKS.length; k++) {
          if (TRACKS[k].title.toLowerCase() === i.toLowerCase()) { i = k; break; }
        }
      }
      if (typeof i !== "number") i = state.i;
      if (i === state.i || (isAlbum(i) && isAlbum(state.i))) {
        if (audio.paused) startPlay(); else audio.pause();
        return;
      }
      load(i, true);
    }
  };

  function mount() {
    document.body.appendChild(bar);
    document.body.classList.add("has-player");
    load(state.i, false, state.t > 0 ? state.t : undefined);
    if (state.playing) startPlay();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})();

/* Nav: highlight the section you are actually looking at.
   On project pages there are no in-page targets, so the markup's own
   aria-current is left alone. */
(function () {
  function start() {
    var links = Array.prototype.slice.call(document.querySelectorAll("nav a[href*='#']"));
    if (!links.length) return;
    var map = [];
    links.forEach(function (a) {
      var id = (a.getAttribute("href") || "").split("#")[1];
      var el = id && document.getElementById(id);
      if (el) map.push({ a: a, el: el });
    });
    if (!map.length) return;

    // Above the first section (the intro), the underline sits under the name.
    var home = document.querySelector("nav a.name");
    var ticking = false;
    function sync() {
      ticking = false;
      var y = window.pageYOffset + 120;
      var best = null;
      map.forEach(function (m) { if (m.el.offsetTop <= y) best = m; });
      if (window.innerHeight + window.pageYOffset >= document.body.offsetHeight - 80) {
        best = map[map.length - 1];
      }
      links.forEach(function (a) { a.removeAttribute("aria-current"); });
      if (home) home.removeAttribute("aria-current");
      var on = best ? best.a : home;
      if (on) on.setAttribute("aria-current", "true");
    }
    function onScroll() {
      if (!ticking) { ticking = true; window.requestAnimationFrame(sync); }
    }
    sync();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
