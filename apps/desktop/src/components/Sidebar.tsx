import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../store/auth";
import { IconActivity, IconGear, IconGrid, IconIn, IconLogout, IconOut, IconUsers } from "./Icons";
import { Sillage } from "./Sillage";

function useCount(register: string) {
  const { data } = useQuery({
    queryKey: ["count", register],
    queryFn: () => api.list(register, { page_size: 1 }),
  });
  return data?.total as number | undefined;
}

export function Sidebar() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const eCount = useCount("entree");
  const sCount = useCount("sortie");
  const initials = (user?.full_name || "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <aside className="side">
      <div className="ripple side__ripple">
        <Sillage />
      </div>
      <div className="side__head">
        <img className="side__logo" src="./wabag-logo-white.png" alt="WABAG" />
        <div className="side__app">{t("app.menu")}</div>
      </div>

      <nav className="nav">
        <div className="nav__sec">{t("nav.navigation")}</div>
        <NavLink to="/tableau" className={({ isActive }) => "nav__item" + (isActive ? " active" : "")}>
          <IconGrid className="nav__ic" /> {t("nav.dashboard")}
        </NavLink>

        <div className="nav__sec">{t("nav.registers")}</div>
        <NavLink to="/entree" className={({ isActive }) => "nav__item" + (isActive ? " active" : "")}>
          <IconIn className="nav__ic" /> {t("nav.entree")}
          {eCount !== undefined && <span className="nav__badge">{eCount}</span>}
        </NavLink>
        <NavLink to="/sortie" className={({ isActive }) => "nav__item" + (isActive ? " active" : "")}>
          <IconOut className="nav__ic" /> {t("nav.sortie")}
          {sCount !== undefined && <span className="nav__badge">{sCount}</span>}
        </NavLink>

        <div className="nav__sec">{t("nav.admin")}</div>
        {user?.role === "admin" && (
          <NavLink to="/utilisateurs" className={({ isActive }) => "nav__item" + (isActive ? " active" : "")}>
            <IconUsers className="nav__ic" /> {t("nav.users")}
          </NavLink>
        )}
        {user?.role === "admin" && (
          <NavLink to="/journal-activite" className={({ isActive }) => "nav__item" + (isActive ? " active" : "")}>
            <IconActivity className="nav__ic" /> {t("audit.title")}
          </NavLink>
        )}
        <NavLink to="/parametres" className={({ isActive }) => "nav__item" + (isActive ? " active" : "")}>
          <IconGear className="nav__ic" /> {t("nav.settings")}
        </NavLink>
      </nav>

      <div className="side__foot">
        <div className="userchip">
          <span className="avatar">{initials}</span>
          <span className="userchip__txt">
            <span className="userchip__name">{user?.full_name}</span>
            <span className="userchip__role">{user?.role === "admin" ? "Admin" : "Agent BO"}</span>
          </span>
          <button className="side__logout" onClick={logout} aria-label={t("nav.logout")} title={t("nav.logout")}>
            <IconLogout width={17} height={17} />
          </button>
        </div>
      </div>
    </aside>
  );
}
