// Landing page for https://dylancantor.com/euler/w#<payload>.
// Decodes the walk locally (walklink.js, generated from the app's codec) and
// offers the custom-scheme fallback. All text is set via textContent.
(function () {
  // Replace with the real App Store URL once the app is live.
  var APP_STORE_URL = "";   // e.g. "https://apps.apple.com/app/id0000000000"
  var COLORS = ["#5EEAD4", "#F0ABFC", "#FDE68A", "#93C5FD", "#FCA5A5", "#A7F3D0", "#C4B5FD", "#FDBA74",
    "#86EFAC", "#F9A8D4", "#67E8F9", "#FCD34D", "#BEF264", "#E9D5FF", "#FDA4AF", "#99F6E4"];
  var $ = function (id) { return document.getElementById(id); };
  var payload = (location.hash || "").slice(1);

  if (APP_STORE_URL) $("store").href = APP_STORE_URL;
  $("open").href = "euler://w#" + payload;

  var w;
  try {
    w = window.EulerWalkLink.decode(payload);
  } catch (e) {
    $("name").textContent = payload ? "This link looks damaged" : "Euler walk links";
    $("error").textContent = payload
      ? "It may have been cut off when it was copied. Ask for the link again."
      : "Shared walks open here. This link doesn't contain one.";
    $("error").classList.remove("hidden");
    $("open").classList.add("hidden");
    return;
  }
  $("name").textContent = w.name || "Untitled walk";
  document.title = (w.name || "A walk") + " · Euler";
  $("meta").textContent = w.stops.length + " stops · " + Math.round(window.EulerWalkLink.lengthM(w)) + " m" + (w.loop ? " · loop" : "");
  if (w.anchor) $("place").classList.remove("hidden");

  var seen = {};
  w.stops.forEach(function (s) {
    if (seen[s.style]) return;
    seen[s.style] = 1;
    var c = document.createElement("span");
    c.className = "chip";
    // dylancantor.com: the style colour goes on a dot (::before) rather than the border,
    // so the pastel palette stays legible on the site's light background.
    c.style.setProperty("--c", COLORS[s.style % COLORS.length]);
    c.textContent = window.EulerWalkLink.styleLabel(s.style);
    $("chips").appendChild(c);
  });

  // shape sketch
  var NS = "http://www.w3.org/2000/svg", svg = $("shape"), size = 220, pad = 16;
  var xs = w.stops.map(function (p) { return p.x; }), ys = w.stops.map(function (p) { return p.y; });
  var minX = Math.min.apply(null, xs), maxX = Math.max.apply(null, xs);
  var minY = Math.min.apply(null, ys), maxY = Math.max.apply(null, ys);
  var span = Math.max(maxX - minX, maxY - minY, 1), k = (size - 2 * pad) / span;
  var ox = (size - 2 * pad - (maxX - minX) * k) / 2, oy = (size - 2 * pad - (maxY - minY) * k) / 2;
  var P = function (s) { return [pad + ox + (s.x - minX) * k, pad + oy + (maxY - s.y) * k]; };
  var order = w.stops.slice();
  if (w.loop && w.stops.length > 2) order.push(w.stops[0]);
  var line = document.createElementNS(NS, "polyline");
  line.setAttribute("points", order.map(function (s) { return P(s).join(","); }).join(" "));
  line.setAttribute("fill", "none");
  line.setAttribute("stroke", "currentColor");
  line.setAttribute("stroke-width", "3");
  line.setAttribute("stroke-linejoin", "round");
  svg.appendChild(line);
  w.stops.forEach(function (s) {
    var c = document.createElementNS(NS, "circle"), p = P(s);
    c.setAttribute("cx", p[0]); c.setAttribute("cy", p[1]); c.setAttribute("r", "7");
    c.setAttribute("fill", COLORS[s.style % COLORS.length]);
    c.setAttribute("stroke", "currentColor"); c.setAttribute("stroke-width", "2");
    svg.appendChild(c);
  });
})();
