use rusqlite::{params, Connection, Result};
use serde::{Serialize};
use std::path::PathBuf;
use std::fs;

const ORDERS_DATABASE_FILE: &str = "ordering_system_data.db";
const PRODUCTS_FILE: &str = "products.db";

fn orders_db_path(file: &str) -> PathBuf {
    let home = std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .unwrap_or_else(|_| std::env::temp_dir().to_string_lossy().into_owned());
    let dir = PathBuf::from(home).join("data");
    let _ = fs::create_dir_all(&dir);
    dir.join(file)
}

const CREATE_PRODUCTS_SQL: &str =
"CREATE TABLE IF NOT EXISTS products (
    product_id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_name TEXT NOT NULL,
    product_category TEXT NOT NULL,
    product_price REAL NOT NULL,
    product_availability INTEGER NOT NULL DEFAULT 1
)";

pub fn initialize_products_database() -> Result<()> {
    let conn = Connection::open(orders_db_path(PRODUCTS_FILE))?;
    conn.execute(CREATE_PRODUCTS_SQL, [])?;
    println!("Products database and table created successfully.");
    Ok(())
}

const CREATE_ORDERS_SQL: &str =
"CREATE TABLE IF NOT EXISTS orders (
    order_id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    price FLOAT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
)";

pub fn initialize_orders_database() -> Result<()> {
    let conn = Connection::open(orders_db_path(ORDERS_DATABASE_FILE))?;
    conn.execute(
        CREATE_ORDERS_SQL,
        [],
    )?;
    println!("Database and table created successfully.");
    Ok(())
}

fn check_database_exists(database: &str) -> bool {
    std::path::Path::new(&database).exists()
}

pub fn insert_order(product_id: i32, quantity: i32, price: f64) -> Result<()> {
    let db_path = orders_db_path(ORDERS_DATABASE_FILE);
    if !check_database_exists(db_path.to_str().unwrap_or("")) {
        initialize_orders_database()?;
    }

    let conn = Connection::open(orders_db_path(ORDERS_DATABASE_FILE))?;
    conn.execute(
        "INSERT INTO orders (product_id, quantity, price) VALUES (?1, ?2, ?3)",
        params![product_id, quantity, price],
    )?;
    println!("Order inserted successfully.");
    Ok(())
}

pub fn new_product(product_name: &str, product_category: &str, product_price: f64, product_availability: bool) -> Result<()> {
    let db_path = orders_db_path(PRODUCTS_FILE);
    if !check_database_exists(db_path.to_str().unwrap_or("")) {
        initialize_products_database()?;
    }
    let conn = Connection::open(orders_db_path(PRODUCTS_FILE))?;
    conn.execute(
        "INSERT INTO products (product_name, product_category, product_price, product_availability) VALUES (?1, ?2, ?3, ?4)",
        params![product_name, product_category, product_price, product_availability],
    )?;
    println!("Product inserted successfully.");
    Ok(())
}

pub fn delete_product(product_id: i32) -> Result<()> {
    let db_path = orders_db_path(PRODUCTS_FILE);
    if !check_database_exists(db_path.to_str().unwrap_or("")) {
        println!("No products database found, created new one. Nothing to delete.");
        return Ok(());
    }
    let conn = Connection::open(orders_db_path(PRODUCTS_FILE))?;
    conn.execute(
        "DELETE FROM products WHERE product_id = ?1",
        params![product_id],
    )?;
    println!("Product deleted successfully.");
    Ok(())
}

pub fn update_product(product_id: i32, product_name: &str, product_category: &str, product_price: f64, product_availability: bool) -> Result<()> {
    let db_path = orders_db_path(PRODUCTS_FILE);
    if !check_database_exists(db_path.to_str().unwrap_or("")) {
        return Ok(()); // nothing to update
    }
    let conn = Connection::open(orders_db_path(PRODUCTS_FILE))?;
    conn.execute(
        "UPDATE products SET product_name = ?1, product_category = ?2, product_price = ?3, product_availability = ?4 WHERE product_id = ?5",
        params![product_name, product_category, product_price, product_availability, product_id],
    )?;
    println!("Product updated successfully.");
    Ok(())
}

#[derive(Serialize, Debug)]
pub struct Product {
    pub product_id: i32,
    pub product_name: String,
    pub product_category: String,
    pub product_price: f64,
    pub product_availability: bool,
}

