"""What the dashboard can edit on the public website, and the rules for it.

Each COLLECTION is one content document. Its fields describe what editors
may change; everything else about the page (layout, animation, routing,
which items exist where the design depends on a fixed set) stays in code.
validate() is the single gate a document must pass before it can be
published; drafts may be saved with problems so work isn't lost.

Field types
  text, textarea          plain text (no HTML is ever rendered from these)
  paragraphs, strings     lists of plain text
  link                    an internal route ("/solutions#trading") or an https:// URL
  route                   an internal route only
  email, phone            contact details
  image, video            a URL from the media library (blank = keep the built-in one)
  select                  one of `options`
  bool, date
  list                    a list of items, each with its own `fields`
  group                   a fixed set of sub-fields
"""
import re
from typing import Any

# Public routes an internal link may point to (anchors after "#" are allowed).
ROUTES = [
    "/", "/about", "/leadership", "/solutions", "/how-we-trade", "/market", "/sustainability",
    "/case-studies", "/partners", "/media", "/news", "/events", "/contact", "/sitemap", "/cookies",
]
# Homepage in-page anchors used by the hero's buttons.
HOME_ANCHORS = ["#top", "#about", "#solutions", "#capability", "#grow", "#why", "#enquire", "#ecosystem"]

CASE_CATEGORIES = ["Renewable Route-to-Market", "Cross-border Trading", "Gas-fired Optimisation", "Banking & Swaps", "C&I Direct Supply", "Advisory"]
SECTORS = ["Independent Power Producer", "Utility", "Commercial & Industrial Consumer", "International Developer"]
LEADER_GROUPS = ["chairman", "board", "executive", "management"]
MEDIA_CATEGORIES = ["milestones", "leadership", "industry", "stakeholders", "sites", "team", "community"]
ECOSYSTEM_KEYS = ["generation", "infrastructure", "finance", "distribution", "customers", "collaboration"]
RELATIONSHIPS = ["strategic", "generation", "distribution", "finance", "customer", "technology", "stakeholder"]


# ── field helpers ─────────────────────────────────────────────────────────────
def f(type_: str, name: str, label: str, **opts) -> dict:
    return {"type": type_, "name": name, "label": label, **opts}


def text(name, label, max=120, **o): return f("text", name, label, max=max, **o)
def area(name, label, max=600, **o): return f("textarea", name, label, max=max, **o)
def paras(name, label, **o): return f("paragraphs", name, label, max=1200, **o)
def strings(name, label, max=200, **o): return f("strings", name, label, max=max, **o)
def link(name, label, **o): return f("link", name, label, **o)
def route(name, label, **o): return f("route", name, label, **o)
def image(name, label, **o): return f("image", name, label, **o)
def select(name, label, options, **o): return f("select", name, label, options=options, **o)
def flag(name, label, **o): return f("bool", name, label, **o)
def group(name, label, fields, **o): return f("group", name, label, fields=fields, **o)
def items(name, label, fields, **o): return f("list", name, label, fields=fields, **o)


def hero(intro_max=420):
    return group("hero", "Page hero", [
        text("title", "Headline", max=90, required=True),
        text("accent", "Highlighted words", max=40, help="Must appear exactly in the headline; shown in teal."),
        area("intro", "Introduction", max=intro_max),
        image("image", "Background photo", help="Leave empty to keep the approved photo."),
    ])


def section(name, label, intro=True):
    fields = [text("eyebrow", "Eyebrow", max=60), text("title", "Heading", max=90, required=True), text("accent", "Highlighted words", max=40)]
    if intro:
        fields.append(area("intro", "Introduction", max=400))
    return group(name, label, fields)


def next_link():
    return group("next", "“Next” panel at the foot of the page", [text("title", "Title", max=80, required=True), text("summary", "Summary", max=160)])


def used(*pairs):
    return [{"label": l, "path": p} for l, p in pairs]


HOME = ("Homepage", "/")

