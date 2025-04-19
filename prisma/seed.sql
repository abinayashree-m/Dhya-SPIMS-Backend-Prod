-- 🌱 Insert Fibres
INSERT INTO "fibres" (id, fibre_name, fibre_code, stock_kg)
VALUES
  (gen_random_uuid(), 'Cotton', 'J1211 - Cotton', 1200.00),
  (gen_random_uuid(), 'Polyester', 'P4422 - Poly', 850.00),
  (gen_random_uuid(), 'Viscose', 'V3300 - Viscose', 600.00);

-- 🌱 Insert Blends
INSERT INTO "blends" (id, blend_code, description)
VALUES
  (gen_random_uuid(), 'BLND001', 'Cotton 70% + Poly 30%'),
  (gen_random_uuid(), 'BLND002', 'Poly 60% + Viscose 40%');

-- 📌 Get the UUIDs of blends and fibres to insert blend_fibres
-- For demo: select those values manually or use code-based seeding

-- 🌱 Insert Blend-Fibres Mapping (assuming known UUIDs)
-- Replace with correct UUIDs if you're copying into your DB

-- Example for BLND001: Cotton 70%, Poly 30%
INSERT INTO "blend_fibres" (id, blend_id, fibre_id, percentage)
VALUES
  (gen_random_uuid(), (SELECT id FROM blends WHERE blend_code = 'BLND001'), (SELECT id FROM fibres WHERE fibre_name = 'Cotton'), 70),
  (gen_random_uuid(), (SELECT id FROM blends WHERE blend_code = 'BLND001'), (SELECT id FROM fibres WHERE fibre_name = 'Polyester'), 30);

-- Example for BLND002: Poly 60%, Viscose 40%
INSERT INTO "blend_fibres" (id, blend_id, fibre_id, percentage)
VALUES
  (gen_random_uuid(), (SELECT id FROM blends WHERE blend_code = 'BLND002'), (SELECT id FROM fibres WHERE fibre_name = 'Polyester'), 60),
  (gen_random_uuid(), (SELECT id FROM blends WHERE blend_code = 'BLND002'), (SELECT id FROM fibres WHERE fibre_name = 'Viscose'), 40);

-- 🌱 Insert Shades mapped to blends
INSERT INTO "shades" (id, shade_code, shade_name, blend_id, available_stock_kg)
VALUES
  (gen_random_uuid(), '11538', 'Light Grey', (SELECT id FROM blends WHERE blend_code = 'BLND001'), 300.00),
  (gen_random_uuid(), '11942', 'Soft Beige', (SELECT id FROM blends WHERE blend_code = 'BLND002'), 150.00);