pub fn query_products() -> Result<Vec<Product>> {
    if !check_database_exists(orders_db_path(PRODUCTS_FILE).to_str().unwrap_or("")) {
        return Ok(vec![]);
    }
    let conn = Connection::open(orders_db_path(PRODUCTS_FILE))?;
    let mut stmt = conn.prepare("SELECT product_id, product_name, product_category, product_price, product_availability FROM products")?;
    let product_iter = stmt.query_map([], |row| {
        Ok(Product {
            product_id: row.get(0)?,
            product_name: row.get(1)?,
            product_category: row.get(2)?,
            product_price: row.get(3)?,
            product_availability: row.get(4)?,
        })
    })?;
    let mut products = Vec::new();
    for product in product_iter {
        products.push(product?);
    }
    Ok(products)
}

#[derive(Serialize, Debug)]
pub struct Order {
    pub order_id: i32,
    pub product_id: i32,
    pub quantity: i32,
    pub price: f64,
    pub timestamp: String,
}

pub fn view_orders() -> Result<Vec<Order>> {
    if !check_database_exists(orders_db_path(ORDERS_DATABASE_FILE).to_str().unwrap_or("")) {
        return Ok(vec![]);
    }
    let conn = Connection::open(orders_db_path(ORDERS_DATABASE_FILE))?;
    let mut stmt = conn.prepare("SELECT order_id, product_id, quantity, price, timestamp FROM orders")?;
    let order_iter = stmt.query_map([], |row| {
        Ok(Order {
            order_id: row.get(0)?,
            product_id: row.get(1)?,
            quantity: row.get(2)?,
            price: row.get(3)?,
            timestamp: row.get(4)?,
        })
    })?;
    let mut orders = Vec::new();
    for order in order_iter {
        orders.push(order?);
    }
    Ok(orders)
}

#[derive(Serialize, Debug)]
pub struct OrderWithProduct {
    pub order_id: i32,
    pub product_id: i32,
    pub product_name: String,
    pub product_category: String,
    pub quantity: i32,
    pub price: f64,
    pub timestamp: String,
}

pub fn view_orders_with_products(start_date: Option<&str>, end_date: Option<&str>) -> Result<Vec<OrderWithProduct>> {
    if !check_database_exists(orders_db_path(ORDERS_DATABASE_FILE).to_str().unwrap_or("")) {
        return Ok(vec![]);
    }
    let conn = Connection::open(orders_db_path(ORDERS_DATABASE_FILE))?;

    let products_path = orders_db_path(PRODUCTS_FILE);
    let has_products = check_database_exists(products_path.to_str().unwrap_or(""));
    if has_products {
        conn.execute(
            &format!("ATTACH DATABASE '{}' AS pdb", products_path.display()),
            [],
        )?;
    }

    let (name_col, join_clause) = if has_products {
        (
            "COALESCE(p.product_name, 'Unknown') AS product_name, COALESCE(p.product_category, 'Unknown') AS product_category",
            "LEFT JOIN pdb.products p ON o.product_id = p.product_id",
        )
    } else {
        ("'Unknown' AS product_name, 'Unknown' AS product_category", "")
    };

    let base = format!(
        "SELECT o.order_id, o.product_id, {}, o.quantity, o.price, o.timestamp \
         FROM orders o {}",
        name_col, join_clause
    );

    let mut conditions: Vec<String> = Vec::new();
    let mut param_values: Vec<String> = Vec::new();

    if let Some(start) = start_date {
        if !start.is_empty() {
            param_values.push(format!("{} 00:00:00", start));
            conditions.push(format!("o.timestamp >= ?{}", param_values.len()));
        }
    }
    if let Some(end) = end_date {
        if !end.is_empty() {
            param_values.push(format!("{} 23:59:59", end));
            conditions.push(format!("o.timestamp <= ?{}", param_values.len()));
        }
    }

    let sql = if conditions.is_empty() {
        format!("{} ORDER BY o.timestamp DESC", base)
    } else {
        format!("{} WHERE {} ORDER BY o.timestamp DESC", base, conditions.join(" AND "))
    };

    let mut stmt = conn.prepare(&sql)?;
    let order_iter = stmt.query_map(rusqlite::params_from_iter(param_values.iter()), |row| {
        Ok(OrderWithProduct {
            order_id: row.get(0)?,
            product_id: row.get(1)?,
            product_name: row.get(2)?,
            product_category: row.get(3)?,
            quantity: row.get(4)?,
            price: row.get(5)?,
            timestamp: row.get(6)?,
        })
    })?;

    let mut orders = Vec::new();
    for order in order_iter {
        orders.push(order?);
    }
    Ok(orders)
}