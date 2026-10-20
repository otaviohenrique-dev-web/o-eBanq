import { Suspense } from "react";
import App from "@/components/App";

export default function Home() {
  return (
    <Suspense fallback={<p className="p-6 text-subtle">Carregando...</p>}>
      <App />
    </Suspense>
  );
}
