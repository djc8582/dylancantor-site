/* Live Clubs numbers.
   Elements marked data-clubs="users|joined_30d|public_projects|creators|schools" ship with
   the last saved numbers (so crawlers and no-JS visitors see real figures); on load they're
   replaced with live counts from the Clubs public-stats endpoint, which reads the same query
   as the Clubs admin dashboard. If the endpoint is slow or down, the saved numbers stay. */
(function () {
  var URL = "https://nqcwbvjwqrgfnjdtyixe.supabase.co/functions/v1/public-stats";
  var els = document.querySelectorAll("[data-clubs]");
  if (!els.length || !window.fetch) return;
  var ctrl = window.AbortController ? new AbortController() : null;
  var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 4000);
  fetch(URL, { signal: ctrl ? ctrl.signal : undefined, mode: "cors" })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (s) {
      clearTimeout(timer);
      if (!s || typeof s.users !== "number") return;
      Array.prototype.forEach.call(els, function (el) {
        var v = s[el.getAttribute("data-clubs")];
        if (typeof v === "number" && v > 0) el.textContent = v.toLocaleString("en-US");
      });
    })
    .catch(function () { clearTimeout(timer); });
})();
