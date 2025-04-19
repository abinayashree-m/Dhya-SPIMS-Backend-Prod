
-- Insert Tenant
INSERT INTO tenants (id, name, domain) VALUES
('3bf9bed5-d468-47c5-9c19-61a7e37faedc', 'NSC Spinning Mills', 'nscspinning.com');

-- Insert Admin User
INSERT INTO users (id, tenant_id, name, email, password_hash, role) VALUES
('23bdb038-b8f6-445d-9fd6-0c4c53cb0a52', '3bf9bed5-d468-47c5-9c19-61a7e37faedc', 'Dharsan Kumar', 'admin@nscspinning.com', '$2b$10$samplehash', 'admin');

-- Insert Brand
INSERT INTO brands (id, name, type, description) VALUES
('6d9afb56-5598-4a25-84b5-0e8b8b9d3dbd', 'NSC Regular', 'Melange', 'Standard NSC melange yarn');

-- Insert Supplier
INSERT INTO suppliers (id, name, contact, email, address) VALUES
('9a14f2aa-1b5c-48b1-bfc8-0b42e3f5f357', 'Super Supplier Co.', '+91-9876543210', 'supply@nsc.com', 'Coimbatore, TN');

-- Insert Blend
INSERT INTO blends (id, blend_code, description) VALUES
('9d52e8fd-ed68-4be6-aed1-35a56c52e1ba', '52C/48P', '52% Cotton, 48% Polyester');

-- Insert Shade
INSERT INTO shades (id, shade_code, brand_id, blend_id, shade_name, percentage, available_stock_kg) VALUES
('b8b08e26-8493-451e-95f6-a300c3e4805c', 'LT-GREY', '6d9afb56-5598-4a25-84b5-0e8b8b9d3dbd', '9d52e8fd-ed68-4be6-aed1-35a56c52e1ba', 'Light Grey Melange', '52C/48P', 1200.50);

-- Insert Yarn Type
INSERT INTO yarn_types (id, name, category) VALUES
('b014a7a4-9f8a-403c-a641-bda8a74d76f9', 'Grindle Yarn', 'Fancy');

-- Insert Yarn
INSERT INTO yarns (id, tenant_id, yarn_type_id, blend_id, count_range, base_shade, special_effect) VALUES
('131ca35b-6eae-4f90-860e-89f992429362', '3bf9bed5-d468-47c5-9c19-61a7e37faedc', 'b014a7a4-9f8a-403c-a641-bda8a74d76f9', '9d52e8fd-ed68-4be6-aed1-35a56c52e1ba', '25s–40s', 'LT-GREY', 'Slub');

-- Insert Yarn Mapping
INSERT INTO yarn_mappings (id, count, brand_id, blend_id, shade_id, yarn_type_id) VALUES
('bad5cf35-ae74-4c9f-9d5a-064d58db1aaf', '30s', '6d9afb56-5598-4a25-84b5-0e8b8b9d3dbd', '9d52e8fd-ed68-4be6-aed1-35a56c52e1ba', 'b8b08e26-8493-451e-95f6-a300c3e4805c', 'b014a7a4-9f8a-403c-a641-bda8a74d76f9');

-- Insert Order
INSERT INTO orders (id, tenant_id, order_number, buyer_name, yarn_id, quantity_kg, delivery_date, status, created_by) VALUES
('3681f9a4-7c55-4ced-8fdb-04c8e0198a8f', '3bf9bed5-d468-47c5-9c19-61a7e37faedc', 'SO-1001', 'TexWorld Exports', '131ca35b-6eae-4f90-860e-89f992429362', 2500, '2025-04-04', 'pending', '23bdb038-b8f6-445d-9fd6-0c4c53cb0a52');

-- Insert Production
INSERT INTO production (id, tenant_id, date, section, shift, value, linked_order_id, entered_by) VALUES
('067a419b-1c34-4b20-a56c-bd3d0e161f29', '3bf9bed5-d468-47c5-9c19-61a7e37faedc', '2025-03-25', 'spinning', 'IST', 400.50, '3681f9a4-7c55-4ced-8fdb-04c8e0198a8f', '23bdb038-b8f6-445d-9fd6-0c4c53cb0a52');

-- Insert Machine
INSERT INTO machines (id, tenant_id, section, machine_code, description) VALUES
('e2144aa8-bab3-4355-a108-75f5981b2d42', '3bf9bed5-d468-47c5-9c19-61a7e37faedc', 'spinning', 'SP-1001', 'LR60A spinning machine');

-- Insert File (optional)
INSERT INTO files (id, tenant_id, file_url, file_type, linked_yarn_id, uploaded_by) VALUES
('04b0f299-1ca5-4905-a985-381d5d03558b', '3bf9bed5-d468-47c5-9c19-61a7e37faedc', 'https://wasabi-bucket/path/shadecard.jpg', 'shade_card', '131ca35b-6eae-4f90-860e-89f992429362', '23bdb038-b8f6-445d-9fd6-0c4c53cb0a52');
