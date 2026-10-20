import { Suspense } from "react";
import Painel from "@/components/Painel";

export default function Home() {
  return (
    <Suspense fallback={<p className="p-6 text-slate-500">Carregando...</p>}>
      <Painel />
    </Suspense>
  );
}
