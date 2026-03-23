import { useState, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import * as helpers from "./AppHelpers";
import * as visuals from "./AppVisualHelpers";
import * as hardware from "./hardwareHelpers";
import { ScreenSaver } from "./Components/ScreenSaver";

export { App };

const INITIAL_STATE_FULLSCREEN = false;
const SCREENSAVER_TIMEOUT_MINUTES = 1;
const FETCH_PRODUCTS_INTERVAL = 6000;


function App() {
  const [modalOpen, setModalOpen] = useState(false);
  const [screenSaverActive, setScreenSaverActive] = useState(false);
  const [checkoutActive, setCheckoutActive] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [fullScreenState, setFullScreenState] = useState(INITIAL_STATE_FULLSCREEN);

  const [activeCategory, setActiveCategory] = useState("All");
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [products, setProducts] = useState([]);

  const [payStatus, setPayStatus] = useState("idle");
  const [payMessage, setPayMessage] = useState("");
  const [editorUrl, setEditorUrl] = useState("");

  const unlistenMotionRef = useRef(null);
  const pollRef = useRef(null);
  const inactivityTimerRef = useRef(null);
  const cancelledRef = useRef(false);

  const clearInactivityTimer = () => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
  };

  const startInactivityTimer = () => {
    if (checkoutActive) return;
    clearInactivityTimer();

    inactivityTimerRef.current = setTimeout(() => {
      setScreenSaverActive(true);
    }, SCREENSAVER_TIMEOUT_MINUTES * 60 * 1000);
  };

  const resetInactivityTimer = () => {
    setScreenSaverActive(false);
    startInactivityTimer();
  };

  useEffect(() => {
    const getProductsOnMount = async () => {
      const prods = await invoke("query_products");
      setProducts(prods);
    };

    const listenToMotionSensor = async () => {
      unlistenMotionRef.current = await hardware.listenToMotionSensor(() => {
        console.log("[App] Motion event received");
        resetInactivityTimer();
      });
    };

    const initializePaymentServer = async () => {
      try {
        await invoke("initialize_payment_server");
      } catch (e) {
        setCheckoutActive(true);
        setPayStatus("error");
        setPayMessage(`Failed to start payment server: ${e}`);
      }
    };

    const initializeStaticServer = async () => {
      try {
        await invoke("initialize_static_page_server");
      } catch (e) {
        console.error("Failed to start static page server:", e);
      }
    };

    const fetchEditorUrl = async () => {
      try {
        const editorUrlRaw = await invoke("return_editor_url");
        setEditorUrl(editorUrlRaw);
      } catch (e) {
        console.error("Failed to fetch editor URL:", e);
      }
    };

    getProductsOnMount();
    fetchEditorUrl();
    initializeStaticServer();
    fetchProducts();
    initializePaymentServer();
    listenToMotionSensor();
    startInactivityTimer();

    const handleUserActivity = () => {
      resetInactivityTimer();
    };

    window.addEventListener("pointerdown", handleUserActivity);
    window.addEventListener("keydown", handleUserActivity);

    const timer = setTimeout(() => {
      getCurrentWindow().setFullscreen(INITIAL_STATE_FULLSCREEN);
    }, 1000);

    return () => {
      clearTimeout(timer);
      clearInactivityTimer();
      window.removeEventListener("pointerdown", handleUserActivity);
      window.removeEventListener("keydown", handleUserActivity);
      if (pollRef.current) clearInterval(pollRef.current);
      if (unlistenMotionRef.current) unlistenMotionRef.current();
    };
  }, []);

  useEffect(() => {
    if (checkoutActive) {
      clearInactivityTimer();
    } else {
      startInactivityTimer();
    }
  }, [checkoutActive]);

  const fetchProducts = async () => {
    pollRef.current = setInterval(async () => {
      try {
        const prods = await invoke("query_products");
        setProducts(prods);
      } catch (e) {
        console.error("Failed to fetch products:", e);
      }
    }, FETCH_PRODUCTS_INTERVAL);
  };

  const startPolling = () => {
    pollRef.current = setInterval(async () => {
      if (cancelledRef.current) {
        stopPolling();
        return;
      }
      try {
        const raw = await invoke("get_pay_state");
        const state = JSON.parse(raw);
        const pay = state.pay;

        if (pay.approved) {
          stopPolling();
          setPayMessage("Card approved!");
          doDispenseAll();
        } else if (!pay.in_progress && pay.last_error) {
          stopPolling();
          setPayStatus("error");
          setPayMessage(pay.last_error || "Payment failed");
        } else {
          setPayMessage(pay.last_status || "Tap your contactless card…");
        }
      } catch (_) {
        setPayMessage("Waiting for payment service…");
      }
    }, 500);
  };

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const doDispenseAll = async () => {
    if (cancelledRef.current) return;
    setPayStatus("dispensing");
    setPayMessage("Payment approved! Opening door…");

    try {
      const raw = await invoke("dispense_item", { slot: 1, success: true });
      const res = JSON.parse(raw);
      if (!res.ok) {
        setPayStatus("error");
        setPayMessage(res.error || "Dispense confirmation failed");
        return;
      }
    } catch (e) {
      setPayStatus("error");
      setPayMessage(`Dispense error: ${e}`);
      return;
    }

    hardware.unlockDoor();
    hardware.setLightsColor("green");

    for (const p of selectedProducts) {
      try {
        await invoke("insert_order", {
          productId: p.product_id,
          quantity: p.count,
          price: p.product_price * p.count,
        });
      } catch (e) {
        console.error("Failed to save order for product", p.product_id, e);
      }
    }
    setPayStatus("waiting_door");
    setPayMessage("Please take your items and close the door.");
    const doorPollInterval = setInterval(async () => {
      if (cancelledRef.current) {
        clearInterval(doorPollInterval);
        return;
      }
      const closed = await hardware.isDoorClosed();
      if (closed) {
        clearInterval(doorPollInterval);
        setPayStatus("done");
        setPayMessage("Thank you! Please come again.");
        setModalOpen(false);

        setTimeout(() => {
          if (!cancelledRef.current) {
            resetCheckoutState();
          }
        }, 500);
      }
    }, 500);
  };

  const handleCheckout = async () => {
    if (selectedProducts.length === 0) return;

    cancelledRef.current = false;
    setCheckoutActive(true);
    setPayStatus("paying");
    setPayMessage("Initiating payment…");

    const items = selectedProducts.map((p) => ({
      id: p.product_id,
      name: p.product_name,
      price: Math.round(p.product_price * 100),
      qty: p.count,
    }));

    try {
      const raw = await invoke("initiate_payment", { slot: 1, items });
      const res = JSON.parse(raw);
      console.log("Payment initiation response:", res);
      if (!res.ok) {
        setPayStatus("error");
        setPayMessage(res.error || "Failed to start payment");
        return;
      }
      setPayMessage("Tap your contactless card to pay…");
      startPolling();
    } catch (e) {
      setPayStatus("error");
      setPayMessage(`Could not reach payment service: ${e}`);
    }
  };

  const handleCheckoutCancel = async () => {
    cancelledRef.current = true;
    stopPolling();
    setCheckoutActive(false);
    setPayStatus("idle");
    setPayMessage("");
    await invoke("terminate_payment");
  };

  const resetCheckoutState = () => {
    cancelledRef.current = false;
    stopPolling();
    setCheckoutActive(false);
    setPayStatus("idle");
    setPayMessage("");
    setSelectedProducts([]);
  };

  const appendProduct = (product, action) => {
    setSelectedProducts((prev) => {
      const found = prev.find((p) => p.product_id === product.product_id);
      const isAdd = action === "+";
      const countChange = isAdd ? 1 : -1;
      const condition = isAdd ? found : found && found.count > 1;

      if (condition) {
        return prev.map((prod) =>
          prod.product_id === product.product_id
            ? { ...prod, count: prod.count + countChange }
            : prod,
        );
      }

      return isAdd
        ? [...prev, { ...product, count: 1 }]
        : prev.filter((prod) => prod.product_id !== product.product_id);
    });
  };

  const toggleFullScreen = () => {
    const newFullScreenState = !fullScreenState;
    setFullScreenState(newFullScreenState);
    getCurrentWindow().setFullscreen(newFullScreenState);
  };

  return (
    <main style={visuals.styles.body}>
      <div
        style={visuals.styles.adminTrigger}
        onClick={() => setAdminModalOpen(true)}
        onDoubleClick={() => {
          setAdminModalOpen(true);
        }}
      />

      <visuals.AdminModal
        opened={adminModalOpen}
        onClose={() => setAdminModalOpen(false)}
        onAction={(opt) => {
          opt.onClick();
          setAdminModalOpen(false);
        }}
        editorUrl={editorUrl}
        onToggleFullScreen={toggleFullScreen}
        fullScreenState={fullScreenState}
      />

      {!adminModalOpen && !checkoutActive && !modalOpen && <visuals.CategoryIndicatorComponent
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
      />}

      {!adminModalOpen && !checkoutActive && <visuals.ProductsSection
        products={products}
        appendProduct={appendProduct}
        selectedProducts={selectedProducts}
        activeCategory={activeCategory}
      />}

      {!adminModalOpen && !checkoutActive && <visuals.PriceStatusPillComponent
        onModalOpen={() => {
          setScreenSaverActive(false);
          setModalOpen(true);
        }}
        onCheckout={() => {
          setScreenSaverActive(false);
          handleCheckout();
        }}
        totalPrice={helpers.totalPrice(selectedProducts)}
      />}

      <visuals.SelectedProductsModal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        selectedProducts={selectedProducts}
        onRemove={appendProduct}
        onClearAll={() => setSelectedProducts([])}
      />

      <visuals.CheckoutModal
        opened={checkoutActive}
        payMessage={payMessage}
        payStatus={payStatus}
        onDismiss={resetCheckoutState}
        onCancel={handleCheckoutCancel}
      />

      {screenSaverActive && <ScreenSaver onClose={resetInactivityTimer} />}
    </main>
  );
}