
export { ProductCard };
const ProductCard = ({ product, onClick = new Function(), children }) => {
    return (
        <div style={styles.card} onClick={() => onClick(product)}>
            <h3 style={styles.title}>{product.product_name}</h3>
            <p style={styles.price}>${product.product_price.toFixed(2)}</p>
            {children}
        </div>
    );
}

const styles = {
    card: {
        backgroundColor: "rgba(99, 99, 99, 0.42)",
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        color: "#fff",
        padding: "1rem",
        borderRadius: "0.5rem",
        cursor: "pointer",
        width: "120px",
        minHeight: "120px",
        maxHeight: "120px",
        textAlign: "center",
    },
    title: {
        fontSize: "1.25rem",
        fontWeight: "bold",
        marginBottom: "0.5rem",
    },
    category: {
        fontSize: "1rem",
        marginBottom: "0.5rem",
    },
    price: {
        fontSize: "1rem",
        fontWeight: "bold",
    },
};