import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Menu from "./components/Menu";
import AdminMenu from "./components/AdminMenu";
import { useState } from "react";

function App() {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Menu setIsAdminAuthenticated={setIsAdminAuthenticated} />} />
        <Route path="/admin" element={isAdminAuthenticated ? <AdminMenu /> : <Navigate to="/" />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;