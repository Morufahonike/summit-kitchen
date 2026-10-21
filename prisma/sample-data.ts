// SAMPLE CATALOGUE — placeholder products for development only.
// None of these are real supplier listings; every product is seeded with isSample = true
// and is shown with a "Sample" badge on the storefront. Replace once a supplier is approved.

export type Art =
  | "dutchOven" | "saucepan" | "skillet" | "stockpot"
  | "knife" | "knifeBlock" | "board"
  | "spoon" | "utensilCrock" | "whisk" | "tongs"
  | "jar" | "canisters" | "container"
  | "kettle" | "toaster" | "blender" | "scale"
  | "bowls" | "grater" | "measuring" | "mortar"
  | "cruet" | "mitt" | "saltCellar" | "trivet";

export type SampleCategory = { slug: string; name: string; description: string };
export type SampleProduct = {
  slug: string;
  sku: string;
  name: string;
  category: string;
  priceUsd: number;
  compareAtUsd?: number;
  stock: number;
  material: string;
  short: string;
  description: string;
  features: string[];
  featured?: boolean;
  art: Art;
  tone: string; // main object colour for the illustration
};

export const categories: SampleCategory[] = [
  { slug: "cookware", name: "Cookware", description: "Enamelled cast iron, tri-ply stainless and carbon steel built for daily cooking." },
  { slug: "utensils", name: "Utensils", description: "Considered tools in olive wood, stainless steel and silicone." },
  { slug: "knives-cutting-boards", name: "Knives & Cutting Boards", description: "Balanced blades and end-grain boards for precise prep." },
  { slug: "appliances", name: "Appliances", description: "Countertop appliances with clean lines and dependable performance." },
  { slug: "food-preparation", name: "Food Preparation", description: "Bowls, graters, measures and the essentials of mise en place." },
  { slug: "food-storage", name: "Food Storage", description: "Glass, ceramic and stainless storage that keeps the pantry calm." },
  { slug: "premium-accessories", name: "Premium Accessories", description: "Finishing touches for the table and the stove." },
];

const SAGE = "#7A8F6B", OLIVE = "#556B3F", FOREST = "#2F3B2A", CHAR = "#2C2C2C", GOLD = "#C9A96A", TAUPE = "#D5CBB8", IVORY = "#EFE8DA", STEEL = "#A9ADA8", WOOD = "#B88A5A", CREAM = "#E9E1CF";