# ── collections ───────────────────────────────────────────────────────────────
COLLECTIONS: list[dict[str, Any]] = [
    # Company & contact ---------------------------------------------------------
    {
        "key": "site.company", "area": "Contact & company", "label": "Company & contact details", "protected": True,
        "description": "The phone number, email and office addresses shown across the site. Publishing needs a Super Admin.",
        "used_on": used(("Footer (every page)", "/"), ("Contact", "/contact"), ("About", "/about"), ("Every page's closing panel", "/about")),
        "fields": [
            text("name", "Registered company name", max=80, required=True),
            text("shortName", "Short name", max=40, required=True),
            f("phone", "phone", "Phone (as displayed)", required=True),
            f("phone", "phoneHref", "Phone (for dialling, digits only)", required=True, dial=True, help="e.g. +2347080582578"),
            f("email", "email", "Public email", required=True),
            items("offices", "Offices", [text("label", "Office name", max=60, required=True), strings("lines", "Address lines", max=90, min=1)], min=1, max=4, item_label="label"),
        ],
    },
    {
        "key": "site.navigation", "area": "Navigation & footer", "label": "Main menu", "protected": True,
        "description": "Section names, blurbs and links in the full-screen menu. Contact, About and Business solutions can't be removed. Publishing needs a Super Admin.",
        "used_on": used(("Menu (every page)", "/"), ("Search", "/"), ("Sitemap", "/sitemap")),
        "required_routes": ["/contact", "/about", "/solutions"],
        "fields": [
            items("sections", "Menu sections", [
                text("label", "Section name", max=40, required=True),
                text("blurb", "Blurb", max=160),
                items("items", "Links", [
                    text("label", "Link text", max=50, required=True),
                    link("to", "Destination", required=True),
                    flag("hidden", "Hide this link"),
                ], min=1, max=8, item_label="label"),
            ], fixed=7, item_label="label"),
        ],
    },
    {
        "key": "site.footer", "area": "Navigation & footer", "label": "Footer links", "protected": True,
        "description": "Link columns in the footer. The Contact link can't be removed. Publishing needs a Super Admin.",
        "used_on": used(("Footer (every page)", "/"),),
        "required_routes": ["/contact"],
        "fields": [
            items("companyLinks", "Company column", [text("label", "Text", max=40, required=True), route("href", "Page", required=True)], min=1, max=12, item_label="label"),
            items("resourceLinks", "Resources column", [text("label", "Text", max=50, required=True), link("href", "Destination", required=True)], max=10, item_label="label"),
        ],
    },
    # Homepage ------------------------------------------------------------------
    {
        "key": "home.hero", "area": "Homepage", "label": "Hero slides",
        "description": "The rotating slides at the top of the homepage. The 3D animation layer and its controls stay as designed.",
        "used_on": used(HOME),
        "fields": [items("slides", "Slides", [
            text("kicker", "Kicker", max=50),
            text("title", "Headline", max=70, required=True),
            area("body", "Text", max=240, required=True),
            group("cta", "Button", [text("label", "Button text", max=32, required=True), link("href", "Button destination", required=True)]),
            image("image", "Photo", help="Leave empty to keep the approved photo for this slide."),
        ], min=1, max=6, item_label="title")],
    },
    {
        "key": "home.panel", "area": "Homepage", "label": "Quick links & badges",
        "used_on": used(HOME),
        "fields": [
            items("quickLinks", "Quick links", [text("label", "Text", max=30, required=True), route("href", "Page", required=True)], min=2, max=8, item_label="label"),
            strings("badges", "Badges of honour", max=140, min=1, max_items=8),
            strings("credentials", "Credentials strip", max=60, min=3, max_items=10, help="Also scrolls across the About and Partners pages."),
        ],
    },
    {
        "key": "home.metrics", "area": "Homepage", "label": "Key figures",
        "description": "Only figures the company can stand behind.",
        "used_on": used(HOME, ("Our market", "/market")),
        "fields": [items("items", "Figures", [text("value", "Number", max=8, required=True, pattern=r"^\d+(\.\d+)?$", pattern_hint="digits only"), text("unit", "Unit", max=6), text("label", "Label", max=70, required=True)], min=4, max=4, fixed=4, item_label="label")],
    },
    {
        "key": "home.about", "area": "About & leadership", "label": "About Onction",
        "used_on": used(("Homepage — About tabs", "/"), ("About", "/about")),
        "fields": [
            text("eyebrow", "Eyebrow", max=40), text("heading", "Heading", max=90, required=True),
            items("tabs", "Chapters", [text("tab", "Tab label", max=40, required=True), text("title", "Title", max=90, required=True), paras("body", "Paragraphs", min=1)], fixed=4, item_label="tab"),
            items("strengths", "Commercial strengths", [text("title", "Title", max=40, required=True), area("body", "Text", max=160, required=True)], fixed=3, item_label="title"),
        ],
    },
    {
        "key": "home.solutions", "area": "Services & solutions", "label": "Business solutions",
        "description": "Each solution keeps its web address (other pages link to it), so solutions can be reworded but not added or removed here.",
        "used_on": used(HOME, ("Business solutions", "/solutions"), ("Footer", "/"), ("Case studies", "/case-studies"), ("Search", "/")),
        "fields": [
            text("eyebrow", "Eyebrow", max=40), text("heading", "Heading", max=90, required=True), area("intro", "Introduction", max=300),
            items("items", "Solutions", [text("title", "Name", max=50, required=True), area("body", "Description", max=200, required=True), image("image", "Photo")], fixed=9, item_label="title"),
        ],
    },
    {
        "key": "home.capability", "area": "Services & solutions", "label": "Trading capability",
        "used_on": used(HOME, ("How we trade", "/how-we-trade")),
        "fields": [text("eyebrow", "Eyebrow", max=50), text("heading", "Heading", max=80, required=True), area("body", "Text", max=300),
                   strings("items", "Arrangements", max=90, min=5, max_items=5, help="Each links to a solution on How we trade; keep the order.")],
    },
    {
        "key": "home.grow", "area": "Homepage", "label": "GR0W with Onction",
        "used_on": used(HOME, ("Sustainability", "/sustainability")),
        "fields": [text("eyebrow", "Eyebrow", max=40), text("heading", "Heading", max=80, required=True), area("intro", "Introduction", max=300),
                   items("pillars", "Pillars", [text("title", "Title", max=40, required=True), area("body", "Text", max=180, required=True)], fixed=4, item_label="title")],
    },
    {
        "key": "home.highlights", "area": "Homepage", "label": "Why Onction",
        "used_on": used(HOME, ("About", "/about"), ("How we trade", "/how-we-trade")),
        "fields": [text("eyebrow", "Eyebrow", max=40), text("heading", "Heading", max=80, required=True),
                   items("items", "Highlights", [text("title", "Title", max=50, required=True), area("body", "Text", max=180, required=True)], fixed=6, item_label="title")],
    },
    {
        "key": "home.sdg", "area": "Homepage", "label": "SDG 7 commitment",
        "used_on": used(HOME, ("Sustainability", "/sustainability")),
        "fields": [text("eyebrow", "Eyebrow", max=30), text("heading", "Heading", max=80, required=True), area("body", "Text", max=400), strings("goals", "Goals", max=200, min=1, max_items=6)],
    },
    {
        "key": "home.ecosystem", "area": "Homepage", "label": "Energy ecosystem story",
        "description": "Words around the animated West Africa map. The map itself is illustrative and stays in code.",
        "used_on": used(HOME),
        "fields": [text("eyebrow", "Eyebrow", max=40), text("heading", "Heading", max=80, required=True), text("accent", "Highlighted words", max=40), area("body", "Text", max=500),
                   items("steps", "Story steps", [text("title", "Title", max=30, required=True), area("body", "Text", max=120, required=True)], fixed=5, item_label="title"),
                   text("note", "Footnote", max=200)],
    },
    {
        "key": "home.caseStudies", "area": "Services & solutions", "label": "Case studies",
        "description": "Only publish transactions the company can describe publicly.",
        "used_on": used(HOME, ("Case studies", "/case-studies"), ("Business solutions", "/solutions"), ("Our market", "/market")),
        "fields": [items("items", "Case studies", [
            f("slug", "slug", "Web address", help="Set automatically from the first title; kept when the title changes so links don't break."),
            select("category", "Category", CASE_CATEGORIES, required=True),
            text("title", "Title", max=110, required=True),
            area("body", "Summary", max=400, required=True),
            group("result", "Headline result (optional)", [text("prefix", "Before the number", max=3), f("number", "value", "Number"), text("suffix", "After the number", max=10), text("label", "Caption", max=60)]),
        ], min=1, max=24, item_label="title")],
    },
    {
        "key": "home.testimonials", "area": "Partners & ecosystem", "label": "Testimonials",
        "description": "Quotes must be approved by the person quoted.",
        "used_on": used(HOME, ("Partners", "/partners")),
        "fields": [items("items", "Testimonials", [
            area("quote", "Quote", max=400, required=True), text("name", "Name or role", max=60, required=True),
            text("company", "Organisation", max=80, required=True), select("sector", "Sector", SECTORS, required=True),
        ], min=1, max=12, item_label="company")],
    },
    # Inner pages ---------------------------------------------------------------
    {"key": "page.about", "area": "About & leadership", "label": "About page", "used_on": used(("About", "/about")),
     "fields": [hero(), next_link()]},
    {"key": "page.leadership", "area": "About & leadership", "label": "Leadership page", "used_on": used(("Leadership & Board", "/leadership")),
     "fields": [hero(), items("groups", "Group introductions", [text("label", "Short label", max=30, required=True), text("title", "Heading", max=60, required=True), area("intro", "Introduction", max=240)], fixed=4, item_label="title"), next_link()]},
    {"key": "page.solutions", "area": "Services & solutions", "label": "Business solutions page", "used_on": used(("Business solutions", "/solutions"), ("Menu", "/")),
     "fields": [hero(), items("groups", "Solution groups", [text("title", "Name", max=50, required=True), area("lede", "Introduction", max=240)], fixed=3, item_label="title"), next_link()]},
    {"key": "page.how-we-trade", "area": "Services & solutions", "label": "How we trade page", "used_on": used(("How we trade", "/how-we-trade")),
     "fields": [hero(), items("steps", "Journey of a megawatt", [text("title", "Title", max=60, required=True), area("body", "Text", max=400, required=True)], fixed=5, item_label="title"),
                section("ways", "Arrangements section"), section("desk", "24/7 desk section"), next_link()]},
    {"key": "page.market", "area": "Pages", "label": "Our market page", "used_on": used(("Our market", "/market")),
     "fields": [hero(), section("network", "Network map section"), section("corridors", "Cross-border section", intro=False),
                items("reasons", "Why power should cross borders", [text("title", "Title", max=50, required=True), area("body", "Text", max=200, required=True)], fixed=3, item_label="title"),
                section("participants", "Participants section"),
                items("participantList", "Participants", [text("title", "Title", max=50, required=True), area("body", "Text", max=200, required=True)], fixed=5, item_label="title"), next_link()]},
    {"key": "page.sustainability", "area": "Pages", "label": "Sustainability page", "used_on": used(("Sustainability", "/sustainability")),
     "fields": [hero(), text("pillarsIntro", "Line under the GR0W heading", max=120), section("path", "Path to 2030 section", intro=False),
                items("pathSteps", "Path to 2030", [text("when", "When", max=20, required=True), text("title", "Title", max=60, required=True), area("body", "Text", max=200, required=True)], fixed=3, item_label="title"),
                text("goalsLead", "Line above the SDG goals", max=60), next_link()]},
    {"key": "page.case-studies", "area": "Services & solutions", "label": "Case studies page", "used_on": used(("Case studies", "/case-studies")), "fields": [hero(), next_link()]},
    {"key": "page.partners", "area": "Partners & ecosystem", "label": "Partners page", "used_on": used(("Partners", "/partners")),
     "fields": [hero(), section("ecosystem", "Ecosystem section"), section("directory", "Directory section"), section("who", "Who we work with section", intro=False),
                items("segments", "Kinds of partner", [text("title", "Title", max=50, required=True), area("offer", "What we offer", max=240, required=True)], fixed=4, item_label="title"),
                group("workWith", "Closing invitation", [text("eyebrow", "Eyebrow", max=30), text("title", "Heading", max=80, required=True), text("accent", "Highlighted words", max=40), area("intro", "Text", max=400), text("cta", "Button text", max=30, required=True)]),
                next_link()]},
    {"key": "page.contact", "area": "Contact & company", "label": "Contact page", "used_on": used(("Contact", "/contact")),
     "fields": [hero(), items("routes", "Ways to reach us", [text("title", "Title", max=50, required=True), area("body", "Text", max=200, required=True), text("cta", "Link text", max=40, help="The phone card always shows the phone number.")], fixed=3, item_label="title"), section("offices", "Offices section", intro=False)]},
    {"key": "page.media", "area": "Media & gallery", "label": "Media page", "used_on": used(("Media & gallery", "/media")),
     "fields": [group("hero", "Page hero", [text("title", "Headline", max=60, required=True), text("accent", "Highlighted words", max=30), area("intro", "Introduction", max=300)]), next_link()]},
    {"key": "page.news", "area": "Media & gallery", "label": "News page header", "used_on": used(("Market news", "/news")), "fields": [hero()]},
    {"key": "page.events", "area": "Media & gallery", "label": "Events page header", "used_on": used(("Events", "/events")), "fields": [hero()]},
    # Leadership, media, partners ----------------------------------------------
    {
        "key": "leadership.people", "area": "About & leadership", "label": "Leadership profiles",
        "description": "Turn on “Verified — show on website” only for approved names, titles, biographies and portraits.",
        "used_on": used(("Leadership & Board", "/leadership"),),
        "fields": [items("items", "People", [
            f("slug", "id", "Profile address", help="Used in shareable links (/leadership#…)."),
            select("group", "Group", LEADER_GROUPS, required=True),
            text("name", "Full name", max=80, required_if_verified=True),
            text("title", "Official title", max=120, required=True),
            text("function", "Department (senior management)", max=60),
            image("portrait", "Portrait (4:5)", required_if_verified=True),
            text("focus", "Portrait focus", max=20, help="CSS position, e.g. 50% 25%"),
            area("summary", "One-line summary", max=200),
            paras("bio", "Biography"),
            strings("experience", "Experience highlights", max=140, max_items=8),
            flag("verified", "Verified — show on website"),
        ], max=40, item_label="name")],
    },
    {
        "key": "media.library", "area": "Media & gallery", "label": "Stories, milestones & gallery",
        "description": "Only real Onction photographs and films with approved captions. Unverified items stay hidden.",
        "used_on": used(("Media & gallery", "/media"),),
        "fields": [
            items("stories", "Featured stories", [
                f("slug", "id", "ID"), text("title", "Headline", max=110, required=True), area("dek", "Summary", max=300),
                f("date", "date", "Date"), select("category", "Category", MEDIA_CATEGORIES), image("image", "Photo", required_if_verified=True),
                text("alt", "Photo description (for screen readers)", max=160, required_if_verified=True), route("to", "Link to a page (optional)"),
                flag("verified", "Verified — show on website"),
            ], max=12, item_label="title"),
            items("milestones", "Milestones", [f("slug", "id", "ID"), text("year", "Year", max=10, required=True), text("title", "Title", max=80, required=True), area("body", "Text", max=240), flag("verified", "Verified — show on website")], max=30, item_label="title"),
            items("gallery", "Gallery", [
                f("slug", "id", "ID"), select("type", "Type", ["photo", "video"], required=True),
                image("src", "Photo (or video poster)", required_if_verified=True), f("video", "video", "Video file (MP4)"), text("youtube", "…or YouTube video ID", max=20, pattern=r"^[A-Za-z0-9_-]{6,20}$", pattern_hint="the ID only, e.g. dQw4w9WgXcQ"),
                text("title", "Title", max=100, required=True), area("caption", "Caption", max=300), f("date", "date", "Date"),
                select("category", "Category", MEDIA_CATEGORIES, required=True), select("shape", "Tile shape", ["normal", "wide", "tall"]),
                text("alt", "Photo description (for screen readers)", max=160, required_if_verified=True), text("duration", "Video length", max=8),
                flag("verified", "Verified — show on website"),
            ], max=200, item_label="title"),
        ],
    },
    {
        "key": "partners.organisations", "area": "Partners & ecosystem", "label": "Partner directory",
        "description": "Name an organisation only with its permission, under the relationship it actually has. No contract terms.",
        "used_on": used(("Partners", "/partners"),),
        "fields": [items("items", "Organisations", [
            f("slug", "id", "ID"), text("name", "Organisation name", max=80, required_if_verified=True), image("logo", "Logo", help="SVG or transparent PNG"),
            select("ecosystem", "Market role", ECOSYSTEM_KEYS, required=True), select("relationship", "Relationship", RELATIONSHIPS, required=True),
            area("description", "Relationship (approved by both sides)", max=240, required_if_verified=True), link("url", "Official website"),
            flag("highlight", "Feature this relationship"), flag("verified", "Verified — show on website"),
        ], max=120, item_label="name")],
    },
    {
        "key": "partners.ecosystem", "area": "Partners & ecosystem", "label": "Ecosystem map text",
        "description": "The six market roles on the partners map are fixed; their wording is editable.",
        "used_on": used(("Partners", "/partners"),),
        "fields": [items("items", "Market roles", [text("label", "Name", max=40, required=True), area("role", "What this role does", max=220, required=True), area("onction", "How Onction works with it", max=220, required=True)], fixed=6, item_label="label")],
    },
]

