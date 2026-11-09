#!/usr/bin/env python3
"""Write live Clubs numbers into the site.

Usage: python3 tools/update-clubs-stats.py stats.json
where stats.json is the output of the Clubs admin `clubs_stats` query (the Clubs Outreach
MCP tool / admin dashboard query). Public project counts there already exclude the seeded
school import. The numbers go into:
  - clubs.html   the four stat tiles
  - index.html   "N users." on the Clubs entry in Selected work
  - llms.txt     the Clubs line
and the raw stats are kept in data/clubs-stats.json with their timestamp.
"""
import json, re, sys, pathlib

root = pathlib.Path(__file__).resolve().parent.parent
s = json.load(open(sys.argv[1]))
users = s["users"]["total"]
joined30 = s["users"]["signups_30d"]
projects = s["projects"]["public_active"]
creators = s["projects"]["distinct_creators"]
schools = s["users"]["schools_total"]
f = lambda n: f"{n:,}"

def edit(name, subs):
    p = root / name
    t = p.read_text()
    for pat, rep in subs:
        t, n = re.subn(pat, rep, t)
        if n != 1:
            sys.exit(f"{name}: expected 1 match for {pat!r}, got {n}")
    p.write_text(t)

edit("clubs.html", [
    (r'data-clubs="users">[\d,]+<', f'data-clubs="users">{f(users)}<'),
    (r'data-clubs="joined_30d">[\d,]+<', f'data-clubs="joined_30d">{f(joined30)}<'),
    (r'data-clubs="public_projects">[\d,]+<', f'data-clubs="public_projects">{f(projects)}<'),
    (r'data-clubs="creators">[\d,]+<', f'data-clubs="creators">{f(creators)}<'),
    (r'data-clubs="schools">[\d,]+<', f'data-clubs="schools">{schools}<'),
])
edit("index.html", [
    (r'data-clubs="users">[\d,]+<', f'data-clubs="users">{f(users)}<'),
])
edit("llms.txt", [
    (r'[\d,]+ people, [\d,]+ live projects, [\d,]+ creators across [\d,]+ schools',
     f'{f(users)} people, {f(projects)} live projects, {f(creators)} creators across {schools} schools'),
])
(root / "data").mkdir(exist_ok=True)
json.dump(s, open(root / "data" / "clubs-stats.json", "w"), indent=1)
print(f"users {users} · joined30 {joined30} · projects {projects} · creators {creators} · schools {schools}"
      f" · generated {s.get('generated_at')}")
