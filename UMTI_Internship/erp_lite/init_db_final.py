# init_db_final.py
import sqlite3
import os
import sys

# Add the current directory to path so we can import from app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.security import get_password_hash

print("=" * 50)
print("Final Database Initialization")
print("=" * 50)

# Delete existing database if it exists
db_file = 'erp.db'
if os.path.exists(db_file):
    os.remove(db_file)
    print(f"✓ Deleted existing database: {db_file}")

# Create new database and tables directly with SQL
conn = sqlite3.connect(db_file)
cursor = conn.cursor()

# Create tables in correct order
print("\nCreating tables...")

# Users table
cursor.execute('''
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR NOT NULL UNIQUE,
    email VARCHAR NOT NULL UNIQUE,
    hashed_password VARCHAR NOT NULL,
    is_active BOOLEAN DEFAULT 1
)
''')
print("✓ Created users table")

# Customers table
cursor.execute('''
CREATE TABLE customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR NOT NULL,
    email VARCHAR UNIQUE,
    phone VARCHAR UNIQUE,
    address VARCHAR
)
''')
print("✓ Created customers table")

# Suppliers table
cursor.execute('''
CREATE TABLE suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR NOT NULL,
    email VARCHAR UNIQUE,
    phone VARCHAR UNIQUE,
    address VARCHAR
)
''')
print("✓ Created suppliers table")

# Products table
cursor.execute('''
CREATE TABLE products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sku VARCHAR NOT NULL UNIQUE,
    name VARCHAR NOT NULL,
    category VARCHAR,
    stock INTEGER DEFAULT 0,
    cost FLOAT NOT NULL,
    price FLOAT NOT NULL,
    barcode VARCHAR UNIQUE
)
''')
print("✓ Created products table")

# Purchase orders table
cursor.execute('''
CREATE TABLE purchase_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    supplier_id INTEGER,
    total_amount FLOAT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers (id)
)
''')
print("✓ Created purchase_orders table")

# Purchase items table
cursor.execute('''
CREATE TABLE purchase_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER,
    product_id INTEGER,
    quantity INTEGER,
    price FLOAT,
    FOREIGN KEY (order_id) REFERENCES purchase_orders (id),
    FOREIGN KEY (product_id) REFERENCES products (id)
)
''')
print("✓ Created purchase_items table")

# Sales orders table
cursor.execute('''
CREATE TABLE sales_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER,
    total_amount FLOAT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers (id)
)
''')
print("✓ Created sales_orders table")

# Sales items table
cursor.execute('''
CREATE TABLE sales_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER,
    product_id INTEGER,
    quantity INTEGER,
    price FLOAT,
    FOREIGN KEY (order_id) REFERENCES sales_orders (id),
    FOREIGN KEY (product_id) REFERENCES products (id)
)
''')
print("✓ Created sales_items table")

# Create test user
print("\nCreating test user...")
try:
    hashed = get_password_hash("admin123")
    cursor.execute('''
    INSERT INTO users (username, email, hashed_password, is_active)
    VALUES (?, ?, ?, ?)
    ''', ('admin', 'admin@example.com', hashed, 1))
    
    # Verify user was created
    cursor.execute("SELECT id, username, email FROM users WHERE username = ?", ('admin',))
    user = cursor.fetchone()
    if user:
        print(f"✓ Test user created: ID={user[0]}, Username={user[1]}, Email={user[2]}")
    else:
        print("✗ Failed to create test user")
        
except Exception as e:
    print(f"✗ Error creating test user: {e}")
    conn.rollback()
    raise

conn.commit()
conn.close()

print("\n" + "=" * 50)
print("Database initialized successfully!")
print("Username: admin")
print("Password: admin123")
print("=" * 50)

# Verify database tables
print("\nVerifying database...")
conn = sqlite3.connect(db_file)
cursor = conn.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cursor.fetchall()
print(f"Tables in database: {[table[0] for table in tables]}")

cursor.execute("SELECT * FROM users;")
users = cursor.fetchall()
print(f"Users in database: {users}")
conn.close()