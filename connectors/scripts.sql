

-- ============================================
-- 1. Drop schema if exists
-- ============================================
DROP SCHEMA IF EXISTS foodtruck CASCADE;

-- ============================================
-- 2. Create schema
-- ============================================
CREATE SCHEMA foodtruck;

-- ============================================
-- 3. Create Tables (lowercase names)
-- ============================================

-- Users Table
CREATE TABLE foodtruck.users (
    userid SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'customer',
    status TEXT DEFAULT 'active',
    birthdate DATE DEFAULT CURRENT_DATE,
    createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trucks Table
CREATE TABLE foodtruck.trucks (
    truckid SERIAL PRIMARY KEY,
    truckname TEXT NOT NULL UNIQUE,
    trucklogo TEXT,
    ownerid INTEGER REFERENCES foodtruck.users(userid),
    truckstatus TEXT DEFAULT 'available',
    orderstatus TEXT DEFAULT 'available',
    createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- MenuItems Table
CREATE TABLE foodtruck.menuitems (
    itemid SERIAL PRIMARY KEY,
    truckid INTEGER REFERENCES foodtruck.trucks(truckid) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10,2) NOT NULL,
    category TEXT NOT NULL,
    status TEXT DEFAULT 'available',
    createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders Table
CREATE TABLE foodtruck.orders (
    orderid SERIAL PRIMARY KEY,
    userid INTEGER REFERENCES foodtruck.users(userid) ON DELETE CASCADE,
    truckid INTEGER REFERENCES foodtruck.trucks(truckid) ON DELETE CASCADE,
    orderstatus TEXT NOT NULL,
    totalprice NUMERIC(10,2) NOT NULL,
    scheduledpickuptime TIMESTAMP,
    estimatedearliestpickup TIMESTAMP,
    createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- OrderItems Table
CREATE TABLE foodtruck.orderitems (
    orderitemid SERIAL PRIMARY KEY,
    orderid INTEGER REFERENCES foodtruck.orders(orderid) ON DELETE CASCADE,
    itemid INTEGER REFERENCES foodtruck.menuitems(itemid) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    price NUMERIC(10,2) NOT NULL
);

-- Carts Table
CREATE TABLE foodtruck.carts (
    cartid SERIAL PRIMARY KEY,
    userid INTEGER REFERENCES foodtruck.users(userid) ON DELETE CASCADE,
    itemid INTEGER REFERENCES foodtruck.menuitems(itemid) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    price NUMERIC(10,2) NOT NULL
);

-- Sessions Table
CREATE TABLE foodtruck.sessions (
    id SERIAL PRIMARY KEY,
    userid INTEGER REFERENCES foodtruck.users(userid) ON DELETE CASCADE,
    token TEXT NOT NULL,
    expiresat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);