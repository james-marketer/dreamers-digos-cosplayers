// Paste your deployed Google Apps Script Web App URL here (see README.md).
// While this is empty the site runs in demo mode and nothing is saved.
window.DREAMERS_CONFIG = {
  SCRIPT_URL: "https://script.google.com/macros/s/AKfycbx_rmxQPiUuz7X-fYc6_o5XLl0Jgw9yUUhLA9cjpT49xC9p4Ug6s0XHryGbZVrOXdR0WQ/exec",
  // Optional: shown under the Partner / Volunteer buttons and used by them.
  FACEBOOK_URL: "https://www.facebook.com/yumesanctuarydigos",
  // Dreamers listed on the roster by hand. They always show first, before sheet-approved members.
  // Add one line per person: name, photo (put the file in the "featured" folder).
  // Optional extras: character, details, facebook, photos: ["a.jpg","b.jpg"]
  MEMBERS: [
    { name: "Neko Hime", photo: "featured/dreamer-6.jpg" },
    { name: "J.E.M.", photo: "featured/dreamer-9.jpg" }
  ],
  // Profile avatars for sheet members: which photo should come first.
  // A number = move that photo (1 = first, 2 = second...) to the front. A file path = show that picture first.
  AVATARS: {
    "Jett": 4,
    "Cheezy kei": 2,
    "Redfyrr": 3,
    "Salome Mayo": "featured/dreamer-10.jpg",
    "Yuichikaii": "featured/dreamer-11.jpg"
  },
  // Points ranking (leaderboard + top-7 carousel). Set RANKING_ACTIVE to false to switch it off.
  RANKING_ACTIVE: true,
  // Dry run: while the sheet has no points, show sample points (labelled "Preview"). Set false to use real points only.
  RANKING_DEMO: true,
  EMAIL: ""           // e.g. "hello@example.com"
};
