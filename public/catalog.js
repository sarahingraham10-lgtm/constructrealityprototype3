/* ConstructReality Studio - the furniture and decor catalogue, and the engine that furnishes every room automatically.
   Positions are in metres in plan. rot is degrees about the vertical axis: 0 faces +z (toward the street), 90 faces +x, 180 faces -z, 270 faces -x. */

const FAB = ['fabric', 'leather', 'wicker'], WOOD = ['oak', 'walnut', 'mahogany', 'pine', 'paint'], MET = ['steel', 'paint'], RUG = ['rug'], POT = ['paint', 'concrete', 'wicker'], TOP = ['oak', 'walnut', 'marble', 'granite', 'quartz', 'paint', 'terrazzo'];
const sl = (n, kinds, k, c) => ({ n, kinds, def: { k, c: c === undefined ? 0xffffff : c } });
const BODY = (k, c) => sl('Wood or paint', WOOD, k || 'oak', c), METAL = (c) => sl('Metal', MET, 'steel', c === undefined ? 0xffffff : c);
const I = (n, cat, w, d, h, a, slots, extra) => Object.assign({ n, cat, w, d, h, a, slots }, extra || {});

export const ITEMS = {
  sofa3:   I('Sofa, 3 seat', 'Seating', 2.1, 0.95, 0.85, 'wall', { seat: sl('Fabric', FAB, 'fabric', 0x4a4a4c), leg: sl('Legs', WOOD, 'walnut') }),
  sofa2:   I('Sofa, 2 seat', 'Seating', 1.6, 0.92, 0.85, 'wall', { seat: sl('Fabric', FAB, 'fabric', 0x8cc3e6), leg: sl('Legs', WOOD, 'walnut') }),
  armchair: I('Armchair', 'Seating', 0.85, 0.85, 0.85, 'free', { seat: sl('Fabric', FAB, 'fabric', 0xc2603c), leg: sl('Legs', WOOD, 'walnut') }),
  dchair:  I('Dining chair', 'Seating', 0.45, 0.5, 0.9, 'free', { wood: sl('Wood', WOOD, 'oak'), seat: sl('Seat', FAB, 'fabric', 0xd8b98a) }),
  stool:   I('Stool', 'Seating', 0.4, 0.4, 0.65, 'free', { seat: sl('Seat', FAB, 'fabric', 0x4a4a4c), leg: METAL(0x4a4a4c) }),
  bench:   I('Bench', 'Seating', 1.2, 0.4, 0.45, 'wall', { seat: sl('Cushion', FAB, 'fabric', 0xd8b98a), leg: sl('Legs', WOOD, 'walnut') }),
  officechair: I('Office chair', 'Seating', 0.6, 0.6, 1.0, 'free', { seat: sl('Fabric', FAB, 'leather', 0x4a4a4c) }),
  bed_q:   I('Bed, queen', 'Beds', 1.6, 2.0, 1.1, 'wall', { frame: sl('Frame', WOOD, 'walnut'), bedding: sl('Bedding', FAB, 'fabric', 0xf3ead8), throw: sl('Throw', FAB, 'fabric', 0x8cc3e6) }),
  bed_k:   I('Bed, king', 'Beds', 1.9, 2.1, 1.1, 'wall', { frame: sl('Frame', WOOD, 'walnut'), bedding: sl('Bedding', FAB, 'fabric', 0xf3ead8), throw: sl('Throw', FAB, 'fabric', 0xc2603c) }),
  bed_s:   I('Bed, single', 'Beds', 1.0, 2.0, 1.0, 'wall', { frame: sl('Frame', WOOD, 'pine'), bedding: sl('Bedding', FAB, 'fabric', 0x86d1be), throw: sl('Throw', FAB, 'fabric', 0xf2c230) }),
  dining4: I('Dining set, 4', 'Tables', 1.2, 1.8, 0.9, 'center', { top: sl('Table', TOP, 'oak'), seat: sl('Chairs', FAB, 'fabric', 0xd8b98a) }),
  dining6: I('Dining set, 6', 'Tables', 1.8, 1.9, 0.9, 'center', { top: sl('Table', TOP, 'oak'), seat: sl('Chairs', FAB, 'fabric', 0xd8b98a) }),
  dining8: I('Dining set, 8', 'Tables', 2.4, 1.9, 0.9, 'center', { top: sl('Table', TOP, 'walnut'), seat: sl('Chairs', FAB, 'fabric', 0x4a4a4c) }),
  coffee:  I('Coffee table', 'Tables', 1.1, 0.6, 0.4, 'free', { top: sl('Top', TOP, 'oak'), leg: METAL(0x4a4a4c) }),
  side:    I('Side table', 'Tables', 0.5, 0.5, 0.55, 'free', { top: sl('Top', TOP, 'marble'), leg: METAL(0xb08d45) }),
  console: I('Console table', 'Tables', 1.2, 0.35, 0.8, 'wall', { top: sl('Top', TOP, 'oak'), leg: METAL(0x4a4a4c) }),
  desk:    I('Desk', 'Tables', 1.4, 0.7, 0.75, 'wall', { top: sl('Top', TOP, 'oak'), leg: sl('Frame', WOOD, 'walnut') }),
  sideboard: I('Sideboard', 'Storage', 1.4, 0.45, 0.85, 'wall', { body: BODY('walnut'), leg: METAL(0x4a4a4c) }),
  tvunit:  I('TV and unit', 'Storage', 1.5, 0.4, 1.0, 'wall', { body: BODY('walnut'), leg: METAL(0x4a4a4c) }),
  island:  I('Kitchen island', 'Kitchen', 1.8, 0.9, 0.92, 'center', { body: BODY('paint', 0xf3ead8), top: sl('Worktop', TOP, 'quartz') }),
  wardrobe: I('Wardrobe', 'Storage', 1.2, 0.6, 2.0, 'wall', { body: BODY('oak') }),
  dresser: I('Chest of drawers', 'Storage', 1.0, 0.5, 0.9, 'wall', { body: BODY('oak'), leg: METAL(0x4a4a4c) }),
  bookcase: I('Bookcase', 'Storage', 1.0, 0.35, 1.9, 'wall', { body: BODY('walnut') }),
  shoerack: I('Shoe rack', 'Storage', 0.8, 0.3, 0.5, 'wall', { body: BODY('pine') }),
  filing:  I('Filing cabinet', 'Storage', 0.45, 0.6, 0.7, 'wall', { body: sl('Paint', ['paint'], 'paint', 0xdddddd) }),
  shelf:   I('Wall shelf', 'Storage', 1.0, 0.25, 0.04, 'wallhigh', { body: BODY('oak') }, ),
  hamper:  I('Laundry basket', 'Storage', 0.4, 0.4, 0.6, 'corner', { body: sl('Weave', ['wicker', 'paint'], 'wicker') }),
  basket:  I('Basket', 'Decor', 0.4, 0.4, 0.35, 'corner', { body: sl('Weave', ['wicker', 'paint'], 'wicker') }),
  wallart: I('Wall art', 'Decor', 0.9, 0.04, 0.7, 'wallhigh', { frame: sl('Frame', WOOD, 'walnut') }),
  mirror:  I('Mirror', 'Decor', 0.7, 0.04, 1.6, 'wallhigh', { frame: sl('Frame', WOOD, 'oak') }),
  clock:   I('Wall clock', 'Decor', 0.4, 0.05, 0.4, 'wallhigh', { frame: METAL(0x4a4a4c) }),
  vase:    I('Vase of flowers', 'Decor', 0.2, 0.2, 0.35, 'on', { pot: sl('Vase', POT, 'paint', 0x8cc3e6) }),
  bowl:    I('Fruit bowl', 'Decor', 0.3, 0.3, 0.12, 'on', { pot: sl('Bowl', POT, 'paint', 0xf3ead8) }),
  books:   I('Stack of books', 'Decor', 0.25, 0.2, 0.12, 'on', {}),
  candles: I('Candles', 'Decor', 0.25, 0.15, 0.22, 'on', {}),
  ceilingfan: I('Ceiling fan', 'Lighting', 1.2, 1.2, 2.7, 'ceiling', { body: METAL(0xffffff), blade: sl('Blades', WOOD, 'oak') }),
  pendant: I('Pendant light', 'Lighting', 0.5, 0.5, 1.0, 'hang', { shade: sl('Shade', ['paint'], 'paint', 0xf2e9d6) }),
  chandelier: I('Chandelier', 'Lighting', 0.8, 0.8, 1.0, 'hang', {}),
  chand_crystal: I('Chandelier, crystal', 'Lighting', 0.9, 0.9, 1.1, 'hang', { frame: METAL(0xb08d45), glass: sl('Crystal', ['paint'], 'paint', 0xf4f8ff) }),
  chand_modern: I('Chandelier, modern ring', 'Lighting', 1.0, 1.0, 1.1, 'hang', { frame: METAL(0x1a1a1a) }),
  chand_rustic: I('Chandelier, wood wheel', 'Lighting', 1.0, 1.0, 1.0, 'hang', { wood: sl('Wood', WOOD, 'walnut'), iron: METAL(0x1a1a1a) }),
  pendant_cluster: I('Pendant cluster, 3 lights', 'Lighting', 0.7, 0.7, 1.1, 'hang', { shade: sl('Shades', ['paint'], 'paint', 0xf2e9d6) }),
  downlight: I('Recessed downlight', 'Lighting', 0.16, 0.16, 2.7, 'ceiling', { trim: METAL(0xffffff) }),
  domelight: I('Ceiling dome light', 'Lighting', 0.45, 0.45, 2.7, 'ceiling', { shell: sl('Shade', ['paint'], 'paint', 0xffffff) }),
  tracklight: I('Track spotlights', 'Lighting', 1.4, 0.12, 2.7, 'ceiling', { track: METAL(0x1a1a1a) }),
  sconce: I('Wall light, sconce', 'Lighting', 0.16, 0.12, 0.3, 'wallhigh', { body: METAL(0xb08d45) }),
  inwall: I('In-wall step light', 'Lighting', 0.12, 0.05, 0.12, 'wallhigh', { trim: METAL(0xcfcfcf) }),
  picturelight: I('Picture light', 'Lighting', 0.5, 0.14, 0.1, 'wallhigh', { body: METAL(0xb08d45) }),
  bollard: I('Garden bollard light', 'Outdoor', 0.16, 0.16, 0.6, 'free', { body: METAL(0x2a2a2c) }),
  postlamp: I('Garden post lamp', 'Outdoor', 0.3, 0.3, 2.4, 'free', { body: METAL(0x1a1a1a) }),
  floodlight: I('Floodlight on pole', 'Outdoor', 0.3, 0.3, 3.2, 'free', { body: METAL(0x2a2a2c) }),
  stringlights: I('Festoon string lights', 'Outdoor', 4.0, 0.2, 2.6, 'free', { body: METAL(0x1a1a1a) }),
  lantern: I('Hanging lantern stand', 'Outdoor', 0.4, 0.4, 1.8, 'free', { body: METAL(0x1a1a1a) }),
  floorlamp: I('Floor lamp', 'Lighting', 0.35, 0.35, 1.6, 'corner', { body: METAL(0x4a4a4c) }),
  tablelamp: I('Table lamp', 'Lighting', 0.3, 0.3, 0.5, 'on', { body: sl('Base', POT, 'paint', 0xf3ead8) }),
  plant_big: I('Large plant', 'Plants', 0.55, 0.55, 1.5, 'corner', { pot: sl('Pot', POT, 'paint', 0xf3ead8) }),
  plant_med: I('Plant', 'Plants', 0.35, 0.35, 0.9, 'corner', { pot: sl('Pot', POT, 'paint', 0xc2603c) }),
  plant_small: I('Small plant', 'Plants', 0.22, 0.22, 0.4, 'on', { pot: sl('Pot', POT, 'paint', 0xd8b98a) }),
  palm:    I('Indoor palm', 'Plants', 0.6, 0.6, 1.9, 'corner', { pot: sl('Pot', POT, 'concrete') }),
  rug_l:   I('Rug, large', 'Rugs', 2.4, 1.7, 0.02, 'floor', { rug: sl('Rug', RUG, 'rug', 0xd8b98a) }),
  rug_m:   I('Rug, medium', 'Rugs', 2.0, 1.4, 0.02, 'floor', { rug: sl('Rug', RUG, 'rug', 0x86d1be) }),
  rug_s:   I('Rug, small', 'Rugs', 1.2, 0.8, 0.02, 'floor', { rug: sl('Rug', RUG, 'rug', 0xc2603c) }),
  runner:  I('Runner', 'Rugs', 0.8, 2.2, 0.02, 'floor', { rug: sl('Rug', RUG, 'rug', 0x25405e) }),
  curtains: I('Curtains', 'Rugs', 1.4, 0.1, 2.4, 'window', { fabric: sl('Fabric', FAB, 'fabric', 0xf3ead8) }),
  kcab:    I('Kitchen cabinet', 'Kitchen', 0.6, 0.6, 0.9, 'wall', { body: BODY('paint', 0xf3ead8), top: sl('Worktop', TOP, 'granite') }),
  ucab:    I('Wall cabinet', 'Kitchen', 0.6, 0.35, 0.7, 'wallhigh', { body: BODY('paint', 0xf3ead8) }),
  hood:    I('Cooker hood', 'Kitchen', 0.6, 0.5, 0.6, 'wallhigh', { body: METAL(0xffffff) }),
  microwave: I('Microwave', 'Kitchen', 0.45, 0.35, 0.28, 'on', {}),
  kettle:  I('Kettle', 'Kitchen', 0.2, 0.2, 0.22, 'on', {}),
  towelrail: I('Towel rail', 'Bath', 0.6, 0.08, 0.8, 'wallhigh', {}),
  bathmat: I('Bath mat', 'Rugs', 0.8, 0.5, 0.02, 'floor', { rug: sl('Mat', RUG, 'rug', 0x8cc3e6) }),
  car:     I('Car', 'Garage', 1.8, 4.4, 1.45, 'center', { body: sl('Paint', ['paint'], 'paint', 0x25405e) }),
  bike:    I('Bicycle', 'Garage', 0.5, 1.7, 1.0, 'wall', { body: sl('Frame', ['paint'], 'paint', 0xee6f57) }),
  shelving: I('Garage shelving', 'Garage', 1.5, 0.4, 1.8, 'wall', { body: sl('Frame', MET, 'steel', 0x8a8a8a) }),

  /* ---- Caribbean and local ---- */
  bed_post: I('Four-poster bed (mahogany)', 'Caribbean', 1.7, 2.1, 1.95, 'wall', { frame: sl('Frame', WOOD, 'mahogany'), bedding: sl('Bedding', FAB, 'fabric', 0xf3ead8), throw: sl('Throw', FAB, 'fabric', 0xd9a441) }),
  bed_day: I('Daybed', 'Caribbean', 1.0, 2.0, 0.8, 'wall', { frame: sl('Frame', WOOD, 'mahogany'), bedding: sl('Bedding', FAB, 'fabric', 0xf3ead8), throw: sl('Cushions', FAB, 'fabric', 0x2f7d78) }),
  peacock_chair: I('Peacock rattan chair', 'Caribbean', 1.2, 0.8, 1.45, 'free', { body: sl('Rattan', ['wicker', 'paint'], 'wicker') }),
  rocking_chair: I('Rocking chair', 'Caribbean', 0.6, 0.95, 1.0, 'free', { wood: sl('Wood', WOOD, 'mahogany') }),
  hammock: I('Hammock with stand', 'Caribbean', 1.2, 3.2, 1.7, 'free', { frame: sl('Stand', WOOD, 'mahogany'), fabric: sl('Cloth', FAB, 'fabric', 0xe9d9b6) }),
  china_cabinet: I('China cabinet', 'Caribbean', 1.2, 0.45, 1.9, 'wall', { body: BODY('mahogany') }),
  whatnot: I('Whatnot stand', 'Caribbean', 0.55, 0.55, 1.4, 'corner', { body: BODY('mahogany') }),
  rattan_sofa: I('Rattan sofa', 'Caribbean', 2.0, 0.9, 0.9, 'wall', { body: sl('Rattan', ['wicker', 'paint'], 'wicker'), seat: sl('Cushions', FAB, 'fabric', 0xf0e6d2) }),
  cane_chair: I('Cane-back chair', 'Caribbean', 0.5, 0.5, 0.95, 'free', { wood: sl('Wood', WOOD, 'mahogany') }),
  settee: I('Planter\'s settee', 'Caribbean', 1.5, 0.6, 0.95, 'wall', { wood: sl('Wood', WOOD, 'mahogany') }),
  jalousie_screen: I('Jalousie screen', 'Caribbean', 1.2, 0.08, 1.8, 'wall', { frame: sl('Wood', WOOD, 'pine', 0xffffff) }),
  coal_pot: I('Coal pot', 'Caribbean', 0.4, 0.4, 0.4, 'free', {}),
  yabba: I('Yabba water jar', 'Caribbean', 0.4, 0.4, 0.6, 'corner', { pot: sl('Clay', POT, 'paint', 0xb8643a) }),
  calabash: I('Calabash bowl', 'Caribbean', 0.35, 0.35, 0.16, 'on', { pot: sl('Calabash', POT, 'paint', 0xc9a25a) }),
  /* ---- Outdoor ---- */
  patio_set: I('Patio table, chairs and umbrella', 'Outdoor', 2.4, 2.4, 2.4, 'free', { frame: METAL(0x2a2a2c), top: sl('Table top', TOP, 'granite'), seat: sl('Chairs', FAB, 'fabric', 0xd8b98a), shade: sl('Umbrella', ['fabric', 'paint'], 'fabric', 0xf2e9d6) }),
  outdoor_dining: I('Outdoor dining table', 'Outdoor', 2.0, 2.0, 0.8, 'free', { top: sl('Wood', WOOD, 'pine') }),
  lounger: I('Sun lounger', 'Outdoor', 0.7, 1.9, 0.7, 'free', { frame: METAL(0xf4f4f2), seat: sl('Cushion', FAB, 'fabric', 0xf3ead8) }),
  grill: I('BBQ grill', 'Outdoor', 0.7, 0.55, 1.1, 'free', { body: sl('Paint', ['paint'], 'paint', 0x1c1c1e) }),
  planter: I('Planter with shrub', 'Outdoor', 0.8, 0.8, 1.3, 'free', { pot: sl('Pot', POT, 'concrete') }),
  garden_bench: I('Garden bench', 'Outdoor', 1.5, 0.6, 0.9, 'free', { wood: sl('Wood', WOOD, 'pine') }),
  gazebo: I('Gazebo', 'Outdoor', 3.5, 3.5, 2.6, 'free', { frame: sl('Wood', WOOD, 'pine') }),
  pool: I('Swimming pool', 'Outdoor', 3.0, 5.0, 0.05, 'free', { tile: sl('Tile', ['tile'], 'tile', 0xbfe3ec) }),
  swing_chair: I('Hanging swing chair', 'Outdoor', 1.2, 1.2, 2.4, 'free', { body: sl('Rattan', ['wicker', 'paint'], 'wicker') }),
  fire_pit: I('Fire pit', 'Outdoor', 0.9, 0.9, 0.4, 'free', { body: METAL(0x3a3a3c) }),
  fountain: I('Fountain', 'Outdoor', 1.4, 1.4, 1.5, 'free', { body: sl('Stone', ['concrete', 'paint'], 'concrete') }),
  shed: I('Garden shed', 'Outdoor', 2.4, 2.0, 2.3, 'free', { body: sl('Wood', WOOD, 'pine', 0x7a8f7a) }),
  dog_house: I('Dog house', 'Outdoor', 0.9, 1.0, 0.9, 'free', { body: sl('Wood', WOOD, 'pine') }),
  clothesline: I('Clothesline', 'Outdoor', 3.0, 0.2, 1.8, 'free', {}),
  umbrella_stand: I('Parasol', 'Outdoor', 2.0, 2.0, 2.3, 'free', { frame: sl('Pole', WOOD, 'pine'), shade: sl('Canopy', ['fabric', 'paint'], 'fabric', 0xe9a23b) }),
  tree_coconut: I('Coconut palm', 'Outdoor', 1.0, 1.0, 8.0, 'free', {}),
  tree_royal: I('Royal palm', 'Outdoor', 0.9, 0.9, 9.0, 'free', {}),
  tree_queen: I('Queen palm', 'Outdoor', 0.9, 0.9, 6.0, 'free', {}),
  tree_mango: I('Mango tree', 'Outdoor', 2.2, 2.2, 7.0, 'free', {}),
  tree_ackee: I('Ackee tree', 'Outdoor', 2.0, 2.0, 7.0, 'free', {}),
  tree_breadfruit: I('Breadfruit tree', 'Outdoor', 2.0, 2.0, 7.0, 'free', {}),
  tree_almond: I('Almond tree', 'Outdoor', 2.0, 2.0, 6.0, 'free', {}),
  tree_poinciana: I('Poinciana tree', 'Outdoor', 2.4, 2.4, 6.0, 'free', {}),
  tree_banana: I('Banana plants', 'Outdoor', 1.2, 1.2, 3.5, 'free', {}),
  tree_hibiscus: I('Hibiscus', 'Outdoor', 1.2, 1.2, 1.6, 'free', {}),
  tree_bougainvillea: I('Bougainvillea', 'Outdoor', 1.6, 1.6, 2.0, 'free', {}),
  tree_ixora: I('Ixora', 'Outdoor', 1.0, 1.0, 1.2, 'free', {}),
  tree_croton: I('Croton', 'Outdoor', 1.0, 1.0, 1.2, 'free', {}),
  tree_hedge: I('Hedge', 'Outdoor', 2.0, 0.7, 1.2, 'free', {}),
  /* ---- Kids ---- */
  crib: I('Baby crib', 'Kids', 0.7, 1.3, 0.95, 'wall', { frame: sl('Wood', WOOD, 'paint', 0xffffff) }),
  bed_bunk: I('Bunk bed', 'Kids', 1.0, 2.0, 1.7, 'wall', { frame: sl('Frame', WOOD, 'pine'), bedding: sl('Bedding', FAB, 'fabric', 0x86d1be) }),
  toybox: I('Toy box', 'Kids', 0.8, 0.45, 0.45, 'wall', { body: BODY('paint', 0xf2c230) }),
  floorcushion: I('Floor cushion', 'Kids', 0.6, 0.6, 0.18, 'free', { seat: sl('Fabric', FAB, 'fabric', 0xe0402a) }),
  /* ---- Leisure and work ---- */
  piano: I('Upright piano', 'Leisure', 1.5, 0.65, 1.2, 'wall', { body: BODY('walnut', 0x2a2a2c) }),
  gym_bench: I('Weight bench', 'Leisure', 1.4, 1.0, 1.2, 'free', {}),
  treadmill: I('Treadmill', 'Leisure', 0.8, 1.8, 1.3, 'wall', {}),
  bar_cart: I('Bar cart', 'Leisure', 0.8, 0.45, 0.85, 'wall', { top: sl('Shelf', TOP, 'oak') }),
  wine_rack: I('Wine rack', 'Leisure', 0.8, 0.3, 1.0, 'wall', { body: BODY('walnut') }),
  statue: I('Statue', 'Decor', 0.3, 0.3, 0.7, 'on', { body: sl('Stone', POT, 'concrete') }),
  lantern: I('Lantern', 'Decor', 0.25, 0.25, 0.4, 'on', {}),
  photoframes: I('Photo frames', 'Decor', 0.6, 0.12, 0.25, 'on', { frame: sl('Frame', WOOD, 'walnut') }),
  basket_planter: I('Plant in basket', 'Plants', 0.45, 0.45, 1.1, 'corner', { pot: sl('Basket', POT, 'wicker') }),
  rice_cooker: I('Rice cooker', 'Kitchen', 0.3, 0.3, 0.28, 'on', {}),
  blender: I('Blender', 'Kitchen', 0.2, 0.2, 0.4, 'on', {}),
  toaster: I('Toaster', 'Kitchen', 0.3, 0.2, 0.2, 'on', {}),
  water_cooler: I('Water dispenser', 'Kitchen', 0.35, 0.35, 1.0, 'corner', {}),
  bathtub: I('Bathtub', 'Bath', 0.8, 1.7, 0.55, 'wall', {}),
  vanity_double: I('Double vanity', 'Bath', 1.5, 0.55, 0.9, 'wall', { body: BODY('paint', 0xf3ead8), top: sl('Top', TOP, 'marble') }),
  hamper2: I('Round hamper', 'Bath', 0.45, 0.45, 0.6, 'corner', { body: sl('Weave', ['wicker', 'paint'], 'wicker') }),
  workbench: I('Workbench', 'Garage', 1.5, 0.6, 0.9, 'wall', { top: sl('Top', TOP, 'pine'), body: sl('Frame', MET, 'steel', 0x4a4a4c) })
};
/* the fixtures the server places (they carry plumbing) get slot defaults so they can be re-finished too */
export const FIXTURE_SLOTS = {
  basin: { body: sl('Cabinet', WOOD, 'oak'), top: sl('Top', TOP, 'marble') },
  ksink: { body: sl('Cabinet', WOOD, 'paint', 0xf3ead8), top: sl('Worktop', TOP, 'granite') },
  lsink: { body: sl('Cabinet', WOOD, 'paint', 0xf3ead8), top: sl('Worktop', TOP, 'granite') },
  counter: { body: sl('Cabinet', WOOD, 'paint', 0xf3ead8), top: sl('Worktop', TOP, 'granite') }
};
export const CATS = ['Seating', 'Beds', 'Tables', 'Storage', 'Kitchen', 'Decor', 'Lighting', 'Plants', 'Rugs', 'Bath', 'Garage', 'Caribbean', 'Kids', 'Leisure', 'Outdoor'];
export const ADD_ROOM_HINT = { Beds: ['bedroom'], Kitchen: ['kitchen'], Bath: ['bathroom'], Garage: ['garage'] };

