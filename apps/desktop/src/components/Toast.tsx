import { createContext, useContext, useRef, useState, type ReactNode } from "react";

type ToastType = "ok" | "err" | "info";
interface ToastItem {
  id: number;
  msg: string;
  type: ToastType;
}

const Ctx = createContext<(msg: string, type?: ToastType) => void>(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [list, setList] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  function show(msg: string, type: ToastType = "info") {
    const id = ++idRef.current;
    setList((l) => [...l, { id, msg, type }]);
    setTimeout(() => setList((l) => l.filter((t) => t.id !== id)), 3200);
  }

  return (
    <Ctx.Provider value={show}>
      {children}
      <div className="toast-wrap">
        {list.map((t) => (
          <div key={t.id} className={`toast ${t.type === "ok" ? "ok" : t.type === "err" ? "err" : ""}`}>
            {t.msg}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
