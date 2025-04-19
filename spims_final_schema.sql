
-- TENANTS TABLE
CREATE TABLE tenants (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    domain TEXT,
    plan TEXT DEFAULT 'free',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- USERS TABLE
CREATE TABLE users (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    name TEXT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT CHECK (role IN ('admin', 'supervisor', 'operator')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- BRANDS TABLE
CREATE TABLE brands (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT,
    description TEXT
);

-- SUPPLIERS TABLE
CREATE TABLE suppliers (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    contact TEXT,
    email TEXT,
    address TEXT
);

-- BLENDS TABLE
CREATE TABLE blends (
    id UUID PRIMARY KEY,
    blend_code TEXT,
    description TEXT
);

-- SHADES TABLE
CREATE TABLE shades (
    id UUID PRIMARY KEY,
    shade_code TEXT,
    brand_id UUID REFERENCES brands(id),
    blend_id UUID REFERENCES blends(id),
    shade_name TEXT,
    percentage TEXT,
    available_stock_kg DECIMAL(10, 2)
);

-- YARN TYPES TABLE
CREATE TABLE yarn_types (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- YARNS TABLE
CREATE TABLE yarns (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    yarn_type_id UUID REFERENCES yarn_types(id),
    blend_id UUID REFERENCES blends(id),
    count_range TEXT,
    base_shade TEXT,
    special_effect TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- YARN MAPPINGS TABLE
CREATE TABLE yarn_mappings (
    id UUID PRIMARY KEY,
    count TEXT,
    brand_id UUID REFERENCES brands(id),
    blend_id UUID REFERENCES blends(id),
    shade_id UUID REFERENCES shades(id),
    yarn_type_id UUID REFERENCES yarn_types(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ORDERS TABLE
CREATE TABLE orders (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    order_number TEXT UNIQUE,
    buyer_name TEXT,
    yarn_id UUID REFERENCES yarns(id),
    quantity_kg INTEGER,
    delivery_date DATE,
    status TEXT CHECK (status IN ('pending', 'in_progress', 'dispatched')),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PRODUCTION TABLE
CREATE TABLE production (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    date DATE NOT NULL,
    section TEXT CHECK (section IN (
        'blow_room', 'carding', 'drawing', 'framing',
        'simplex', 'spinning', 'autoconer', 'cone')),
    shift TEXT CHECK (shift IN ('IST', 'IInd', 'IIIrd')),
    value DECIMAL(10, 2),
    linked_order_id UUID REFERENCES orders(id),
    entered_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- MACHINES TABLE (Optional)
CREATE TABLE machines (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    section TEXT,
    machine_code TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- FILE STORAGE TABLE
CREATE TABLE files (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    file_url TEXT,
    file_type TEXT,
    linked_yarn_id UUID REFERENCES yarns(id),
    uploaded_by UUID REFERENCES users(id),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SUBSCRIPTIONS TABLE (Future Use)
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    plan_type TEXT,
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT TRUE
);
