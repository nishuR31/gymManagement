import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "./components/ui/Toaster";
import { ScrollToTop } from "./components/ScrollToTop";
import { App } from "./app/App";
import { store } from "./store";
import "./styles/index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <ScrollToTop />
        <App />
        <Toaster />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);

document.getElementById("root-loader")?.classList.add("hidden");
