import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Modal } from "./Components/Modal";
import { PrimaryButton } from "./Components/Button";
import { CategoryIndicator } from "./Components/CategoryIndicator";
import { products } from "./TestData/products";
import { ProductCard } from "./Components/ProductCard";

export { App };

const DISCOUNT_STATUS = false;

function App() {
  const [modalOpen, setModalOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");
  const [selectedProducts, setSelectedProducts] = useState([]);

  const appendProduct = (product, action) => {
    setSelectedProducts((prev) => {
      const found = prev.find((p) => p.product_id === product.product_id);
      const isAdd = action == "add";
      const countChange = isAdd ? 1 : -1;
      const condition = isAdd ? found : found && found.count > 1;
      if (condition) {
        return prev.map((prod) =>
          prod.product_id === product.product_id
            ? { ...prod, count: prod.count + countChange }
            : prod,
        );
      }
      return isAdd ? [...prev, { ...product, count: 1 }] : prev.filter((prod) => prod.product_id !== product.product_id);
    });
  };

  const categories = ["All", "Drinks", "Snacks", "Food"];
  const filteredProducts =
    activeCategory === "All"
      ? products
      : products.filter((prod) => prod.product_category === activeCategory);

  return (
    <main style={styles.body}>
      <h1>Payment System</h1>
      <section style={styles.categoryIndicatorContainer}>
        <CategoryIndicator
          categories={categories}
          activeCategory={activeCategory}
          onCategoryClick={setActiveCategory}
        />
      </section>
      <section style={styles.productsSection}>
        {filteredProducts.map((product) => (
          <ProductCard
            key={product.product_id}
            product={product}
            onClick={() => appendProduct(product, "add")}
          />
        ))}
      </section>
      <PrimaryButton title="View Order" onClick={() => setModalOpen(true)} />
      <Modal
        opened={modalOpen}
        closed={() => setModalOpen(false)}
        title="Selected Products"
        children={
          <section style={styles.productsSection}>
            {selectedProducts.map((prod) => (
              <ProductCard
                key={prod.product_id}
                product={prod}
                children={
                  <>
                    <div>Quantity: {prod.count}</div>
                    <PrimaryButton
                      title="Remove"
                      onClick={() => appendProduct(prod, "remove")}
                    />
                  </>
                }
              />
            ))}
          </section>
        }
      />
    </main>
  );
}

const styles = {
  body: {
    background: "#35395c",
    color: "#fff",
    fontFamily:
      'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    minHeight: "100vh",
    padding: 0,
    margin: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  categoryIndicatorContainer: {
    display: "flex",
    justifyContent: "center",
    width: "100%",
    marginBottom: "2rem",
  },
  productsSection: {
    display: "flex",
    flexWrap: "wrap",
    gap: "1rem",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    maxWidth: "900px",
    margin: "0 auto 2rem auto",
  },
};