BY_KEY = {c["key"]: c for c in COLLECTIONS}

# ── what stays in code, and why (shown in the coverage report) ───────────────
CODE_MANAGED = [
    {"page": "All pages", "area": "Layout, animation, 3D scenes, colours and typography", "reason": "Design-critical: editing them could break the approved design or performance."},
    {"page": "Homepage", "area": "West Africa map geography, nodes and 3D models", "reason": "Illustrative geometry tied to the animation; not routine content."},
    {"page": "Our market", "area": "WAPP map countries and corridors", "reason": "Geographic data drawn into the map's coordinates."},
    {"page": "How we trade", "area": "Energy landscape illustration", "reason": "Line artwork; its stages follow the five editable steps."},
    {"page": "Partners", "area": "Ecosystem map positions and flows", "reason": "Structural: the six roles and how energy moves between them."},
    {"page": "Case studies / Solutions", "area": "Which solution each case-study category links to", "reason": "Structural mapping between pages."},
    {"page": "Cookies & storage", "area": "List of stored items", "reason": "Must match what the code actually stores; changes with the code."},
    {"page": "Sitemap / Search", "area": "Generated lists", "reason": "Built automatically from the menu and pages."},
    {"page": "All pages", "area": "Page addresses (URLs) and the routes themselves", "reason": "Changing them breaks links and search results."},
]
EXISTING_ADMIN = [
    {"page": "Market news", "area": "News articles", "where": "/admin/news"},
    {"page": "Events", "area": "Events and registrations", "where": "/admin/events"},
    {"page": "Newsletter", "area": "Subscribers and campaigns", "where": "/admin/newsletter"},
    {"page": "Custom pages", "area": "Extra pages built from blocks (e.g. campaign pages)", "where": "/admin/pages"},
    {"page": "Media library", "area": "Uploaded images and videos", "where": "/admin/media"},
]


