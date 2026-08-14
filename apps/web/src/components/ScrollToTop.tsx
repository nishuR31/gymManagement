import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Timeout ensures scroll happens after Suspense paints the new route
    const timer = setTimeout(() => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "smooth"
      });
    }, 100);
    return () => clearTimeout(timer);
  }, [pathname]);

  return null;
}
