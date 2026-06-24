import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppShell() {
  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <Topbar />
        <Outlet />
      </div>
    </div>
  );
}
