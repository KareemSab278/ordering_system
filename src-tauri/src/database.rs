use rusqlite::{params, Connection, Result};
use serde::{Serialize};
use std::path::PathBuf;
use std::fs;

const PRODUCTS_DATABASE_PATH: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/src/data/products.db");

fn orders_db_path() -> PathBuf {
    let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".to_string());
    let dir = PathBuf::from(home).join("data");
    let _ = fs::create_dir_all(&dir);
    dir.join("ordering_system_data.db")
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
    let conn = Connection::open(orders_db_path())?;
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
    let db_path = orders_db_path();
    if !check_database_exists(db_path.to_str().unwrap_or("")) {
        initialize_orders_database()?;
    }

    let conn = Connection::open(orders_db_path())?;
    conn.execute(
        "INSERT INTO orders (product_id, quantity, price) VALUES (?1, ?2, ?3)",
        params![product_id, quantity, price],
    )?;
    println!("Order inserted successfully.");
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
    if !check_database_exists(PRODUCTS_DATABASE_PATH) {
        return Err(rusqlite::Error::InvalidQuery);
    }
    let conn = Connection::open(PRODUCTS_DATABASE_PATH)?;
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
