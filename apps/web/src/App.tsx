import { useEffect, useState } from "react";
import { getApiMessage } from "./services/api";

function App() {
  const [message, setMessage] = useState("Đang kết nối Backend...");
  const [error, setError] = useState("");

  useEffect(() => {
    getApiMessage()
      .then((data) => {
        setMessage(data);
      })
      .catch(() => {
        setError("Không thể kết nối tới NestJS API.");
      });
  }, []);

  return (
    <main style={{ fontFamily: "sans-serif", padding: "2rem", lineHeight: "1.6" }}>
      <h1>Learning Platform</h1>
      <p>Frontend: React 19 + Vite</p>

      {error ? (
        <p style={{ color: "red" }}>{error}</p>
      ) : (
        <p>Backend response: <strong>{message}</strong></p>
      )}
    </main>
  );
}

export default App;