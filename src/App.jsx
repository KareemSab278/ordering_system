import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Modal } from "./Components/Modal";
import { PrimaryButton } from "./Components/Button";
export {App};
function App() {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  async function greet() {
    // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
    setGreetMsg(await invoke("greet", { name }));
  }

  return (
    <main style={styles.body}>
      <h1>Payment System</h1>

      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          greet();
        }}
      >
        <input
          id="greet-input"
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder="Enter a name..."
        />
        <button type="submit">Greet</button>
      </form>
      <p>{greetMsg}</p>

      <PrimaryButton title="Open Modal" onClick={() => setModalOpen(true)} />

      <Modal
        opened={modalOpen}
        closed={() => setModalOpen(false)}
        title="This is a Modal"
      >
        <p>Here is some content inside the modal.</p>
        <PrimaryButton title="Close Modal" onClick={() => setModalOpen(false)} />
      </Modal>
    </main>
  );
}

const styles = {
  body: {
    background: "#000000",
    minHeight: "100vh",
    padding: 0,
    margin: 0,
  }
};