# ── validation ────────────────────────────────────────────────────────────────
EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
DIAL = re.compile(r"^\+?\d{7,15}$")
TAGS = re.compile(r"<\s*/?\s*[a-zA-Z][^>]*>")


def _route_ok(value: str, home_anchors=True) -> bool:
    path = value.split("#", 1)[0].split("?", 1)[0]
    if value.startswith("#"):
        return home_anchors and value in HOME_ANCHORS
    return path in ROUTES


# Links the site resolves itself (the vendor portal lives on its own subdomain).
SPECIAL_LINKS = ["vendor-portal"]


def _link_ok(value: str) -> bool:
    return value in SPECIAL_LINKS or value.startswith("https://") or value.startswith("mailto:") or value.startswith("tel:") or _route_ok(value)


def _check_value(field: dict, value: Any, path: str, verified: bool, out: list):
    t = field["type"]
    req = field.get("required") or (verified and field.get("required_if_verified"))
    empty = value is None or value == "" or value == [] or value == {}
    if empty:
        if req:
            out.append({"path": path, "level": "error", "message": f"{field['label']} is required" + (" before it can be shown on the website" if field.get("required_if_verified") else "")})
        if t not in ("group", "list"):
            return
    if t in ("text", "textarea", "phone", "email", "link", "route", "image", "video", "slug", "date"):
        if not isinstance(value, str):
            out.append({"path": path, "level": "error", "message": f"{field['label']} must be text"})
            return
        if TAGS.search(value):
            out.append({"path": path, "level": "error", "message": f"{field['label']} can't contain HTML"})
        if field.get("max") and len(value) > field["max"]:
            out.append({"path": path, "level": "error", "message": f"{field['label']} is {len(value)} characters; the limit is {field['max']}"})
        if field.get("pattern") and value and not re.match(field["pattern"], value):
            out.append({"path": path, "level": "error", "message": f"{field['label']}: use {field.get('pattern_hint', 'the expected format')}"})
        if t == "email" and not EMAIL.match(value):
            out.append({"path": path, "level": "error", "message": "Enter a valid email address"})
        if t == "phone" and field.get("dial") and not DIAL.match(value):
            out.append({"path": path, "level": "error", "message": "Digits only, optionally starting with +"})
        if t == "link" and not _link_ok(value):
            out.append({"path": path, "level": "error", "message": f"“{value}” isn't a page on this site or an https:// address"})
        if t == "route" and not _route_ok(value, home_anchors=False):
            out.append({"path": path, "level": "error", "message": f"“{value}” isn't a page on this site"})
        if t in ("image", "video") and not (value.startswith("https://") or value.startswith("/")):
            out.append({"path": path, "level": "error", "message": "Choose a file from the media library"})
        if t == "date" and not re.match(r"^\d{4}-\d{2}-\d{2}$", value):
            out.append({"path": path, "level": "error", "message": "Use a date like 2026-03-14"})
        if t == "slug" and not re.match(r"^[a-z0-9]+(-[a-z0-9]+)*$", value):
            out.append({"path": path, "level": "error", "message": "Lower-case letters, numbers and hyphens only"})
    elif t == "number":
        if not isinstance(value, (int, float)):
            out.append({"path": path, "level": "error", "message": f"{field['label']} must be a number"})
    elif t == "bool":
        if not isinstance(value, bool):
            out.append({"path": path, "level": "error", "message": f"{field['label']} must be on or off"})
    elif t == "select":
        if value not in field["options"]:
            out.append({"path": path, "level": "error", "message": f"{field['label']}: choose one of the listed options"})
    elif t in ("paragraphs", "strings"):
        if not isinstance(value, list) or not all(isinstance(v, str) for v in value):
            out.append({"path": path, "level": "error", "message": f"{field['label']} must be a list of text"})
            return
        if len(value) < field.get("min", 0):
            out.append({"path": path, "level": "error", "message": f"{field['label']} needs at least {field['min']}"})
        if field.get("max_items") and len(value) > field["max_items"]:
            out.append({"path": path, "level": "error", "message": f"{field['label']} allows at most {field['max_items']}"})
        for i, v in enumerate(value):
            if not v.strip():
                out.append({"path": f"{path}.{i}", "level": "error", "message": "Remove empty lines"})
            elif len(v) > field["max"]:
                out.append({"path": f"{path}.{i}", "level": "error", "message": f"Line {i + 1} is {len(v)} characters; the limit is {field['max']}"})
            elif TAGS.search(v):
                out.append({"path": f"{path}.{i}", "level": "error", "message": "Text can't contain HTML"})
    elif t == "group":
        if not isinstance(value, dict):
            value = {}
        _check_fields(field["fields"], value, path, verified, out)
    elif t == "list":
        if not isinstance(value, list):
            out.append({"path": path, "level": "error", "message": f"{field['label']} must be a list"})
            return
        if len(value) < field.get("min", 0):
            out.append({"path": path, "level": "error", "message": f"{field['label']}: at least {field['min']} needed"})
        if field.get("max") and len(value) > field["max"]:
            out.append({"path": path, "level": "error", "message": f"{field['label']}: at most {field['max']} allowed"})
        ids = [it.get("id") or it.get("slug") for it in value if isinstance(it, dict)]
        if len([i for i in ids if i]) != len(set(i for i in ids if i)):
            out.append({"path": path, "level": "error", "message": f"{field['label']}: two items share the same address/ID"})
        for i, it in enumerate(value):
            if not isinstance(it, dict):
                out.append({"path": f"{path}.{i}", "level": "error", "message": "Invalid item"})
                continue
            _check_fields(field["fields"], it, f"{path}.{i}", bool(it.get("verified")), out)


