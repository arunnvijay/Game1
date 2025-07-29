import React from "react";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import MathGame from "./components/MathGame";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MathGame />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;