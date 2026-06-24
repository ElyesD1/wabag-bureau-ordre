import type { ReactElement } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { Journal } from "./pages/Journal";
import { Login } from "./pages/Login";
import { useAuth } from "./store/auth";

function Protected({ children }: { children: ReactElement }) {
  const { user, ready } = useAuth();
  if (!ready)
    return (
      <div className="center-load" style={{ height: "100vh" }}>
        <span className="spin dark" />
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <Protected>
            <AppShell />
          </Protected>
        }
      >
        <Route path="/" element={<Navigate to="/entree" replace />} />
        <Route path="/:register" element={<Journal />} />
      </Route>
    </Routes>
  );
}
