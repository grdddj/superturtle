import ReactDOM from "react-dom";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { Provider } from "react-redux";
import store from "./store";
import App from "./App";
import "./style.css";

const convex = new ConvexReactClient(process.env.REACT_APP_CONVEX_URL);

ReactDOM.render(
  <ConvexProvider client={convex}>
    <Provider store={store}>
      <App />
    </Provider>
  </ConvexProvider>,
  document.getElementById("root")
);
