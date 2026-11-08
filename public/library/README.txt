CUSTOM MODEL LIBRARY
====================
Want a piece of furniture, a tree or a fixture that looks exactly like the real thing?
Drop a real 3D model (a .glb file) in this folder and list it in library.json. No coding needed.

Where to get models: Sketchfab (filter "Downloadable", licence CC-BY or CC0), Poly Haven, Kenney, or
scans of your own pieces (phone apps such as Polycam or Scaniverse export .glb).

Example entry for library.json:

  { "type": "my_peacock_chair", "name": "Peacock chair (supplier A)", "cat": "Caribbean",
    "file": "peacock.glb", "w": 1.2, "d": 0.9, "h": 1.5, "place": "free" }

  type   a unique id, letters and underscores only
  name   what the customer sees
  cat    any existing category (Seating, Beds, Tables, Storage, Kitchen, Decor, Lighting, Plants,
         Rugs, Bath, Garage, Caribbean, Kids, Leisure, Outdoor) or a new one
  file   the .glb file name in this folder
  w d h  real size in metres (the model is scaled to fit)
  place  free | wall | corner | on | wallhigh | center

Keep each file under about 3 MB so it loads quickly on the headset (Quest 3).
Only use models you have the right to use, and credit the maker where the licence asks.
