"use client";

import { useState } from "react";
import { Modal } from "./Forms";

/** Dica recolhível: explica uma seção em poucas linhas, só quando a pessoa quiser. */
export function Dica({ titulo = "Como funciona", children }: { titulo?: string; children: React.ReactNode }) {
  const [aberta, setAberta] = useState(false);
  return (
    <div className="text-sm">
      <button
        type="button"
        aria-expanded={aberta}
        onClick={() => setAberta((a) => !a)}
        className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-subtle"
      >
        <span aria-hidden>💡</span>
        {titulo}
        <span aria-hidden>{aberta ? "▴" : "▾"}</span>
      </button>
      {aberta && <div className="animar-entrada mt-2 space-y-1 rounded-lg bg-muted p-3 text-subtle">{children}</div>}
    </div>
  );
}

/** Checklist que guia quem acabou de entrar; some quando o essencial foi cadastrado. */
export function PrimeirosPassos({
  temEntrada,
  temGasto,
  onNovo,
  onSalario,
}: {
  temEntrada: boolean;
  temGasto: boolean;
  onNovo: () => void;
  onSalario: () => void;
}) {
  if (temEntrada && temGasto) return null;
  const passos = [
    { feito: temEntrada, texto: "Cadastre seu salário em \"Salário e renda\": ele conta sozinho todo mês. Se seu dinheiro entra sem data certa, lance cada entrada em + Cadastrar quando chegar." },
    { feito: temGasto, texto: "Registre um gasto e escolha a categoria: necessidade, lazer ou economia." },
    { feito: temEntrada && temGasto, texto: "Acompanhe os limites 50/30/20 e teste o 🔍 Posso Comprar? antes de gastar." },
  ];
  return (
    <section className="animar-entrada rounded-2xl border border-primary/40 bg-primary/10 p-5">
      <h2 className="font-semibold">👋 Primeiros passos</h2>
      <ol className="mt-3 space-y-2 text-sm">
        {passos.map((p, i) => (
          <li key={i} className="flex gap-3">
            <span
              aria-hidden
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs ${
                p.feito ? "bg-primary text-on-primary" : "border border-subtle text-subtle"
              }`}
            >
              {p.feito ? "✓" : i + 1}
            </span>
            <span className={p.feito ? "text-subtle line-through" : ""}>{p.texto}</span>
          </li>
        ))}
      </ol>
      <div className="mt-4 flex flex-wrap gap-2">
        {!temEntrada && (
          <button type="button" onClick={onSalario} className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-on-primary">
            Cadastrar salário
          </button>
        )}
        <button type="button" onClick={onNovo} className="rounded-full border border-strong px-5 py-2 text-sm font-medium text-strong">
          + Cadastrar entrada ou gasto
        </button>
      </div>
    </section>
  );
}

const secoes = [
  {
    titulo: "As três visões",
    texto:
      "Meu painel mostra só o que você lançou como pessoal e é onde você cadastra. Par mostra o painel da outra pessoa, só para consulta. Casal junta os dois num dashboard com gráficos.",
  },
  {
    titulo: "Regra 50/30/20",
    texto:
      "Da sua renda do mês, até 50% vai para necessidades (contas, mercado, transporte), 30% para lazer e 20% para economias. As barras ficam verdes, âmbar acima de 80% do limite e vermelhas acima de 100%.",
  },
  {
    titulo: "Bancos e etiquetas",
    texto:
      "Em \"Meus bancos\", adicione cada banco com um toque (ou digite outro) e, se quiser, o saldo de hoje. Ao cadastrar entradas, gastos, salário ou compras a prazo, escolha o banco: ele vira uma etiqueta colorida no lançamento e o app mostra o saldo de cada banco. Cada lançamento também tem a etiqueta 👤 Pessoal ou 👥 Casal, e dá para filtrar por elas.",
  },
  {
    titulo: "Salário e renda variável",
    texto:
      "Cadastre seu salário uma vez em \"Salário e renda\": ele conta sozinho em todo mês. Para dinheiro que entra sem data certa, lance cada entrada em + Cadastrar quando chegar. Os limites usam a renda fixa mais o maior valor entre o recebido no mês e a média dos 3 meses anteriores.",
  },
  {
    titulo: "Compras a prazo",
    texto:
      "Use + Compra a prazo com o valor total e o número de parcelas. O app lança uma parcela por mês, mostra a próxima fatura (por pessoa, no Casal), o peso das parcelas na renda mês a mês e sugere estratégias de pagamento. A parcela entra como gasto no mês em que vence, na categoria do que foi comprado (geladeira é Necessidade, TV é Lazer), e já conta nos limites. O ideal é que as parcelas somem até 20% da renda.",
  },
  {
    titulo: "Cartão de crédito e adiantamento",
    texto:
      "Em Meus bancos, toque em 💳 no cartão e informe o dia do fechamento e o do vencimento. Nas compras a prazo feitas nesse cartão, o app calcula sozinho em qual fatura a primeira parcela cai (compras a partir do dia do fechamento vão para a fatura seguinte) e as demais vencem todo mês no dia do vencimento. Vale também para compra do casal feita no seu cartão: ela segue o seu fechamento, e o acerto entre vocês continua automático. Para pagar antes do vencimento, use ⏩ Adiantar fatura (um mês inteiro) ou ⏩ Adiantar parcelas (em cada compra): as parcelas saem da fatura original e entram na data em que você pagou, com o valor pago (se houve desconto, informe).",
  },
  {
    titulo: "Meses",
    texto: "As setas no topo trocam o mês exibido. Dá para olhar meses passados e ver quanto já está comprometido em meses futuros.",
  },
  {
    titulo: "Consultor inteligente (IA)",
    texto:
      "O botão redondo no canto inferior direito, com o escudo e as faíscas, abre o consultor. Ele analisa o mês que você está vendo, no seu painel ou no do casal, e responde perguntas. Também dá para pedir o parecer da IA dentro do Posso Comprar. A IA recebe só valores, sem nomes nem e-mails.",
  },
  {
    titulo: "Cadastrar entradas e gastos",
    texto:
      "Use + Cadastrar. Entrada é dinheiro que chegou (salário, renda extra). Gasto é dinheiro que saiu. Em Economias, registre o que você guardou ou investiu: conta como Reservado.",
  },
  {
    titulo: "Gasto pessoal x gasto do casal",
    texto:
      "Um gasto do casal (aluguel, mercado da casa) aparece só na visão Casal e é dividido pela proporção da renda de cada um. O app mostra quem deve repassar quanto para acertar.",
  },
  {
    titulo: "Posso Comprar?",
    texto:
      "Informe valor, parcelas e categoria. O app confere se a parcela do mês cabe no seu saldo e no limite da categoria, e diz se pode, se exige atenção ou se não é recomendado.",
  },
  {
    titulo: "Tema e conta",
    texto:
      "O interruptor ☀️/🌙 troca entre tema claro e escuro. Seu perfil, no canto, tem o botão de sair. Só e-mails autorizados entram no sistema.",
  },
];

export function Tutorial({ onFechar }: { onFechar: () => void }) {
  return (
    <Modal titulo="Como usar o o-ebanq" onFechar={onFechar}>
      <div className="space-y-4 text-sm">
        {secoes.map((s) => (
          <div key={s.titulo}>
            <h3 className="font-medium">{s.titulo}</h3>
            <p className="mt-1 text-subtle">{s.texto}</p>
          </div>
        ))}
      </div>
      <button type="button" onClick={onFechar} className="mt-5 w-full rounded-full bg-primary px-6 py-3 font-medium text-on-primary">
        Entendi
      </button>
    </Modal>
  );
}