/* ------------------------------------------------------------------ placement ------------------------------------------------------------------ */
const rad = d => d * Math.PI / 180, nrm = d => ((Math.round(d) % 360) + 360) % 360;
export const rotOf = (nx, nz) => nrm(Math.atan2(nx, nz) * 180 / Math.PI);
export function foot(it) { const sw = nrm(it.rot) % 180 === 90; const w = sw ? it.d : it.w, d = sw ? it.w : it.d; return { x0: it.x - w / 2, x1: it.x + w / 2, z0: it.z - d / 2, z1: it.z + d / 2 }; }
const hit = (a, b, m) => a.x0 < b.x1 + (m || 0) && b.x0 < a.x1 + (m || 0) && a.z0 < b.z1 + (m || 0) && b.z0 < a.z1 + (m || 0);
const fwd = (rot) => [Math.sin(rad(rot)), Math.cos(rad(rot))], rgt = (rot) => [Math.cos(rad(rot)), -Math.sin(rad(rot))];

function sidesOf(r) {
  return [{ ori: 'h', fix: r.z, a0: r.x, a1: r.x + r.w, nx: 0, nz: 1 }, { ori: 'h', fix: r.z + r.d, a0: r.x, a1: r.x + r.w, nx: 0, nz: -1 },
    { ori: 'v', fix: r.x, a0: r.z, a1: r.z + r.d, nx: 1, nz: 0 }, { ori: 'v', fix: r.x + r.w, a0: r.z, a1: r.z + r.d, nx: -1, nz: 0 }];
}
/* what the room already contains that furniture must not block: fixtures, door swings, placed items */
function context(A, ri, items) {
  const room = A.design.rooms[ri], obst = [];
  A.fixtures.filter(f => f.room === ri).forEach(f => obst.push({ x0: f.x - f.w / 2, x1: f.x + f.w / 2, z0: f.z - f.d / 2, z1: f.z + f.d / 2, fixture: f }));
  const doors = A.doors.filter(d => d.rooms.includes(ri)), windows = A.windows.filter(w => w.rooms[0] === ri);
  doors.forEach(d => {
    const hw = d.w / 2 + 0.08, dep = d.garage ? 3.2 : 1.0;
    const s = sidesOf(room).find(q => q.ori === d.ori && Math.abs((d.ori === 'h' ? d.z : d.x) - q.fix) < 1e-6 && (d.ori === 'h' ? d.x : d.z) >= q.a0 - 1e-6 && (d.ori === 'h' ? d.x : d.z) <= q.a1 + 1e-6);
    if (!s) return;
    const cx = d.ori === 'h' ? d.x : s.fix + s.nx * dep / 2, cz = d.ori === 'h' ? s.fix + s.nz * dep / 2 : d.z, hx = d.ori === 'h' ? hw : dep / 2, hz = d.ori === 'h' ? dep / 2 : hw;
    obst.push({ x0: cx - hx, x1: cx + hx, z0: cz - hz, z1: cz + hz, door: true });
  });
  items.filter(i => i.roomId === room.id && i.a !== 'floor' && i.a !== 'wallhigh' && i.a !== 'ceiling' && i.a !== 'hang' && !i.on && !i._p).forEach(i => obst.push({ ...foot(i), item: i }));
  return { room, obst, doors, windows };
}
function inside(room, f, tol) { tol = tol || 0.02; return f.x0 >= room.x - tol && f.x1 <= room.x + room.w + tol && f.z0 >= room.z - tol && f.z1 <= room.z + room.d + tol; }
function free(ctx, f, m) { return inside(ctx.room, f) && !ctx.obst.some(o => hit(f, o, m === undefined ? 0.03 : m)); }
function windowOn(ctx, s, lo, hi) { return ctx.windows.some(w => (w.ori === s.ori) && Math.abs((s.ori === 'h' ? w.z : w.x) - s.fix) < 1e-6 && (() => { const c = s.ori === 'h' ? w.x : w.z; return c + w.w / 2 + 0.05 > lo && c - w.w / 2 - 0.05 < hi; })()); }
function doorOn(ctx, s) { return ctx.doors.some(d => d.ori === s.ori && Math.abs((s.ori === 'h' ? d.z : d.x) - s.fix) < 1e-6 && (s.ori === 'h' ? d.x : d.z) >= s.a0 - 1e-6 && (s.ori === 'h' ? d.x : d.z) <= s.a1 + 1e-6); }

