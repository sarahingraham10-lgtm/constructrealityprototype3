# ConstructReality Studio

A VR app for the Meta Quest 3. A client rents the headset and designs their own house with guided prompts and an AI helper. The software then creates the 2D plan package an architect needs: floor plan, plumbing, electrical, lighting, and a schedule of fixtures, plus a CAD file.

Black and white, with the ConstructReality logo, "Experience it. Understand it. Build with confidence." and "Built in the Caribbean, for Caribbeans".

> **Status:** a working first version. It was tested in a desktop browser. It has **not** been tested on a physical Quest 3, so expect to adjust controller feel, panel position and performance on real hardware. See "Known limits" at the end.

---

## 1. How it works

```
Quest 3 (Quest Browser or Wolvic, locked to one web address)
   |  WebXR app: public/app.js  (the screens the client sees, the 3D model, the guide prompts)
   v
Your server (Node.js):
   /api/analyze      turns rooms into walls, doors, windows, fixtures, plumbing, electrical, lighting
   /api/ai/*         the AI helper (your API key stays on the server)
   /api/projects     saves a finished design and writes the architect package
   /admin.html       staff console: client names, messages to the headset, downloads
```

Why WebXR (a web app in the headset) and not an installed app? You update it by changing the server, with nothing to reinstall on each headset, and you can test it on any computer. The cost is that "locking" the headset has to be done by device management software (section 4).

### What the client does (v2: a fully finished home)
1. **Welcome**, then **Plot and family**: plot size, bedrooms, bathrooms, **number of floors (1 to 3)**, and extras (dining, laundry, office, garage).
2. **AI draft** (or start from scratch). Several floors put living areas downstairs and bedrooms upstairs, with the staircase in the same place on every floor.
3. **Shape rooms** on each floor: move, resize, add or remove rooms, add or remove a floor. Live checks warn about overlaps, rooms with no door, rooms that are too small.
4. **Services**: plumbing, electrical and lighting layers, placed automatically for each floor.
5. **Inside finishes**: floors and inside walls per room (or all rooms), ceilings and counters. About 40 materials (oak, herringbone, tile, concrete, marble, brick, wallpaper and more), then a colour.
6. **Outside**: outside walls, roof (gable, hip, flat, sloping, tiles, metal or shingle, optional solar panels), front, inside and garage doors, windows (style, frames, glass, shutters, security bars), fence and gate, lawn, driveway and path, garden style, veranda, garden lights, mailbox and water tank. A cutaway and a roof switch show inside.
7. **Furniture and decor**: every room is furnished automatically (sofas, beds, wardrobes, kitchen cabinets, rugs, curtains, lamps, plants, wall art, ceiling fans and more, about 90 items). The client can pick any item (by tapping it in the model), move it, turn it, copy it, remove it, restyle its materials and colours (one item or all of that type), add more, or redo a floor.
8. **Walk through** the finished home at full size, inside and out. Floor buttons jump between floors and a street view shows the house from the road (left stick walk, right stick turn, X or A shows or hides the menu).
9. **Send to architect**. The headset then shows a reference number and a staff-only PIN screen.

A **Guide** bar at the bottom of the panel gives a prompt at every step, and **Ask the AI helper** is available while building.

### What the architect receives (in `data/projects/<reference>/`)
| File | What it is |
|---|---|
| `A-101-floor-plan.svg` | Floor plan with doors, windows, fixtures, furniture outlines, stairs, room areas, dimensions |
| `P-101-plumbing-plan.svg` | Cold, hot and drain routes, meter, heater, sewer connection, vents |
| `E-101-electrical-power-plan.svg` | Outlets, air conditioner points, appliance points, distribution board |
| `E-102-lighting-plan.svg` | Lights, switches, switch legs |
| `S-001-schedules-and-notes.svg` | Room schedule, fixtures, circuit schedule, quantities |
| `plans.dxf` | CAD file with layers (opens in AutoCAD, Revit, BricsCAD, DraftSight, LibreCAD) |
| `all-sheets-print.html` | Open it, press Print, choose A3 landscape, save as one PDF |
| `level-1/`, `level-2/` ... | With more than one floor, each floor has its own set of sheets and DXF |
| `finishes.json`, `exterior-and-finishes.json`, `furniture.json` | Every material, colour, outside choice and furniture position the client chose (finishes also printed on sheet S-001) |
| `schedules.json`, `design.json` | Raw data (useful later for a bill of quantities) |