export const products: SampleProduct[] = [
  // Cookware
  { slug: "heritage-enamelled-dutch-oven-5-5l", sku: "SK-CW-001", name: "Heritage Enamelled Dutch Oven 5.5L", category: "cookware", priceUsd: 189, compareAtUsd: 229, stock: 24, material: "Enamelled cast iron", short: "Slow-cook, braise and bake in one heirloom-grade pot.", description: "A generously sized round casserole with a satin black interior enamel that browns beautifully and improves with use. The tight-fitting lid recirculates moisture for tender braises, while the brass-tone knob is oven-safe to 260°C.", features: ["Suitable for all hobs including induction", "Oven-safe to 260°C", "Chip-resistant enamel", "Lifetime structural warranty (sample terms)"], featured: true, art: "dutchOven", tone: FOREST },
  { slug: "heritage-dutch-oven-3-2l-sage", sku: "SK-CW-002", name: "Heritage Dutch Oven 3.2L — Sage", category: "cookware", priceUsd: 149, stock: 18, material: "Enamelled cast iron", short: "The everyday size for stews, rice and sourdough.", description: "Our compact Dutch oven in a soft sage glaze. Even heat retention makes it ideal for jollof, stews and loaves alike.", features: ["Induction compatible", "Oven-safe to 260°C", "Light-coloured interior to monitor browning"], featured: true, art: "dutchOven", tone: SAGE },
  { slug: "tri-ply-stainless-saucepan-2l", sku: "SK-CW-003", name: "Tri-Ply Stainless Saucepan 2L", category: "cookware", priceUsd: 79, stock: 40, material: "18/10 stainless steel, aluminium core", short: "Fast, even heating with a stay-cool handle.", description: "A fully clad saucepan with a precision-pour rim and a tempered glass lid. Ideal for sauces, grains and custards.", features: ["Tri-ply construction", "Dishwasher safe", "Induction ready"], art: "saucepan", tone: STEEL },
  { slug: "carbon-steel-skillet-28cm", sku: "SK-CW-004", name: "Carbon Steel Skillet 28cm", category: "cookware", priceUsd: 65, stock: 30, material: "Pre-seasoned carbon steel", short: "Restaurant searing performance, lighter than cast iron.", description: "Pre-seasoned and ready to use, this skillet develops a natural non-stick patina. Riveted handle, oven-safe at any temperature.", features: ["Pre-seasoned", "Oven and grill safe", "Naturally non-stick with use"], featured: true, art: "skillet", tone: CHAR },
  { slug: "enamelled-stockpot-8l", sku: "SK-CW-005", name: "Enamelled Stockpot 8L", category: "cookware", priceUsd: 129, stock: 12, material: "Enamel on carbon steel", short: "Large-batch soups and stocks, beautifully finished.", description: "A tall stockpot with an ivory enamel finish and champagne-tone handles. Light enough to lift when full.", features: ["8 litre capacity", "All hobs", "Ivory enamel finish"], art: "stockpot", tone: CREAM },
  { slug: "nonstick-ceramic-frypan-24cm", sku: "SK-CW-006", name: "Ceramic Non-Stick Frypan 24cm", category: "cookware", priceUsd: 55, stock: 4, material: "Aluminium with ceramic coating", short: "PFAS-free ceramic coating for eggs and delicate fish.", description: "A lightweight frypan with a slick ceramic surface and an olive-wood effect handle.", features: ["PFAS-free coating", "Induction base", "Low stock example item"], art: "skillet", tone: OLIVE },

  // Utensils
  { slug: "olive-wood-spoon-set", sku: "SK-UT-001", name: "Olive Wood Spoon Set of 3", category: "utensils", priceUsd: 39, stock: 60, material: "Olive wood", short: "Hand-finished spoons with beautiful natural grain.", description: "A trio of stirring, slotted and tasting spoons cut from a single olive wood branch. Gentle on all cookware.", features: ["Hand-finished", "Safe for non-stick and enamel", "Hand wash and oil occasionally"], featured: true, art: "spoon", tone: WOOD },
  { slug: "stainless-utensil-crock-set", sku: "SK-UT-002", name: "Stainless Utensil Set with Crock", category: "utensils", priceUsd: 89, stock: 22, material: "Stainless steel, ceramic", short: "Six essential tools in a weighted ceramic crock.", description: "Ladle, turner, slotted spoon, spaghetti server, skimmer and solid spoon in brushed stainless steel, presented in a matte ivory crock.", features: ["6 pieces", "Weighted ceramic crock", "Dishwasher safe tools"], art: "utensilCrock", tone: IVORY },
  { slug: "balloon-whisk-30cm", sku: "SK-UT-003", name: "Balloon Whisk 30cm", category: "utensils", priceUsd: 22, stock: 45, material: "Stainless steel", short: "Fine wires for airy creams and smooth sauces.", description: "A well-balanced whisk with 12 fine stainless wires and a sealed handle.", features: ["12 wires", "Sealed handle", "Dishwasher safe"], art: "whisk", tone: STEEL },
  { slug: "precision-locking-tongs", sku: "SK-UT-004", name: "Precision Locking Tongs 30cm", category: "utensils", priceUsd: 24, stock: 38, material: "Stainless steel, silicone tips", short: "Confident grip from grill to plate.", description: "Spring-loaded tongs with heat-resistant silicone tips and a one-hand locking pull tab.", features: ["Heat resistant to 230°C", "Locking mechanism", "Dishwasher safe"], art: "tongs", tone: CHAR },

  // Knives & boards
  { slug: "summit-chefs-knife-20cm", sku: "SK-KN-001", name: "Chef's Knife 20cm", category: "knives-cutting-boards", priceUsd: 119, compareAtUsd: 139, stock: 26, material: "German stainless steel, pakkawood", short: "The one knife you'll reach for every day.", description: "Forged from high-carbon stainless steel and hand-honed to a 15° edge. The full-tang pakkawood handle is balanced right at the bolster.", features: ["15° edge per side", "Full tang", "Hand wash recommended"], featured: true, art: "knife", tone: CHAR },
  { slug: "knife-block-set-6-piece", sku: "SK-KN-002", name: "6-Piece Knife Block Set", category: "knives-cutting-boards", priceUsd: 289, stock: 9, material: "Stainless steel, oak block", short: "Five essential blades with a slanted oak block.", description: "Chef's, bread, santoku, utility and paring knives with honing steel, housed in a solid oak block.", features: ["5 knives + honing steel", "Solid oak block", "Gift boxed"], featured: true, art: "knifeBlock", tone: WOOD },
  { slug: "end-grain-acacia-board-large", sku: "SK-KN-003", name: "End-Grain Acacia Board — Large", category: "knives-cutting-boards", priceUsd: 99, stock: 15, material: "Acacia wood", short: "Kind to blades, built to last generations.", description: "End-grain construction lets fibres part and close around the edge, keeping knives sharper for longer. Juice groove and rubber feet.", features: ["45 × 33 × 4 cm", "Juice groove", "Non-slip feet"], art: "board", tone: WOOD },
  { slug: "paring-knife-9cm", sku: "SK-KN-004", name: "Paring Knife 9cm", category: "knives-cutting-boards", priceUsd: 45, stock: 0, material: "German stainless steel", short: "Nimble control for peeling and detail work.", description: "A compact blade for fruit, garnish and fine work. (Out-of-stock example item.)", features: ["Full tang", "Hand wash recommended"], art: "knife", tone: OLIVE },

  // Appliances
  { slug: "gooseneck-electric-kettle", sku: "SK-AP-001", name: "Gooseneck Electric Kettle 1L", category: "appliances", priceUsd: 99, stock: 20, material: "Stainless steel", short: "Temperature control for tea and pour-over coffee.", description: "Precise variable temperature from 40–100°C, hold function and a counterweighted handle for a controlled pour. (Sample spec — confirm voltage for Nigeria: 220–240V.)", features: ["40–100°C control", "Keep-warm 60 min", "220–240V (sample spec)"], featured: true, art: "kettle", tone: CHAR },
  { slug: "two-slice-toaster-ivory", sku: "SK-AP-002", name: "Two-Slice Toaster — Ivory", category: "appliances", priceUsd: 79, stock: 16, material: "Brushed stainless steel, enamel", short: "Wide slots, seven shades, timeless finish.", description: "Extra-wide slots fit artisan bread; defrost, reheat and bagel functions.", features: ["7 browning levels", "Removable crumb tray", "220–240V (sample spec)"], art: "toaster", tone: CREAM },
  { slug: "high-speed-blender-1-5l", sku: "SK-AP-003", name: "High-Speed Blender 1.5L", category: "appliances", priceUsd: 159, stock: 11, material: "Tritan jar, die-cast base", short: "Smoothies, soups and pepper blends in seconds.", description: "A 1200W motor and six hardened blades make light work of tomato-pepper mixes, smoothies and nut butters.", features: ["1200W motor", "BPA-free jar", "Pulse + 3 programmes"], art: "blender", tone: SAGE },
  { slug: "digital-kitchen-scale", sku: "SK-AP-004", name: "Digital Kitchen Scale", category: "appliances", priceUsd: 35, stock: 50, material: "Tempered glass, stainless steel", short: "Accurate to 1g, slim enough to store anywhere.", description: "Tare function, g/oz/ml units and a backlit display.", features: ["5kg capacity", "Tare function", "Batteries included"], art: "scale", tone: CHAR },

  // Food preparation
  { slug: "nesting-mixing-bowls-set", sku: "SK-FP-001", name: "Nesting Mixing Bowls, Set of 3", category: "food-preparation", priceUsd: 59, stock: 28, material: "Stoneware", short: "Stoneware bowls in sage, taupe and ivory.", description: "Heavy-bottomed bowls that stay put while you whisk, nesting neatly for storage.", features: ["1L, 2L and 3.5L", "Microwave and dishwasher safe"], featured: true, art: "bowls", tone: SAGE },
  { slug: "box-grater-four-sided", sku: "SK-FP-002", name: "Four-Sided Box Grater", category: "food-preparation", priceUsd: 29, stock: 34, material: "Stainless steel", short: "Coarse, fine, slice and zest in one tool.", description: "Photo-etched blades stay sharp; non-slip base and comfortable handle.", features: ["4 grating surfaces", "Non-slip base"], art: "grater", tone: STEEL },
  { slug: "brass-measuring-cups", sku: "SK-FP-003", name: "Champagne Measuring Cups", category: "food-preparation", priceUsd: 34, stock: 25, material: "Stainless steel, champagne finish", short: "Four cups in a warm champagne finish.", description: "Engraved metric and US markings. Nests and hangs on the included ring.", features: ["¼, ⅓, ½, 1 cup", "Metric + US markings"], art: "measuring", tone: GOLD },
  { slug: "granite-mortar-and-pestle", sku: "SK-FP-004", name: "Granite Mortar & Pestle", category: "food-preparation", priceUsd: 45, stock: 14, material: "Granite", short: "For spice pastes, pepper blends and pesto.", description: "Unpolished interior grips ingredients for fast, fragrant grinding.", features: ["Heavy granite", "15cm diameter"], art: "mortar", tone: CHAR },

  // Storage
  { slug: "glass-pantry-jars-set", sku: "SK-FS-001", name: "Glass Pantry Jars with Acacia Lids, Set of 4", category: "food-storage", priceUsd: 69, stock: 30, material: "Borosilicate glass, acacia", short: "Airtight storage that looks good on open shelves.", description: "Silicone-sealed acacia lids keep grains, beans and spices fresh.", features: ["4 × 1.2L", "Airtight silicone seal", "Dishwasher-safe glass"], featured: true, art: "jar", tone: WOOD },
  { slug: "ceramic-canister-trio", sku: "SK-FS-002", name: "Ceramic Canister Trio", category: "food-storage", priceUsd: 75, stock: 17, material: "Ceramic, bamboo", short: "Sugar, coffee and tea in matte stoneware.", description: "A coordinated trio in ivory, sage and taupe with bamboo lids.", features: ["3 sizes", "Bamboo lids with seal"], art: "canisters", tone: SAGE },
  { slug: "stainless-meal-prep-containers", sku: "SK-FS-003", name: "Stainless Meal Prep Containers, Set of 5", category: "food-storage", priceUsd: 49, stock: 42, material: "Stainless steel, silicone", short: "Plastic-free, leak-resistant, stackable.", description: "Clip-lock lids for leftovers and lunches; freezer safe.", features: ["5 sizes", "Leak-resistant lids", "Freezer safe"], art: "container", tone: STEEL },

  // Accessories
  { slug: "olive-oil-cruet", sku: "SK-AC-001", name: "Glass Olive Oil Cruet", category: "premium-accessories", priceUsd: 32, stock: 33, material: "Glass, stainless steel", short: "Drip-free pour spout, 500ml.", description: "Weighted glass bottle with a precise pourer for oils and vinegars.", features: ["500ml", "Drip-free spout"], art: "cruet", tone: OLIVE },
  { slug: "linen-oven-mitt-pair", sku: "SK-AC-002", name: "Linen Oven Mitts, Pair", category: "premium-accessories", priceUsd: 36, stock: 27, material: "Linen, cotton lining", short: "Heat protection in washed linen.", description: "Quilted linen mitts with a heat-resistant lining and hanging loop.", features: ["Pair", "Machine washable"], art: "mitt", tone: SAGE },
  { slug: "acacia-salt-cellar", sku: "SK-AC-003", name: "Acacia Salt Cellar", category: "premium-accessories", priceUsd: 28, stock: 40, material: "Acacia wood", short: "Swivel lid keeps salt within pinch's reach.", description: "A small acacia cellar with a magnetic swivel lid.", features: ["Magnetic swivel lid", "Hand wash"], art: "saltCellar", tone: WOOD },
  { slug: "cast-iron-trivet-gold", sku: "SK-AC-004", name: "Cast Iron Trivet — Champagne", category: "premium-accessories", priceUsd: 42, stock: 3, material: "Cast iron", short: "A sculptural mountain-motif trivet.", description: "Protects tables from hot pots; felt-padded feet. (Low-stock example item.)", features: ["Felt feet", "20cm"], art: "trivet", tone: GOLD },
];

export const palette = { SAGE, OLIVE, FOREST, CHAR, GOLD, TAUPE, IVORY, STEEL, WOOD, CREAM };