/* all the places a w x d item can stand with its back to a wall; the caller picks the best */
function wallSpots(ctx, w, d, o) {
  o = o || {}; const out = [];
  for (const s of sidesOf(ctx.room)) {
    if (o.only && !o.only(s)) continue;
    const step = 0.25, rot = rotOf(s.nx, s.nz);
    for (let a = s.a0 + w / 2; a <= s.a1 - w / 2 + 1e-9; a += step) {
      const x = s.ori === 'h' ? a : s.fix + s.nx * (d / 2 + 0.02), z = s.ori === 'h' ? s.fix + s.nz * (d / 2 + 0.02) : a;
      const it = { x, z, w, d, rot }, f = foot(it);
      if (!free(ctx, f)) continue;
      if (o.tall && windowOn(ctx, s, a - w / 2, a + w / 2)) continue;
      out.push({ x, z, rot, s, a, cx: (s.a0 + s.a1) / 2, len: s.a1 - s.a0 });
    }
  }
  return out;
}
const best = (spots, score) => spots.reduce((b, c) => { const v = score(c); return (!b || v > b.v) ? { c, v } : b; }, null);
function cornerSpots(ctx, w, d) {
  const r = ctx.room, out = [];
  for (const [cx, cz, rot] of [[r.x, r.z, 0], [r.x + r.w, r.z, 0], [r.x, r.z + r.d, 180], [r.x + r.w, r.z + r.d, 180]]) {
    const x = cx + (cx === r.x ? w / 2 + 0.03 : -w / 2 - 0.03), z = cz + (cz === r.z ? d / 2 + 0.03 : -d / 2 - 0.03);
    if (free(ctx, foot({ x, z, w, d, rot }), 0.02)) out.push({ x, z, rot: cx === r.x ? (cz === r.z ? 135 : 45) : (cz === r.z ? 225 : 315) });
  }
  return out;
}
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