Open the `sample-output/` folder to see what a finished package looks like.

---

### What is new in v3 (realism, local pieces, drag to move, your own models)
- **Furniture rebuilt.** Rounded, turned and upholstered shapes: real beds (headboard, footboard, mattress, duvet, pillows, throw), sofas with separate cushions, dining sets, desks, wardrobes, bookcases with books, and more. Soft shadows and reflections when walking through.
- **Real tropical planting.** Coconut, royal and queen palms, mango, ackee, breadfruit, almond, poinciana, banana, hibiscus, bougainvillea, ixora, croton, hedges, and indoor plants, all built with veined, curved leaves.
- **Local Caribbean pieces.** Four-poster mahogany bed, daybed, peacock rattan chair, rocking chair, hammock, china cabinet, whatnot stand, rattan sofa, cane-back chair, planter's settee, jalousie screen, coal pot, yabba jar, calabash bowl.
- **Library of about 130 items** in 15 categories: Seating, Beds, Tables, Storage, Kitchen, Decor, Lighting, Plants, Rugs, Bath, Garage, Caribbean, Kids, Leisure, Outdoor. Choose **Garden** in the room list to add patio sets, a gazebo, pool, fountain, shed, hammock, trees and more.
- **Press, drag, release.** In the headset: point at a room or a piece of furniture, hold the trigger, move, release. On a computer: click and hold, drag, release. A ghost outline shows where it will land (red = not allowed). Furniture snaps to walls; stairs stay lined up between floors.
- **Your own real models.** Drop `.glb` files in `public/library/` and list them in `library.json` (see `public/library/README.txt`). This is how to get genuinely photo-real pieces.

**Honest limit:** everything built into the app is generated by code, so it looks clean and believable, not photographic. For "exactly like real life" on a specific sofa or bed, use the library to load a scanned or supplier model.

## The website, client portal and team workspace (v4)

**Pages (all in `public/`)**
- `/` home, `/services.html`, `/how-it-works.html`, `/about.html`, `/faq.html`, `/contact.html`, `/terms.html`, `/privacy.html`. Enquiries from the contact form arrive in the owner's **Enquiries** page.
- `/studio.html` is the VR design app (this used to be `/`). **Update the Quest bookmark to `/studio.html`.**
- `/portal.html` is the client portal. `/team` is the team workspace.
- `terms.html` and `privacy.html` are templates. Have a lawyer review them before launch.

**Accounts**
- You (the owner) sign in at `/team` with `ADMIN_KEY` (choose "The owner").
- Open **People** and create accounts for project managers, architects, surveyors, engineers, contractors and suppliers. The app shows a temporary password once. Give it to the person; they must change it on first sign-in. If someone forgets, press **Reset password**. (No emails are sent, so resets are manual.)
- Clients make their own account at `/portal.html` (name, username, password). The headset's final screen shows a **project reference** and **access code** to link their design. The owner or PM sees the same code on the project page.
- A project manager only sees the clients assigned to them. You see everything.

**Status updates (everyone sees their own view)**
Each stage is *Not started, In progress, Waiting review, Being corrected* or *Complete*. Professionals can mark *In progress*, *Question* or *Submit for review*. Only the PM or owner can approve (Complete) or send back (with a reason). Approving opens the next step and delivers that role's drawings. Clients see a simple timeline and updates feed; staff see alerts for stalled or blocked work.

**Drawings for each party** (concept drafts, a licensed professional must check and sign)
- **Elevations (sheet A-301):** front, rear, left and right views of the whole building, with levels, windows, doors and the roof shape the client chose. Also as editable `cad/elevations.dxf` for the architect, engineer and contractor. The client sees the printable sheet. Ground level is assumed; the roof is drawn over the top floor outline.
- Architect: all floor plans, MEP, schedules. Surveyor: site plan, boundary and corner points. Engineer: structural/foundation sheets. Contractor: plans plus BOQ. Supplier: quantities and finishes. Client: floor plan, elevations and finishes sheet only.
- **Editable CAD:** each party also gets `.dxf` files (architectural, electrical, plumbing, site and structure) that open in AutoCAD, Civil 3D, BricsCAD and others; save as DWG from there. The app cannot create real `.dwg` files itself. PDFs/SVGs are for reading, DXF is for editing.
- Team members can also upload their own files (PDF, DXF, DWG, RVT, IFC, images, spreadsheets, up to 3 MB each) for the PM to share.

