-- ComidaSmart Database Schema
-- This is the source SQL schema that the Prisma schema is based on
-- Used for reference and manual database setup

CREATE TABLE IF NOT EXISTS brands (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sub_brands (
    id SERIAL PRIMARY KEY,
    brand_id INTEGER REFERENCES brands(id),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stores (
    id SERIAL PRIMARY KEY,
    brand_id INTEGER REFERENCES brands(id),
    sub_brand_id INTEGER REFERENCES sub_brands(id),
    name VARCHAR(255) NOT NULL,
    city VARCHAR(100),
    state VARCHAR(2),
    district VARCHAR(100),
    address_street VARCHAR(200),
    address_number INTEGER,
    zipcode VARCHAR(10),
    latitude DECIMAL(9,6),
    longitude DECIMAL(9,6),
    is_active BOOLEAN DEFAULT true,
    is_own BOOLEAN DEFAULT false,
    is_holding BOOLEAN DEFAULT false,
    creation_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS channels (
    id SERIAL PRIMARY KEY,
    brand_id INTEGER REFERENCES brands(id),
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    type CHAR(1) CHECK (type IN ('P', 'D')),  -- P=Presencial, D=Delivery
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    brand_id INTEGER REFERENCES brands(id),
    sub_brand_id INTEGER REFERENCES sub_brands(id),
    name VARCHAR(200) NOT NULL,
    type CHAR(1) DEFAULT 'P',  -- P=Produto, I=Item
    pos_uuid VARCHAR(100),
    deleted_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    brand_id INTEGER REFERENCES brands(id),
    sub_brand_id INTEGER REFERENCES sub_brands(id),
    category_id INTEGER REFERENCES categories(id),
    name VARCHAR(500) NOT NULL,
    pos_uuid VARCHAR(100),
    deleted_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS option_groups (
    id SERIAL PRIMARY KEY,
    brand_id INTEGER REFERENCES brands(id),
    sub_brand_id INTEGER REFERENCES sub_brands(id),
    category_id INTEGER REFERENCES categories(id),
    name VARCHAR(500) NOT NULL,
    pos_uuid VARCHAR(100),
    deleted_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS items (
    id SERIAL PRIMARY KEY,
    brand_id INTEGER REFERENCES brands(id),
    sub_brand_id INTEGER REFERENCES sub_brands(id),
    category_id INTEGER REFERENCES categories(id),
    name VARCHAR(500) NOT NULL,
    pos_uuid VARCHAR(100),
    deleted_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    customer_name VARCHAR(100),
    email VARCHAR(100),
    phone_number VARCHAR(50),
    cpf VARCHAR(100),
    birth_date DATE,
    gender VARCHAR(10),
    store_id INTEGER REFERENCES stores(id),
    sub_brand_id INTEGER REFERENCES sub_brands(id),
    registration_origin VARCHAR(20),
    agree_terms BOOLEAN DEFAULT false,
    receive_promotions_email BOOLEAN DEFAULT false,
    receive_promotions_sms BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sales (
    id SERIAL PRIMARY KEY,
    store_id INTEGER NOT NULL REFERENCES stores(id),
    sub_brand_id INTEGER REFERENCES sub_brands(id),
    customer_id INTEGER REFERENCES customers(id),
    channel_id INTEGER NOT NULL REFERENCES channels(id),
    
    cod_sale1 VARCHAR(100),  -- External order ID
    cod_sale2 VARCHAR(100),
    created_at TIMESTAMP NOT NULL,
    customer_name VARCHAR(100),
    sale_status_desc VARCHAR(100) NOT NULL,
    
    -- Financial values
    total_amount_items DECIMAL(10,2) NOT NULL,
    total_discount DECIMAL(10,2) DEFAULT 0,
    total_increase DECIMAL(10,2) DEFAULT 0,
    delivery_fee DECIMAL(10,2) DEFAULT 0,
    service_tax_fee DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    value_paid DECIMAL(10,2) DEFAULT 0,
    
    -- Operational metrics
    production_seconds INTEGER,
    delivery_seconds INTEGER,
    people_quantity INTEGER,
    
    -- Metadata
    discount_reason VARCHAR(300),
    increase_reason VARCHAR(300),
    origin VARCHAR(100) DEFAULT 'POS'
);

CREATE TABLE IF NOT EXISTS product_sales (
    id SERIAL PRIMARY KEY,
    sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity FLOAT NOT NULL,
    base_price FLOAT NOT NULL,
    total_price FLOAT NOT NULL,
    observations VARCHAR(300)
);

CREATE TABLE IF NOT EXISTS item_product_sales (
    id SERIAL PRIMARY KEY,
    product_sale_id INTEGER NOT NULL REFERENCES product_sales(id) ON DELETE CASCADE,
    item_id INTEGER NOT NULL REFERENCES items(id),
    option_group_id INTEGER REFERENCES option_groups(id),
    quantity FLOAT NOT NULL,
    additional_price FLOAT NOT NULL,
    price FLOAT NOT NULL,
    amount FLOAT DEFAULT 1,
    observations VARCHAR(300)
);

CREATE TABLE IF NOT EXISTS item_item_product_sales (
    id SERIAL PRIMARY KEY,
    item_product_sale_id INTEGER NOT NULL REFERENCES item_product_sales(id) ON DELETE CASCADE,
    item_id INTEGER NOT NULL REFERENCES items(id),
    option_group_id INTEGER REFERENCES option_groups(id),
    quantity FLOAT NOT NULL,
    additional_price FLOAT NOT NULL,
    price FLOAT NOT NULL,
    amount FLOAT DEFAULT 1
);

CREATE TABLE IF NOT EXISTS delivery_sales (
    id SERIAL PRIMARY KEY,
    sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    courier_id VARCHAR(100),
    courier_name VARCHAR(100),
    courier_phone VARCHAR(100),
    courier_type VARCHAR(100),
    delivered_by VARCHAR(100),
    delivery_type VARCHAR(100),
    status VARCHAR(100),
    delivery_fee FLOAT,
    courier_fee FLOAT,
    timing VARCHAR(100),
    mode VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS delivery_addresses (
    id SERIAL PRIMARY KEY,
    sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    delivery_sale_id INTEGER REFERENCES delivery_sales(id) ON DELETE CASCADE,
    street VARCHAR(200),
    number VARCHAR(20),
    complement VARCHAR(200),
    formatted_address VARCHAR(500),
    neighborhood VARCHAR(100),
    city VARCHAR(100),
    state VARCHAR(50),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    reference VARCHAR(300),
    latitude FLOAT,
    longitude FLOAT
);

CREATE TABLE IF NOT EXISTS payment_types (
    id SERIAL PRIMARY KEY,
    brand_id INTEGER REFERENCES brands(id),
    description VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    payment_type_id INTEGER REFERENCES payment_types(id),
    value DECIMAL(10,2) NOT NULL,
    is_online BOOLEAN DEFAULT false,
    description VARCHAR(100),
    currency VARCHAR(10) DEFAULT 'BRL'
);

CREATE TABLE IF NOT EXISTS coupons (
    id SERIAL PRIMARY KEY,
    brand_id INTEGER REFERENCES brands(id),
    code VARCHAR(50) NOT NULL,
    discount_type VARCHAR(1),  -- 'p' percentage, 'f' fixed
    discount_value DECIMAL(10,2),
    is_active BOOLEAN DEFAULT true,
    valid_from TIMESTAMP,
    valid_until TIMESTAMP
);

CREATE TABLE IF NOT EXISTS coupon_sales (
    id SERIAL PRIMARY KEY,
    sale_id INTEGER REFERENCES sales(id) ON DELETE CASCADE,
    coupon_id INTEGER REFERENCES coupons(id),
    value FLOAT,
    target VARCHAR(100),
    sponsorship VARCHAR(100)
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_store_id ON sales(store_id);
CREATE INDEX IF NOT EXISTS idx_sales_channel_id ON sales(channel_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_product_sales_sale_id ON product_sales(sale_id);
CREATE INDEX IF NOT EXISTS idx_product_sales_product_id ON product_sales(product_id);
CREATE INDEX IF NOT EXISTS idx_delivery_addresses_sale_id ON delivery_addresses(sale_id);
CREATE INDEX IF NOT EXISTS idx_delivery_addresses_city ON delivery_addresses(city);
CREATE INDEX IF NOT EXISTS idx_delivery_addresses_state ON delivery_addresses(state);