/* furnish every room of one level. Returns items (without ids). */
export function furnishLevel(A, level, existing, only) {
  const items = existing ? existing.slice() : [], out = [];
  const rooms = A.design.rooms;
  const add = (type, x, z, rot, ri, extra) => { const spec = ITEMS[type], it = Object.assign({ type, level, roomId: rooms[ri].id, x, z, rot: nrm(rot), w: spec.w, d: spec.d, h: spec.h, y: 0, a: spec.a, auto: true }, extra || {}); items.push(it); out.push(it); return it; };
  const sizeOf = (type) => ITEMS[type];
  rooms.forEach((room, ri) => {
    const t = room.type, area = room.w * room.d;
    if (t === 'stairs' || (only && !only.has(room.id))) return;
    const ctx = () => context(A, ri, items);
    let C = ctx();
    const doorsNear = (c) => C.doors.length ? Math.min(...C.doors.map(d => dist(c, d))) : 5;
    /* ---- windows get curtains (not in wet rooms or garages) ---- */
    if (['living', 'bedroom', 'dining', 'office'].includes(t)) {
      C.windows.forEach(wn => {
        const s = sidesOf(room).find(q => q.ori === wn.ori && Math.abs((wn.ori === 'h' ? wn.z : wn.x) - q.fix) < 1e-6); if (!s) return;
        const sp = ITEMS.curtains, w = wn.w + 0.7, it = add('curtains', wn.ori === 'h' ? wn.x : s.fix + s.nx * 0.09, wn.ori === 'h' ? s.fix + s.nz * 0.09 : wn.z, rotOf(s.nx, s.nz), ri, { w, d: sp.d, h: 2.45, a: 'window', win: wn.id });
      });
    }
    /* ---- tall plant/lamp in the best corner helper ---- */
    const corner = (type, pref) => { const sp = sizeOf(type); C = ctx(); const cs = cornerSpots(C, sp.w, sp.d); if (!cs.length) return null; const b = best(cs, c => (pref ? pref(c) : 0) + doorsNear(c) * 0.1); return add(type, b.c.x, b.c.z, b.c.rot, ri); };
    const wallItem = (type, o) => { const sp = sizeOf(type); C = ctx(); const spots = wallSpots(C, sp.w, sp.d, Object.assign({ tall: sp.h > 0.9 }, o)); if (!spots.length) return null; const sc = (o && o.score) || (c => -Math.abs(c.a - c.cx) * 0.2 + c.len * 0.1); const b = best(spots, sc); return add(type, b.c.x, b.c.z, b.c.rot, ri); };
    const on = (parent, type, dx, dz) => { const r = rgt(parent.rot || 0), f = fwd(parent.rot || 0); return add(type, parent.x + r[0] * (dx || 0) + f[0] * (dz || 0), parent.z + r[1] * (dx || 0) + f[1] * (dz || 0), parent.rot || 0, ri, { y: parent.h, _p: parent }); };
    const above = (base, type, y) => { const f = fwd(base.rot), dd = base.d / 2; return add(type, base.x - f[0] * dd, base.z - f[1] * dd, base.rot, ri, { y: y || 1.4 }); };
    const ceilCenter = (type) => { const sp = sizeOf(type); return add(type, room.x + room.w / 2, room.z + room.d / 2, 0, ri, { y: 0, h: 2.7 }); };

    if (t === 'living') {
      const tvSp = sizeOf('tvunit'); C = ctx();
      const tvSpots = wallSpots(C, tvSp.w, tvSp.d, { tall: true }).filter(c => !windowOn(C, c.s, c.s.a0, c.s.a1) || true);
      const tvB = best(tvSpots, c => c.len * 0.25 - (doorOn(C, c.s) ? 3 : 0) - (windowOn(C, c.s, c.s.a0, c.s.a1) ? 4 : 0) - Math.abs(c.a - c.cx) * 0.3);
      let tv = null; if (tvB) tv = add('tvunit', tvB.c.x, tvB.c.z, tvB.c.rot, ri);
      const sofaT = area >= 16 ? 'sofa3' : 'sofa2', sp = sizeOf(sofaT); C = ctx();
      const tf = tv ? fwd(tv.rot) : null, opp = tv ? (s => Math.abs(s.nx + tf[0]) < 1e-6 && Math.abs(s.nz + tf[1]) < 1e-6) : null;
      const spots = wallSpots(C, sp.w, sp.d, { only: opp });
      const sb = best(spots.length ? spots : wallSpots(C, sp.w, sp.d), c => -Math.abs(c.a - c.cx) * 0.4 - (doorOn(C, c.s) ? 1 : 0) + (tv ? Math.min(5, dist(c, tv)) * 0.3 : 0));
      let sofa = null; if (sb) sofa = add(sofaT, sb.c.x, sb.c.z, sb.c.rot, ri);
      if (sofa) {
        const f = fwd(sofa.rot), r = rgt(sofa.rot), cd = sp.d / 2 + 0.5 + 0.3;
        const ct = add('coffee', sofa.x + f[0] * cd, sofa.z + f[1] * cd, sofa.rot, ri);
        if (!free(context(A, ri, items.filter(q => q !== ct)), foot(ct), 0.0)) { items.splice(items.indexOf(ct), 1); out.splice(out.indexOf(ct), 1); }
        else {
          add('rug_l', sofa.x + f[0] * (sp.d / 2 + 0.85), sofa.z + f[1] * (sp.d / 2 + 0.85), sofa.rot, ri, { a: 'floor' });
          on(ct, 'bowl'); on(ct, 'books', 0.3, 0.05);
          const ar = sizeOf('armchair'); if (area >= 18) for (const sg of [-1, 1]) { const cx = ct.x + r[0] * sg * (ct.w / 2 + ar.w / 2 + 0.45), cz = ct.z + r[1] * sg * (ct.w / 2 + ar.w / 2 + 0.45); const it = { x: cx, z: cz, w: ar.w, d: ar.d, rot: sofa.rot + (sg > 0 ? -90 : 90) }; if (free(ctx(), foot(it), 0.0)) add('armchair', it.x, it.z, it.rot, ri); }
        }
        const sd = sizeOf('side'), sx = sofa.x + r[0] * (sp.w / 2 + sd.w / 2 + 0.06), sz = sofa.z + r[1] * (sp.w / 2 + sd.w / 2 + 0.06);
        if (free(ctx(), foot({ x: sx, z: sz, w: sd.w, d: sd.d, rot: 0 }), 0.0)) { const sdi = add('side', sx, sz, 0, ri); on(sdi, 'tablelamp'); }
        above(sofa, 'wallart', 1.5);
      }
      if (area >= 14) { wallItem('bookcase', { score: c => -doorsNear(c) * -0.1 + c.len * 0.05 }); }
      corner('plant_big'); if (area >= 20) corner('palm'); corner('floorlamp');
      if (area >= 14) ceilCenter('ceilingfan');
    } else if (t === 'dining') {
      const set = area >= 18 ? 'dining8' : area >= 12 ? 'dining6' : 'dining4', sp = sizeOf(set), alongX = room.w >= room.d;
      let it = { x: room.x + room.w / 2, z: room.z + room.d / 2, w: sp.w, d: sp.d, rot: alongX ? 0 : 90 }; if (!inside(room, foot(it), -0.3)) it.rot = alongX ? 90 : 0;
      const tbl = add(set, it.x, it.z, it.rot, ri); on(tbl, 'vase'); on(tbl, 'candles', 0.4, 0);
      add('pendant', tbl.x, tbl.z, 0, ri, { y: 1.7, h: 1.0, a: 'hang' });
      wallItem('sideboard', { score: c => c.len * 0.1 - doorsNear(c) * -0.05 }); const sb = out.filter(o => o.type === 'sideboard')[0]; if (sb) { above(sb, 'wallart', 1.45); on(sb, 'tablelamp', 0.4, 0); }
      corner('plant_big'); if (area >= 12) ceilCenter('ceilingfan');
    } else if (t === 'kitchen') {
      C = ctx();
      /* base cabinets next to each sink, cooker and counter, upper cabinets above them, hood over the cooker */
      const runs = A.fixtures.filter(f => f.room === ri && ['ksink', 'cooker', 'counter', 'fridge'].includes(f.kind) && (f.nx || f.nz));
      const cab = sizeOf('kcab'), uc = sizeOf('ucab');
      runs.forEach(f => {
        const rot = rotOf(f.nx, f.nz), t0 = [Math.abs(f.nz), Math.abs(f.nx)], len = Math.abs(f.nz) > 0 ? f.w : f.d, dep = Math.abs(f.nz) > 0 ? f.d : f.w;
        if (f.kind === 'cooker' || f.kind === 'ksink') [0.0].forEach(() => {});
        for (const sg of [-1, 1]) for (let k = 0; k < 2; k++) {
          const off = (len / 2 + cab.w / 2 + 0.005 + k * cab.w) * sg, x = f.x + t0[0] * off, z = f.z + t0[1] * off, probe = { x, z, w: Math.abs(f.nz) > 0 ? cab.w : dep, d: Math.abs(f.nz) > 0 ? dep : cab.w, rot: 0 };
          const ft = foot(probe); if (!inside(room, ft) || context(A, ri, items).obst.some(o => hit(ft, o, -0.02))) break;
          add('kcab', x, z, rot, ri, { w: cab.w, d: dep, h: 0.9 });
        }
      });
      const kc = out.filter(o => o.type === 'kcab'), cl = runs.filter(f => ['ksink', 'counter', 'cooker'].includes(f.kind));
      const placeUpper = (x, z, rot, w) => { const probeWinOk = !C.windows.some(wn => Math.hypot(wn.x - x, wn.z - z) < wn.w / 2 + w / 2 + 0.05); if (probeWinOk) add('ucab', x, z, rot, ri, { w, d: 0.35, h: 0.7, y: 1.45, a: 'wallhigh' }); };
      C = ctx();
      kc.forEach(k => { const f = fwd(k.rot); placeUpper(k.x - f[0] * (k.d / 2 - 0.175), k.z - f[1] * (k.d / 2 - 0.175), k.rot, k.w); });
      cl.forEach(f => { const rot = rotOf(f.nx, f.nz), len = Math.abs(f.nz) > 0 ? f.w : f.d, depth = Math.abs(f.nz) > 0 ? f.d : f.w; const px = f.x - f.nx * (depth / 2 - 0.175), pz = f.z - f.nz * (depth / 2 - 0.175); if (f.kind === 'cooker') add('hood', px, pz + 0, rot, ri, { w: Math.max(0.6, len), d: 0.5, h: 0.6, y: 1.55, a: 'wallhigh' }); else placeUpper(px, pz, rot, len); });
      if (kc[0]) on(kc[0], 'microwave', 0, 0); if (kc.length > 1) on(kc[kc.length - 1], 'kettle', 0, 0);
      if (area >= 17) { C = ctx(); const isl = sizeOf('island'), alongX = room.w >= room.d; const it = { x: room.x + room.w / 2, z: room.z + room.d / 2, w: isl.w, d: isl.d, rot: alongX ? 0 : 90 }; if (free(C, foot(it), 0.5)) { const ii = add('island', it.x, it.z, it.rot, ri); on(ii, 'bowl', 0.4, 0); for (const sg of [-1, 1]) { const f2 = fwd(ii.rot + 0), r2 = rgt(ii.rot); add('stool', ii.x + r2[0] * sg * 0.5 + f2[0] * 0.65, ii.z + r2[1] * sg * 0.5 + f2[1] * 0.65, ii.rot, ri, { w: 0.4, d: 0.4, h: 0.72 }); } add('pendant', ii.x, ii.z, 0, ri, { y: 1.7, a: 'hang' }); } }
      corner('plant_small', null);
    } else if (t === 'bedroom') {
      const bedT = area >= 15 ? 'bed_k' : (Math.min(room.w, room.d) >= 3.2 || area >= 11) ? 'bed_q' : 'bed_s', sp = sizeOf(bedT);
      C = ctx(); const spots = wallSpots(C, sp.w + 1.0, sp.d, { tall: false });
      const bb = best(spots, c => -Math.abs(c.a - c.cx) * 0.5 + doorsNear(c) * 0.5 - (windowOn(C, c.s, c.a - sp.w / 2, c.a + sp.w / 2) ? 1.5 : 0) - (doorOn(C, c.s) ? 1.5 : 0) + c.len * 0.1);
      let bed = null;
      if (bb) { bed = add(bedT, bb.c.x, bb.c.z, bb.c.rot, ri); } else { const sb = best(wallSpots(C, sp.w, sp.d), c => -Math.abs(c.a - c.cx)); if (sb) bed = add(bedT, sb.c.x, sb.c.z, sb.c.rot, ri); }
      if (bed) {
        const r = rgt(bed.rot), f = fwd(bed.rot);
        for (const sg of [-1, 1]) { const ns = sizeOf('side'), nx = bed.x + r[0] * sg * (bed.w / 2 + 0.3) - f[0] * (bed.d / 2 - 0.25), nz = bed.z + r[1] * sg * (bed.w / 2 + 0.3) - f[1] * (bed.d / 2 - 0.25); const it = { x: nx, z: nz, w: 0.5, d: 0.4, rot: bed.rot }; if (free(ctx(), foot(it), 0.0) && (sg > 0 || bedT !== 'bed_s')) { const n1 = add('side', nx, nz, bed.rot, ri, { w: 0.5, d: 0.4, h: 0.5 }); on(n1, 'tablelamp'); } }
        add('rug_m', bed.x + f[0] * 0.5, bed.z + f[1] * 0.5, bed.rot, ri, { a: 'floor', w: Math.min(2.4, bed.w + 0.8), d: 1.6 });
        above(bed, 'wallart', 1.35);
      }
      wallItem('wardrobe', { score: c => -doorsNear(c) * -0.2 + c.len * 0.05 - (bed && dist(c, bed) < 1.2 ? 2 : 0) });
      if (area >= 11) { const d = wallItem('dresser'); if (d) { above(d, 'mirror', 0.95); } }
      if (area >= 13) wallItem('bench', { score: c => (bed ? -Math.abs(c.a - bed.x * (c.s.ori === 'h' ? 1 : 0) - bed.z * (c.s.ori === 'v' ? 1 : 0)) : 0) });
      corner('plant_med'); if (area >= 14) corner('armchair'); ceilCenter('ceilingfan');
    } else if (t === 'bathroom') {
      const basin = A.fixtures.find(f => f.room === ri && f.kind === 'basin'), sh = A.fixtures.find(f => f.room === ri && f.kind === 'shower');
      if (basin && (basin.nx || basin.nz)) { const rot = rotOf(basin.nx, basin.nz); add('mirror', basin.px, basin.pz, rot, ri, { y: 1.15, w: Math.max(0.6, basin.w + 0.1), d: 0.04, h: 0.85 }); add('bathmat', basin.x + basin.nx * 0.55, basin.z + basin.nz * 0.55, rot, ri, { a: 'floor', w: 0.7, d: 0.45 }); }
      wallItem('towelrail', { only: s => true, score: c => c.len * 0.05 });
      const tr = out.filter(o => o.type === 'towelrail')[0]; if (tr) { tr.y = 1.0; }
      if (area >= 5) corner('hamper'); if (area >= 6) corner('plant_med');
    } else if (t === 'laundry') {
      wallItem('shelf', { score: c => c.len }); const sh = out.filter(o => o.type === 'shelf')[0]; if (sh) { sh.y = 1.6; sh.a = 'wallhigh'; }
      corner('hamper');
    } else if (t === 'office') {
      C = ctx(); const sp = sizeOf('desk'), spots = wallSpots(C, sp.w, sp.d, {});
      const db = best(spots, c => (windowOn(C, c.s, c.s.a0, c.s.a1) ? 2 : 0) - doorOn(C, c.s) * 1 + c.len * 0.05 - Math.abs(c.a - c.cx) * 0.2);
      if (db) { const desk = add('desk', db.c.x, db.c.z, db.c.rot, ri); const f = fwd(desk.rot); add('officechair', desk.x + f[0] * 0.75, desk.z + f[1] * 0.75, desk.rot + 180, ri); on(desk, 'tablelamp', 0.55, -0.1); add('rug_m', desk.x + f[0] * 0.9, desk.z + f[1] * 0.9, desk.rot, ri, { a: 'floor', w: 1.8, d: 1.3 }); above(desk, 'wallart', 1.4); }
      wallItem('bookcase'); wallItem('filing'); corner('plant_big'); ceilCenter('ceilingfan');
    } else if (t === 'hall') {
      const lg = Math.max(room.w, room.d);
      wallItem('console', { score: c => c.len * 0.1 }); const cn = out.filter(o => o.type === 'console')[0]; if (cn) { above(cn, 'mirror', 0.95); on(cn, 'vase'); }
      if (lg >= 3) wallItem('shoerack'); corner('plant_med');
      C = ctx(); const rn = sizeOf('runner'); const it = { x: room.x + room.w / 2, z: room.z + room.d / 2, w: room.w >= room.d ? rn.d : rn.w, d: room.w >= room.d ? rn.w : rn.d, rot: 0 }; if (lg >= 3 && inside(room, foot(it))) add('runner', it.x, it.z, room.w >= room.d ? 90 : 0, ri, { a: 'floor' });
    } else if (t === 'garage') {
      const alongX = room.w >= room.d, car = sizeOf('car'); add('car', room.x + room.w / 2, room.z + room.d / 2, alongX ? 90 : 180, ri, { w: car.w, d: car.d });
      wallItem('shelving', { only: s => s.nz !== 1 || true }); wallItem('workbench'); wallItem('bike');
    }
  });
  return out;
}
/* signature of a room: if it changes, its furniture is dropped and placed again */
export const roomSig = (r) => [r.type, r.x, r.z, r.w, r.d].join(',');