**Environment variables:** `ADMIN_KEY` (required, your owner password), `STAFF_PIN` (headset new-design PIN), `TEAM_SECRET` (random, signs login tokens; Render generates it), `DATA_DIR` (where data lives; `/var/data` on Render). The old `PIN_ARCHITECT` style variables are optional and no longer needed.

### Putting it on GitHub and Render
Upload the contents of this folder (so `server`, `public`, `package.json` and `render.yaml` sit at the top level of the repo, not inside another folder). In Render choose New > Blueprint, pick the repo, and set `ADMIN_KEY` and `STAFF_PIN`. If the repo has an extra folder, set Render's **Root Directory** to it. A disk needs a paid plan; on the free plan accounts and projects are lost whenever the server restarts.

## 2. Run it on your computer first (15 minutes)

1. Install **Node.js 18 or newer** from nodejs.org.
2. Open a terminal in this folder and run:
   ```
   npm install
   npm start
   ```
3. Open **http://localhost:3000/studio.html** (the website is at http://localhost:3000) in Chrome or Edge. Drag to look around, click the panel.
4. Staff console: **http://localhost:3000/admin.html** (the key is `change-me` until you set `ADMIN_KEY`).
5. To see a sample plan package without clicking anything: `npm run sample`.

### Turn on the AI helper
Without a key the app still works, with built-in starter layouts and canned tips. For real AI answers:
1. Create an API key at **console.anthropic.com**.
2. Set it before starting: `ANTHROPIC_API_KEY=sk-ant-... npm start` (on Windows PowerShell: `$env:ANTHROPIC_API_KEY="sk-ant-..."; npm start`).
3. The model name is in `AI_MODEL` (default `claude-sonnet-5-5`). Check docs.claude.com for current model names.

The AI never draws walls or services. It only suggests which rooms and sizes to use and answers questions. Everything on the plans comes from our own rules in `server/model.js` and `server/mep.js`. That is deliberate: it keeps plans consistent and keeps the AI from inventing engineering.

---

## 3. Put it on the Quest 3

A Quest needs **HTTPS** to start a WebXR session (the one exception is `localhost`, used for testing).

### A. Test on one headset using your computer (no hosting yet)
1. Make a Meta developer account at **developer.oculus.com** and create an organization.
2. In the **Meta Horizon phone app**: Devices, select your Quest 3, Headset settings, Developer mode, turn it on. Restart the headset.
3. Install **Android platform-tools** (it contains `adb`) on your computer. Connect the Quest by USB-C and accept "Allow USB debugging" inside the headset.
4. Run `adb reverse tcp:3000 tcp:3000`.
5. In the headset, open **Quest Browser** and go to `http://localhost:3000/studio.html`.
6. Press **Enter VR**. Point with the controller and squeeze the trigger.

### B. Host it so every headset can reach it
Any host that runs Node.js and gives you HTTPS will do (Render, Railway, Fly.io, or a small server with Caddy). Typical steps on Render:
1. Put this folder in a private GitHub repository.
2. In Render: New, Web Service, connect the repository. Build command `npm install`. Start command `npm start`.
3. Add the environment variables from `.env.example` (`STAFF_PIN`, `ADMIN_KEY`, and optionally `ANTHROPIC_API_KEY`).
4. Render gives you an address such as `https://constructreality-studio.onrender.com`. Open it with `/studio.html` added at the end in Quest Browser, press **Enter VR**, and bookmark it.

**Important:** finished designs are written to the `data/` folder. On many hosts the disk is wiped when the service restarts or redeploys. Either attach a persistent disk, or download each project from the staff console right after the client finishes (the console has links to every file).

Active sessions (the four-digit session code on each headset) are kept in memory and reset when the server restarts.

---

## 4. Lock the headset to this one app

The requirement: once handed over, the client can use it only to design the house.

There are two layers.

**Inside our app (already done):** there are no links to other pages, right-click is disabled, and the browser controls are hidden while the client is in VR, and a finished design ends on a screen that needs your staff PIN to restart. This is **not** enough by itself. A person wearing a Quest can still press the Meta button and reach the system menu.