def _check_fields(fields: list, data: dict, base: str, verified: bool, out: list):
    for field in fields:
        p = f"{base}.{field['name']}" if base else field["name"]
        _check_value(field, data.get(field["name"]), p, verified, out)


def validate(key: str, data: dict) -> list[dict]:
    """Problems that block publishing (level "error") or deserve a look ("warning")."""
    coll = BY_KEY[key]
    out: list[dict] = []
    if not isinstance(data, dict):
        return [{"path": "", "level": "error", "message": "Content must be an object"}]
    _check_fields(coll["fields"], data, "", False, out)

    # Fixed lists: the design depends on exactly this many items, in this order.
    for field in coll["fields"]:
        if field["type"] == "list" and field.get("fixed"):
            got = data.get(field["name"])
            if isinstance(got, list) and len(got) != field["fixed"]:
                out.append({"path": field["name"], "level": "error", "message": f"{field['label']} must keep exactly {field['fixed']} items"})

    # Hero accents must actually occur in their headline.
    for field in coll["fields"]:
        if field["type"] == "group" and {"title", "accent"} <= {x["name"] for x in field["fields"]}:
            g = data.get(field["name"]) or {}
            if g.get("accent") and g.get("title") and g["accent"] not in g["title"]:
                out.append({"path": f"{field['name']}.accent", "level": "error", "message": "Highlighted words must appear exactly in the heading"})

    # Navigation can't lose the routes the site depends on.
    for req in coll.get("required_routes", []):
        links = []
        if key == "site.navigation":
            for s in data.get("sections", []):
                links += [i.get("to", "") for i in s.get("items", []) if not i.get("hidden")]
        elif key == "site.footer":
            links = [l.get("href", "") for l in data.get("companyLinks", [])]
        if not any(l.split("#")[0] == req for l in links):
            out.append({"path": "", "level": "error", "message": f"The link to {req} can't be removed or hidden — visitors rely on it"})

    # Gentle checks that don't block publishing.
    if key == "leadership.people":
        for i, p in enumerate(data.get("items", [])):
            if p.get("verified") and not p.get("bio"):
                out.append({"path": f"items.{i}.bio", "level": "warning", "message": f"{p.get('name') or 'This profile'} has no biography yet"})
        names = [p.get("name", "").strip().lower() for p in data.get("items", []) if p.get("verified") and p.get("name")]
        for n in {n for n in names if names.count(n) > 1}:
            out.append({"path": "items", "level": "warning", "message": f"“{n.title()}” is listed more than once — if one person holds two roles (e.g. MD and CEO), use one profile with the combined title"})
    if key == "partners.organisations":
        for i, o in enumerate(data.get("items", [])):
            if o.get("verified") and not o.get("logo"):
                out.append({"path": f"items.{i}.logo", "level": "warning", "message": f"{o.get('name') or 'This organisation'} has no logo; its name will show instead"})
    return out


def public_schema() -> dict:
    return {"collections": COLLECTIONS, "routes": ROUTES, "home_anchors": HOME_ANCHORS, "code_managed": CODE_MANAGED, "existing_admin": EXISTING_ADMIN}