/* ------------------------------------------------------------------ adding one item by hand ------------------------------------------------------------------ */
const ON_SURFACES = ['coffee', 'side', 'dining4', 'dining6', 'dining8', 'desk', 'sideboard', 'console', 'kcab', 'island', 'dresser', 'tvunit'];
const HIGH_Y = { sconce: 1.75, inwall: 0.45, picturelight: 2.0, wallart: 1.4, mirror: 0.95, clock: 1.8, shelf: 1.5, towelrail: 1.0, ucab: 1.45, hood: 1.55 };
/* find a spot for a new item in room index ri. Returns a ready item, or null if there is no room. */
export function placeNew(A, level, items, ri, type) {
  const room = A.design.rooms[ri], spec = ITEMS[type], a = spec.a, w = spec.w, d = spec.d;
  const mk = (x, z, rot, extra) => Object.assign({ type, level, roomId: room.id, x, z, rot: nrm(rot), w, d, h: spec.h, y: 0, a, auto: false }, extra || {});
  const C = context(A, ri, items), cx = room.x + room.w / 2, cz = room.z + room.d / 2;
  if (a === 'wall') { const sp = wallSpots(C, w, d, { tall: spec.h > 0.9 }); if (!sp.length) return null; const b = best(sp, c => c.len * 0.1 - Math.abs(c.a - c.cx) * 0.2); return mk(b.c.x, b.c.z, b.c.rot); }
  if (a === 'wallhigh') { const C0 = context(A, ri, items.filter(i => i.a === 'wallhigh')); const sp = wallSpots(C0, w, d, {}); if (!sp.length) return null; const b = best(sp, c => c.len * 0.1 - Math.abs(c.a - c.cx) * 0.2); return mk(b.c.x, b.c.z, b.c.rot, { y: HIGH_Y[type] || 1.4 }); }
  if (a === 'corner') { const cs = cornerSpots(C, w, d); if (!cs.length) return null; return mk(cs[0].x, cs[0].z, cs[0].rot); }
  if (a === 'free' || a === 'center') {
    for (let r = 0; r <= Math.max(room.w, room.d); r += 0.25) for (let k = 0; k < (r === 0 ? 1 : 16); k++) { const ang = k / 16 * 6.283, x = cx + Math.cos(ang) * r, z = cz + Math.sin(ang) * r; for (const rot of [0, 90]) { const it = { x, z, w, d, rot }; if (free(C, foot(it), 0.1)) return mk(x, z, rot); } }
    return null;
  }
  if (a === 'floor') return mk(cx, cz, room.w >= room.d ? 0 : 90, {});
  if (a === 'ceiling') return mk(cx, cz, 0, { h: 2.7 });
  if (a === 'hang') return mk(cx, cz, 0, { y: 1.7 });
  if (a === 'on') { const p = items.find(i => i.roomId === room.id && ON_SURFACES.includes(i.type) && !items.some(o => o.on === i.id && o.type === type)); if (!p) return null; return mk(p.x, p.z, p.rot, { y: p.h, on: p.id }); }
  if (a === 'window') { const wn = C.windows.find(q => !items.some(i => i.win === q.id)); if (!wn) return null; const s = sidesOf(room).find(q => q.ori === wn.ori && Math.abs((wn.ori === 'h' ? wn.z : wn.x) - q.fix) < 1e-6); if (!s) return null; return mk(wn.ori === 'h' ? wn.x : s.fix + s.nx * 0.09, wn.ori === 'h' ? s.fix + s.nz * 0.09 : wn.z, rotOf(s.nx, s.nz), { w: wn.w + 0.7, h: 2.45, d: 0.1, win: wn.id }); }
  return null;
}