**The headset itself (kiosk mode):** the lock has to come from device management software. When I looked this up (November 2026):
- **Meta Horizon Managed Services is now free** and is required to enrol headsets, but Meta says it is in maintenance mode and supported until 4 January 2030.
- Management providers such as **ArborXR** and **ManageXR** can set a headset to launch a **single WebXR link in kiosk mode**. Options are the Quest Browser (improved kiosk behaviour needs firmware **v76 or newer**) or the **Wolvic** browser, whose kiosk mode stops users navigating away from the page.
- In kiosk mode the Quit button resumes the app instead of closing it, and leaving kiosk mode needs an admin command plus a reboot.
- One provider article was titled as reporting that a Meta OS update broke its kiosk mode, so **confirm that kiosk works on the exact firmware your headsets run**, and be careful with automatic updates on headsets you hand to clients.

Steps (names of menus differ by provider, so follow their current guide):
1. Create an account with **ArborXR** or **ManageXR** and enrol your headset with **Meta Horizon Managed Services** as their guide describes. Enrolment may require resetting the headset, so do it before you put anything else on it.
2. Create a **configuration** with a **WebXR link** pointing to your hosted address from section 3B.
3. Choose the launch method: **Wolvic (No Search)** is the most locked down, or the Quest Browser if you are on firmware v76 or newer.
4. Turn **kiosk mode** on for that configuration and assign your headsets to it.
5. Wait for the headset to sync, then test: try the Meta button, the pause menu, and the Quit button. Do this test on every headset.
6. Keep the admin login for staff only, since it is what turns the lock off.

If you cannot get kiosk mode working, do not hand headsets over unsupervised. Stay with the client, and treat the app lock as a convenience, not a security barrier.

---

## 5. Staff routine

1. Hand over the headset. The welcome screen shows a **session code** (for example 4821).
2. Open `/admin.html` on a phone or laptop, enter the staff key. You see the code in the list.
3. Type the client's name and press **Save**. Use **Send** to push a short message that appears in the headset's Guide bar. **View plan** shows their layout live.
4. When they press **Send to my architect**, their package appears under "Finished designs". Download the SVG sheets and the DXF, or open `all-sheets-print.html` and print to PDF.
5. Take the headset back, enter your PIN on the final screen to reset it for the next client. Wipe the lenses and wipe the controller straps.

---

## 6. Files you will edit most

| Want to change | File |
|---|---|
| Room types, minimum sizes, how rooms are laid out for a first draft | `server/model.js` |
| Light counts, outlet spacing, circuits, pipe routing and sizes | `server/mep.js` |
| How the drawings look, title block, notes, DXF layers | `server/drawings.js` |
| What the AI is told, canned tips | `server/ai.js` |
| Screens, wording, buttons, 3D model | `public/app.js` |
| Materials, textures, colour choices | `public/materials.js` |
| Furniture models | `public/models.js` |
| Which furniture goes in which room, sizes, default finishes | `public/catalog.js` |
| Roof, doors, windows, fence, garden | `public/exterior.js` |

---

## 7. Known limits (read this before a real client uses it)

- **Not tested on a real Quest 3.** Check ray pointing, the thumbstick mapping (left stick walk, right stick snap turn), the position of the panel and frame rate on your headset.
- **Up to three floors, rectangular rooms on a 0.5 m grid.** No L-shaped rooms or curved walls. The roof follows the outline of the top floor and one straight staircase is used on every floor.
- **Furniture is built from simple shapes** (boxes, cylinders), so it reads as realistic types and finishes but not photo-real products. It is placed by rules and the client can adjust it. The walk-through merges geometry to keep the headset smooth; if it stutters on your headset, use fewer floors or the Minimal garden.
- **Plans are concept drafts, not construction drawings.** Service routes are straight and indicative. Pipe sizes and circuits are rules of thumb. A licensed architect, engineers and an electrician must check everything. Each sheet says so in its title block, and you should keep that wording.
- **Materials are drawn in code, not photographed.** They look like the real thing (grain, grout, brick joints, concrete pores) but are not photo scans. Colours on screen depend on the headset lenses and lighting, so tell clients to confirm real samples before ordering.
- **The client cannot type in VR.** Questions are chosen from buttons. Staff can send short messages from the console.
- **Clients' names and designs are personal data.** Decide how long you keep them, who can see them, and tell clients before they start. Jamaica's Data Protection Act 2020 applies to personal data you collect. Ask a lawyer for the right notice wording.
- **Sessions live in memory.** A server restart ends active sessions (the headset starts a new one on its own).
- **Staff PIN and admin key:** set your own before real use. The defaults are for testing only.
- **Physical use:** use a barrier or clear play space; seated clients are safer for a first version. Follow Meta's health and safety guidance for age limits and session length.

