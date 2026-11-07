/* Sticky listening bar. Lives on every page and keeps its place across navigations.
   EDUCATION plays straight through and rolls into "I Feel Like" at the end.
   "I Feel Like" on its own does not advance to anything. */
(function () {
  var ALBUM = "EDUCATION";

  var TRACKS = [
    { title: "EDUCATION",   artist: ALBUM + " · I",   src: "audio/education-1.mp3", album: true },
    { title: "EDUCATION",   artist: ALBUM + " · II",  src: "audio/education-2.mp3", album: true },
    { title: "EDUCATION",   artist: ALBUM + " · III", src: "audio/education-3.mp3", album: true },
    { title: "EDUCATION",   artist: ALBUM + " · IV",  src: "audio/education-4.mp3", album: true },
    { title: "EDUCATION",   artist: ALBUM + " · V",   src: "audio/education-5.mp3", album: true },
    { title: "EDUCATION",   artist: ALBUM + " · VI",  src: "audio/education-6.mp3", album: true },
    { title: "I Feel Like", artist: "IRCAM — binaural mix", src: "audio/ifeellike-binaural.mp3" }
  ];

  var RELEASES = [
    { name: "Finch",         id: "5OhOl99IUJG1bYXtMftRXG" },
    { name: "Fritz Rango",   id: "6Z0Ak0Kk23AmTuu7juFcqd" },
    { name: "Bruner",        id: "6PhPHwmqXbgYSihzFU77fu" },
    { name: "Whippet",       id: "4KabMRpPXdbHJeJETz6q8K" },
    { name: "Ozstriker",     id: "6fQElZqvTULbOLZQwGHXO2" },
    { name: "Lord Whippet",  id: "4OzrxEtLvMS2aWTOjGylBq" },
    { name: "iLLER BOYS",    id: "12tbobwCUkZ7dAw99eA229" },
    { name: "Close Quarters",id: "4qhQLFoaOepWbxyHKl7WFk" }
  ];

  var KEY = "dc-player";
  var state = { i: 0, t: 0, playing: false };
  try {
    var saved = JSON.parse(sessionStorage.getItem(KEY) || "null");
    if (saved && typeof saved.i === "number" && TRACKS[saved.i]) state = saved;
  } catch (e) {}

  function save() {
    try {
      sessionStorage.setItem(KEY, JSON.stringify({ i: state.i, t: audio.currentTime || 0, playing: !audio.paused }));
    } catch (e) {}
  }

  function fmt(s) {
    if (!isFinite(s) || s < 0) s = 0;
    var m = Math.floor(s / 60), r = Math.floor(s % 60);
    return m + ":" + (r < 10 ? "0" : "") + r;
  }

  var bar = document.createElement("div");
  bar.className = "player";
  bar.innerHTML =
    '<div class="pl-panel" hidden>' +
      '<div class="pl-panel-head"><b class="pl-panel-title"></b>' +
      '<button type="button" class="pl-close" aria-label="Close">&times;</button></div>' +
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
        '<input class="pl-seek" type="range" min="0" max="1000" value="0" step="1" aria-label="Seek">' +
        '<span class="pl-time pl-dur">0:00</span>' +
      '</div>' +
      '<button class="pl-btn pl-list" type="button" aria-label="Tracks and releases" aria-expanded="false">' +
        '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="3" width="12" height="1.6"/><rect x="2" y="7.2" width="12" height="1.6"/><rect x="2" y="11.4" width="12" height="1.6"/></svg>' +
      '</button>' +
      '<div class="pl-menu" hidden>' +
        '<div class="pl-tabs">' +
          '<button type="button" class="pl-tab on" data-tab="here">On this site</button>' +
          '<button type="button" class="pl-tab" data-tab="spotify">Releases</button>' +
        '</div>' +
        '<ul class="pl-pane pl-pane-here"></ul>' +
        '<ul class="pl-pane pl-pane-spotify" hidden></ul>' +
      '</div>' +
    '</div>';

  var audio = new Audio();
  audio.preload = "metadata";

  var q = function (s) { return bar.querySelector(s); };
  var elPlay = q(".pl-play"), elNext = q(".pl-next"),
      elTitle = q(".pl-title"), elArtist = q(".pl-artist"),
      elSeek = q(".pl-seek"), elCur = q(".pl-cur"), elDur = q(".pl-dur"),
      elList = q(".pl-list"), elMenu = q(".pl-menu"),
      paneHere = q(".pl-pane-here"), paneSpot = q(".pl-pane-spotify"),
      panel = q(".pl-panel"), panelTitle = q(".pl-panel-title"), embed = q(".pl-embed");

  /* --- menu: tracks on this site --- */
  TRACKS.forEach(function (t, i) {
    if (t.album && i > 0) return; // the album is one entry; parts chain automatically
    var li = document.createElement("li");
    var label = t.album ? ALBUM : t.title;
    var sub = t.album ? "album · plays through" : t.artist;
    li.innerHTML = '<button type="button"><b>' + label + '</b><span>' + sub + '</span></button>';
    li.dataset.i = i;
    li.querySelector("button").addEventListener("click", function () { load(i, true); closeMenu(); });
    paneHere.appendChild(li);
  });

  /* --- menu: Spotify --- */
  RELEASES.forEach(function (r) {
    var li = document.createElement("li");
    li.innerHTML = '<button type="button"><b>' + r.name + '</b><span>Spotify</span></button>';
    li.querySelector("button").addEventListener("click", function () { openEmbed(r); });
    paneSpot.appendChild(li);
  });

  Array.prototype.forEach.call(bar.querySelectorAll(".pl-tab"), function (b) {
    b.addEventListener("click", function () {
      Array.prototype.forEach.call(bar.querySelectorAll(".pl-tab"), function (x) { x.classList.toggle("on", x === b); });
      paneHere.hidden = b.dataset.tab !== "here";
      paneSpot.hidden = b.dataset.tab !== "spotify";
    });
  });

  function openEmbed(r) {
    audio.pause();
    panelTitle.textContent = r.name;
    embed.innerHTML = '<iframe style="border-radius:8px" src="https://open.spotify.com/embed/artist/' + r.id +
      '?utm_source=generator" width="100%" height="152" frameborder="0" loading="lazy" ' +
      'allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe>';
    panel.hidden = false;
    closeMenu();
  }
  q(".pl-close").addEventListener("click", function () { panel.hidden = true; embed.innerHTML = ""; });

  function markMenu() {
    Array.prototype.forEach.call(paneHere.children, function (li) {
      var i = Number(li.dataset.i), t = TRACKS[state.i];
      li.classList.toggle("on", t && (t.album ? TRACKS[i].album : i === state.i));
    });
  }

  function load(i, play) {
    state.i = ((i % TRACKS.length) + TRACKS.length) % TRACKS.length;
    var t = TRACKS[state.i];
    audio.src = t.src;
    elTitle.textContent = t.title;
    elArtist.textContent = t.artist;
    elSeek.value = 0;
    elCur.textContent = "0:00";
    elDur.textContent = "0:00";
    markMenu();
    save();
    if (play) { panel.hidden = true; embed.innerHTML = ""; audio.play().catch(function () { setIcon(false); }); }
  }

  function setIcon(playing) {
    elPlay.setAttribute("aria-label", playing ? "Pause" : "Play");
    bar.classList.toggle("playing", playing);
  }

  elPlay.addEventListener("click", function () {
    if (audio.paused) { panel.hidden = true; embed.innerHTML = ""; audio.play().catch(function () {}); }
    else audio.pause();
  });
  elNext.addEventListener("click", function () { load(state.i + 1, true); });

  function closeMenu() { elMenu.hidden = true; elList.setAttribute("aria-expanded", "false"); }
  elList.addEventListener("click", function (e) {
    e.stopPropagation();
    var open = elMenu.hidden;
    elMenu.hidden = !open;
    elList.setAttribute("aria-expanded", String(open));
  });
  document.addEventListener("click", function (e) { if (!bar.contains(e.target)) closeMenu(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeMenu(); });

  var seeking = false;
  elSeek.addEventListener("input", function () { seeking = true; elCur.textContent = fmt(audio.duration * elSeek.value / 1000); });
  elSeek.addEventListener("change", function () {
    if (isFinite(audio.duration)) audio.currentTime = audio.duration * elSeek.value / 1000;
    seeking = false;
    save();
  });

  audio.addEventListener("loadedmetadata", function () {
    elDur.textContent = fmt(audio.duration);
    if (state.t > 0 && state.t < audio.duration) { audio.currentTime = state.t; state.t = 0; }
  });
  audio.addEventListener("timeupdate", function () {
    if (seeking || !isFinite(audio.duration)) return;
    elSeek.value = Math.round(audio.currentTime / audio.duration * 1000);
    elCur.textContent = fmt(audio.currentTime);
  });
  audio.addEventListener("play", function () { setIcon(true); save(); });
  audio.addEventListener("pause", function () { setIcon(false); save(); });

  audio.addEventListener("ended", function () {
    var next = state.i + 1;
    // an album part rolls into the next part, and the last part into "I Feel Like".
    // anything that is not part of the album stops at the end.
    if (TRACKS[state.i].album && TRACKS[next]) load(next, true);
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
      if (i === state.i) {
        if (audio.paused) { panel.hidden = true; audio.play().catch(function () {}); } else audio.pause();
        return;
      }
      load(i, true);
    }
  };

  function mount() {
    document.body.appendChild(bar);
    document.body.classList.add("has-player");
    load(state.i, false);
    if (state.playing) audio.play().catch(function () { setIcon(false); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})();
