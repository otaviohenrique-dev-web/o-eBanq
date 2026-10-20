import { useSyncExternalStore } from "react";
import type { Estado } from "./finance";

const CHAVE = "o-ebanq:v1";
const VAZIO: Estado = { nomes: { a: "Otávio", b: "Par" }, transacoes: [] };

let cacheBruto: string | null | undefined;
let cache: Estado = VAZIO;
const ouvintes = new Set<() => void>();

function ler(): Estado {
  let bruto: string | null = null;
  try {
    bruto = localStorage.getItem(CHAVE);
  } catch {}
  if (bruto === cacheBruto) return cache;
  cacheBruto = bruto;
  try {
    cache = bruto ? { ...VAZIO, ...JSON.parse(bruto) } : VAZIO;
  } catch {
    cache = VAZIO;
  }
  return cache;
}

export function atualizar(fn: (e: Estado) => Estado) {
  const proximo = fn(ler());
  const bruto = JSON.stringify(proximo);
  try {
    localStorage.setItem(CHAVE, bruto);
  } catch {}
  cacheBruto = bruto;
  cache = proximo;
  ouvintes.forEach((o) => o());
}

function assinar(cb: () => void) {
  ouvintes.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    ouvintes.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

export function useEstado(): Estado {
  return useSyncExternalStore(assinar, ler, () => VAZIO);
}