## v5 (7 Nov)
- **Desktop studio (D5-style):** on a computer, `/studio.html` now shows a top toolbar, a library on the left (rooms, furniture, materials) and a properties panel on the right (size, name, position, colours for rooms and furniture; every exterior option with any colour; sun, time of day and background). Add `?panel` to the address to get the old 3D panel instead. In the headset the 3D panel is used as before.
- **Client details:** the computer view asks for name, email, phone and address first; they are sent with the design, appear in the team workflow log, and prefill the client portal sign-up (reference and access code too).
- **Headset send check:** the send screen shows "App version" and, after sending, "N files saved on the server". If the version differs from the computer's, the headset is running an old cached copy. Send errors now show their real cause.

## v6 (7 Nov)
- **Veranda:** over the door, across the whole front, or wrapped around the sides; width, depth, railing, columns, gingerbread fretwork, ceiling fan, steps, optional back veranda, and colours.
- **Lights:** chandeliers (crystal, modern ring, wood wheel), pendant cluster, recessed downlight, dome light, track spotlights, wall sconce, in-wall step light, picture light, and outdoor bollard, post lamp, floodlight, string lights and lantern. They glow, and give real light in a computer walk-through.
- **Drag and drop:** drag rooms and furniture/fixtures from the left library into the 3D view.
- **Render:** the Render button makes 4 outside views and one view of every room (lighting, shadows, lamps). Walking through asks for a render first. Renders are sent with the design and appear in the architect, contractor and client file lists.
- **Roof shapes** now show a picture and a plain-words explanation.

## v7 (7 Nov)
- **Shop section** (left panel, computer view): browse furniture and decor by section or search; drag into the 3D view. "Make it" has an assistant that builds a piece from a sentence (or restyles the whole home), plus a form for your own sizes in cm, m, ft or inches. "Stores" lets you copy in a product from a store (Courts Jamaica, Ashley Furniture or another) with its link, price and sizes; the design then uses the real size and the architect sees where it came from. Set `ANTHROPIC_API_KEY` on Render for the smarter assistant; without it a simpler word-matching mode is used.
- **Clean look:** style presets (Modern minimal, Tropical, Classic), a tray ceiling with a glowing edge, and a walk-through that hides the panels and gives room buttons to jump between rooms.
- Item height is now editable, and custom items keep their name, store and price.

## v8 – more drawings, manager overview, headset send tracking
- New concept sheets made automatically: G-001 title sheet/index/notes/legend, A-102 roof plan, A-401 sections, A-501 door and window schedule, A-601 typical details (incl. stair, retaining wall, expansion joint notes), S-102 column and beam layout, M-101 air conditioning and ventilation, F-101 fire safety and escape routes, C-102 stormwater and septic, R-101 risers (multi-storey). All are indicative, NOT FOR CONSTRUCTION.
- Not produced (need a professional's design): solar, smart-home, acoustic, steel truss, shop drawings, hydrant/sprinkler, lightning protection, site grading.
- Team page, project view: "Everything at a glance" for the manager (client contact, how it was sent, renders, furniture with store/price total, finishes, counts).
- Every sent design records device (Meta Quest / phone / computer), VR on or off, server address and app version. The VR "sent" screen shows the server address. Sending retries 3 times if the network drops.

## v9 – studio-only
- Outside the headset, studio.html shows a "Come to our studio" screen (book a visit, hurricane modelling coming) instead of the design tools. Staff can demo on a computer by adding ?staff to the studio address (e.g. /studio.html?staff).
- Hurricane load testing is presented as the company purpose, stated honestly as in development with licensed engineers (not yet in the studio). The studio controls design start to finish; "present your own model in VR" is offered as a booked service.
