"use client";

import { useState } from "react";
import {
  addMeses,
  brl,
  CATEGORIAS,
  faturaDaCompra,
  hoje,
  parseValor,
  pendentes,
  podeComprar,
  ROTULO,
  rotuloMes,
  valorDaParcela,
  vencimentoDaParcela,
  type Adiantada,
  type Categoria,
  type Conta,
  type Escopo,
  type Parcelamento,
  type Parecer,
  type Resumo,
} from "@/lib/finance";
import { SeletorConta } from "./Contas";
import { CampoValor } from "./CampoValor";
import { campo, Modal, SugestaoCategoria } from "./Forms";

const botaoPrimario = "w-full rounded-full bg-primary px-6 py-3 font-medium text-on-primary";

export function FormCompra({
  resumo,
  rotuloVisao,
  onFechar,
  consultarIA,
}: {
  resumo: Resumo;
  rotuloVisao: string;
  onFechar: () => void;
  consultarIA: (pedido: Record<string, unknown>) => Promise<string>;
}) {
  const [nome, setNome] = useState("");
  const [valor, setValor] = useState("");
  const [parcelas, setParcelas] = useState("1");
  const [categoria, setCategoria] = useState<Categoria>("lazer");
  const [parecer, setParecer] = useState<Parecer | null>(null);
  const [erro, setErro] = useState("");
  const [ia, setIa] = useState("");
  const [iaErro, setIaErro] = useState("");
  const [iaCarregando, setIaCarregando] = useState(false);

  function validar(): { v: number; p: number } | null {
    const v = parseValor(valor);
    const p = Math.floor(Number(parcelas));
    if (!(v > 0)) {
      setErro("Informe um valor maior que zero.");
      return null;
    }
    if (!(p >= 1)) {
      setErro("Informe ao menos 1 parcela.");
      return null;
    }
    setErro("");
    return { v, p };
  }

  function analisar(ev: React.FormEvent) {
    ev.preventDefault();
    const d = validar();
    if (d) setParecer(podeComprar(resumo, categoria, d.v, d.p));
  }

  async function pedirIA() {
    const d = validar();
    if (!d) return;
    if (!nome.trim()) return setErro("Diga o que você quer comprar para a IA analisar.");
    setIa("");
    setIaErro("");
    setIaCarregando(true);
    try {
      setIa(await consultarIA({ modo: "compra", nome: nome.trim(), valor: d.v, parcelas: d.p, categoria }));
    } catch (e) {
      setIaErro(e instanceof Error ? e.message : "Falha ao consultar a IA.");
    } finally {
      setIaCarregando(false);
    }
  }

  const cor = {
    ok: "bg-primary/15 text-foreground",
    atencao: "bg-warning/20 text-foreground",
    nao: "bg-danger/15 text-foreground",
  };

  return (
    <Modal titulo="Posso comprar?" onFechar={onFechar}>
      <form onSubmit={analisar} className="space-y-3">
        <p className="text-xs text-subtle">
          Confere se a compra cabe no saldo e no limite da categoria. Para a opinião da IA, diga também o que é.
        </p>
        <input className={campo} placeholder="O que é? (ex: Notebook)" value={nome} onChange={(e) => setNome(e.target.value)} />
        <CampoValor rotulo="Valor total" valor={valor} onChange={setValor} />
        <input className={campo} type="number" min={1} placeholder="Parcelas" value={parcelas} onChange={(e) => setParcelas(e.target.value)} aria-label="Parcelas" />
        <select className={campo} value={categoria} onChange={(e) => setCategoria(e.target.value as Categoria)} aria-label="Categoria">
          {CATEGORIAS.map((c) => (
            <option key={c} value={c}>
              {ROTULO[c]}
            </option>
          ))}
        </select>
        {erro && <p className="text-sm text-danger">{erro}</p>}
        <button type="submit" className={botaoPrimario}>
          Analisar
        </button>
        <button type="button" disabled={iaCarregando} onClick={pedirIA} className="w-full rounded-full border border-strong px-6 py-3 font-medium text-strong">
          {iaCarregando ? "Consultando a IA..." : "🤖 Pedir parecer da IA"}
        </button>
      </form>
      {parecer && <p className={`animar-entrada mt-4 rounded-lg p-3 text-sm ${cor[parecer.nivel]}`}>{parecer.texto}</p>}
      {ia && <p className="animar-entrada mt-3 whitespace-pre-wrap rounded-lg bg-muted p-3 text-sm">{ia}</p>}
      {iaErro && <p className="mt-3 text-sm text-danger">{iaErro}</p>}
      <p className="mt-3 text-xs text-subtle">Análise sobre: {rotuloVisao}, mês selecionado.</p>
    </Modal>
  );
}

export type NovaRenda = { descricao: string; valor: number; dia: number; inicio: string; conta_id: string | null };

export function FormRendaFixa({
  mesAtual,
  contas,
  onSalvar,
  onFechar,
}: {
  mesAtual: string;
  contas: Conta[];
  onSalvar: (r: NovaRenda) => Promise<string | null>;
  onFechar: () => void;
}) {
  const [descricao, setDescricao] = useState("Salário");
  const [valor, setValor] = useState("");
  const [dia, setDia] = useState("5");
  const [inicio, setInicio] = useState(mesAtual);
  const [contaId, setContaId] = useState<string | null>(contas.length === 1 ? contas[0].id : null);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function salvar(ev: React.FormEvent) {
    ev.preventDefault();
    const v = parseValor(valor);
    const d = Math.floor(Number(dia));
    if (!descricao.trim()) return setErro("Informe um nome (ex: Salário).");
    if (!(v > 0)) return setErro("Informe um valor maior que zero.");
    if (!(d >= 1 && d <= 28)) return setErro("O dia deve ficar entre 1 e 28.");
    if (!/^\d{4}-\d{2}$/.test(inicio)) return setErro("Escolha o mês de início.");
    setSalvando(true);
    const falha = await onSalvar({ descricao: descricao.trim(), valor: v, dia: d, inicio, conta_id: contaId });
    setSalvando(false);
    if (falha) setErro(falha);
    else onFechar();
  }

  return (
    <Modal titulo="Cadastrar salário (renda fixa)" onFechar={onFechar}>
      <form onSubmit={salvar} className="space-y-3">
        <p className="text-xs text-subtle">
          Conta automaticamente em todo mês, a partir do mês escolhido, sem precisar lançar de novo. Para dinheiro que cai sem data
          certa (freelas, vendas), use + Cadastrar &gt; Entrada quando ele chegar.
        </p>
        <input className={campo} placeholder="Nome (ex: Salário)" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        <CampoValor rotulo="Valor mensal" valor={valor} onChange={setValor} />
        <label className="block text-sm text-subtle">
          Dia em que cai (1 a 28)
          <input className={`${campo} mt-1`} type="number" min={1} max={28} value={dia} onChange={(e) => setDia(e.target.value)} />
        </label>
        <label className="block text-sm text-subtle">
          Vale a partir de
          <input className={`${campo} mt-1`} type="month" value={inicio} onChange={(e) => setInicio(e.target.value)} />
        </label>
        <SeletorConta contas={contas} valor={contaId} onChange={setContaId} />
        {erro && <p className="text-sm text-danger">{erro}</p>}
        <button type="submit" disabled={salvando} className={botaoPrimario}>
          {salvando ? "Salvando..." : "Salvar salário"}
        </button>
      </form>
    </Modal>
  );
}

export type NovoParcelamento = {
  descricao: string;
  valor_total: number;
  parcelas: number;
  primeira: string;
  categoria: Categoria;
  escopo: Escopo;
  conta_id: string | null;
  data_compra: string;
  dia_vencimento: number | null;
};

const dataBR = (d: string) => d.split("-").reverse().join("/");

export function FormParcelamento({
  mesInicial,
  escopoInicial,
  contas,
  onSalvar,
  onFechar,
}: {
  mesInicial: string;
  escopoInicial: Escopo;
  contas: Conta[];
  onSalvar: (p: NovoParcelamento) => Promise<string | null>;
  onFechar: () => void;
}) {
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [parcelas, setParcelas] = useState("");
  const [dataCompra, setDataCompra] = useState(hoje);
  const [primeiraManual, setPrimeiraManual] = useState(mesInicial);
  const [categoria, setCategoria] = useState<Categoria>("necessidade");
  const [escopo, setEscopo] = useState<Escopo>(escopoInicial);
  const [contaId, setContaId] = useState<string | null>(contas.length === 1 ? contas[0].id : null);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  const v = parseValor(valor);
  const n = Math.floor(Number(parcelas));
  const previa = v > 0 && n >= 2 ? `${n}x de ${brl(v / n)}` : "";

  // Cartão com fechamento e vencimento: a fatura da primeira parcela sai da data da compra.
  const conta = contas.find((c) => c.id === contaId);
  const fechamento = conta?.dia_fechamento ?? null;
  const vencimento = conta?.dia_vencimento ?? null;
  const fatura = fechamento && vencimento && dataCompra ? faturaDaCompra(dataCompra, fechamento, vencimento) : null;
  const primeira = fatura ? fatura.mes : primeiraManual;

  async function salvar(ev: React.FormEvent) {
    ev.preventDefault();
    if (!descricao.trim()) return setErro("Informe o que foi comprado.");
    if (!(v > 0)) return setErro("Informe o valor total.");
    if (!(n >= 2 && n <= 120)) return setErro("Informe de 2 a 120 parcelas.");
    if (!dataCompra) return setErro("Informe a data da compra.");
    if (!/^\d{4}-\d{2}$/.test(primeira)) return setErro("Escolha o mês da primeira parcela.");
    setSalvando(true);
    const falha = await onSalvar({
      descricao: descricao.trim(),
      valor_total: v,
      parcelas: n,
      primeira,
      categoria,
      escopo,
      conta_id: contaId,
      data_compra: dataCompra,
      dia_vencimento: fatura ? vencimento : null,
    });
    setSalvando(false);
    if (falha) setErro(falha);
    else onFechar();
  }

  return (
    <Modal titulo="Nova compra a prazo" onFechar={onFechar}>
      <form onSubmit={salvar} className="space-y-3">
        <p className="text-xs text-subtle">
          Informe o valor total e o número de parcelas. O sistema lança uma parcela por mês e soma tudo que vence em cada mês.
        </p>
        <input className={campo} placeholder="O que foi comprado? (ex: Geladeira)" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        <CampoValor rotulo="Valor total" valor={valor} onChange={setValor} />
        <input className={campo} type="number" min={2} max={120} placeholder="Número de parcelas" value={parcelas} onChange={(e) => setParcelas(e.target.value)} aria-label="Número de parcelas" />
        {previa && <p className="text-sm font-medium">{previa}</p>}
        <select className={campo} value={escopo} onChange={(e) => setEscopo(e.target.value as Escopo)} aria-label="De quem">
          <option value="pessoal">Compra pessoal</option>
          <option value="casal">Compra do casal (dividida)</option>
        </select>
        <SeletorConta contas={contas} valor={contaId} onChange={setContaId} />
        <label className="block text-sm text-subtle">
          Data da compra
          <input className={`${campo} mt-1`} type="date" value={dataCompra} onChange={(e) => setDataCompra(e.target.value)} />
        </label>
        {fatura ? (
          <p className="animar-entrada rounded-lg bg-primary/10 p-3 text-xs">
            💳 <strong>{conta?.nome}</strong> fecha dia {fechamento} e vence dia {vencimento}. Esta compra cai na fatura que vence em{" "}
            <strong>{dataBR(fatura.vencimento)}</strong> ({rotuloMes(fatura.mes)}); as demais parcelas vencem todo dia {vencimento}.
            {escopo === "casal" && " Mesmo sendo do casal, vale o fechamento e o vencimento do seu cartão: o acerto entre vocês continua automático."}
          </p>
        ) : (
          <label className="block text-sm text-subtle">
            Mês da primeira parcela
            <input className={`${campo} mt-1`} type="month" value={primeiraManual} onChange={(e) => setPrimeiraManual(e.target.value)} />
            <span className="mt-1 block text-xs">
              {conta ? "Este banco ainda não tem fechamento e vencimento: defina em Meus bancos (💳) para calcular a fatura sozinho." : "Escolha um cartão acima para calcular a fatura pelo fechamento e vencimento."}
            </span>
          </label>
        )}
        <SugestaoCategoria descricao={descricao} categoria={categoria} onEscolher={setCategoria} />
        <select className={campo} value={categoria} onChange={(e) => setCategoria(e.target.value as Categoria)} aria-label="Categoria">
          {CATEGORIAS.map((c) => (
            <option key={c} value={c}>
              {ROTULO[c]}
            </option>
          ))}
        </select>
        <p className="text-xs text-subtle">
          As parcelas entram como gasto em cada mês em que vencem, na categoria escolhida, e já contam nos limites 50/30/20.
        </p>
        {erro && <p className="text-sm text-danger">{erro}</p>}
        <button type="submit" disabled={salvando} className={botaoPrimario}>
          {salvando ? "Salvando..." : "Salvar compra"}
        </button>
      </form>
    </Modal>
  );
}

export type LinhaAdiantamento = { parcelamento_id: string; indice: number; valor: number };

/**
 * Adiantar dívidas: paga antes do vencimento uma fatura inteira (um mês) ou as próximas parcelas de uma compra.
 * As parcelas saem da fatura original e passam a valer na data em que foram pagas.
 */
export function FormAdiantar({
  modo,
  parcelamentos,
  contas,
  adiantadas,
  mesPadrao,
  compraId,
  onSalvar,
  onFechar,
}: {
  modo: "fatura" | "compra";
  parcelamentos: Parcelamento[];
  contas: Conta[];
  adiantadas: Adiantada[];
  mesPadrao: string;
  compraId?: string;
  onSalvar: (linhas: LinhaAdiantamento[], pagoEm: string, valorPago: number) => Promise<string | null>;
  onFechar: () => void;
}) {
  const hojeStr = hoje();
  const [mesAlvo, setMesAlvo] = useState(mesPadrao);
  const [contaFiltro, setContaFiltro] = useState<string | null>(null);
  const [qtd, setQtd] = useState("1");
  const [pagoEm, setPagoEm] = useState(hojeStr);
  const [valorPago, setValorPago] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  // Só dá para adiantar o que ainda não venceu.
  const aVencer = (p: Parcelamento) => pendentes(p, hojeStr.slice(0, 7), adiantadas).filter((k) => vencimentoDaParcela(p, k) >= hojeStr);
  const linhaDe = (p: Parcelamento, k: number) => ({
    parcelamento_id: p.id,
    indice: k,
    valor: valorDaParcela(p, k),
    descricao: `${p.descricao} (${k + 1}/${p.parcelas})`,
    vence: vencimentoDaParcela(p, k),
  });

  const compra = modo === "compra" ? parcelamentos.find((p) => p.id === compraId) : undefined;
  const disponiveis = compra ? aVencer(compra).length : 0;
  const linhas =
    modo === "compra"
      ? compra
        ? aVencer(compra)
            .slice(0, Math.max(1, Math.floor(Number(qtd)) || 1))
            .map((k) => linhaDe(compra, k))
        : []
      : parcelamentos
          .filter((p) => contaFiltro === null || p.conta_id === contaFiltro)
          .flatMap((p) => aVencer(p).filter((k) => addMeses(p.primeira, k) === mesAlvo).map((k) => linhaDe(p, k)));

  const totalOriginal = linhas.reduce((acc, l) => acc + l.valor, 0);
  const pagoTotal = valorPago ? parseValor(valorPago) : totalOriginal;
  const diferenca = totalOriginal - pagoTotal;

  async function salvar(ev: React.FormEvent) {
    ev.preventDefault();
    if (linhas.length === 0) return setErro("Não há parcelas a vencer para adiantar nesta escolha.");
    if (!pagoEm) return setErro("Informe a data do pagamento.");
    if (!(pagoTotal >= 0)) return setErro("Informe o valor pago.");
    setSalvando(true);
    const falha = await onSalvar(
      linhas.map(({ parcelamento_id, indice, valor }) => ({ parcelamento_id, indice, valor })),
      pagoEm,
      pagoTotal,
    );
    setSalvando(false);
    if (falha) setErro(falha);
    else onFechar();
  }

  return (
    <Modal titulo={modo === "fatura" ? "Adiantar fatura de um mês" : `Adiantar parcelas · ${compra?.descricao ?? ""}`} onFechar={onFechar}>
      <form onSubmit={salvar} className="space-y-3">
        <p className="text-xs text-subtle">
          Adiantar tira estas parcelas da fatura original e lança o pagamento na data que você informar. Se o banco deu desconto de
          juros, informe o valor realmente pago.
        </p>

        {modo === "fatura" && (
          <>
            <label className="block text-sm text-subtle">
              Mês da fatura que será adiantada
              <input className={`${campo} mt-1`} type="month" value={mesAlvo} onChange={(e) => setMesAlvo(e.target.value)} />
            </label>
            {contas.length > 0 && (
              <div>
                <p className="mb-1.5 text-sm text-subtle">Cartão / banco</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setContaFiltro(null)}
                    className={`rounded-full border px-3 py-1.5 text-sm ${contaFiltro === null ? "border-strong bg-strong text-background" : "border-line"}`}
                  >
                    Todos
                  </button>
                  {contas.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setContaFiltro(c.id)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm ${contaFiltro === c.id ? "border-strong bg-strong text-background" : "border-line"}`}
                    >
                      <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: c.cor }} />
                      {c.nome}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {modo === "compra" && disponiveis > 0 && (
          <div>
            <p className="mb-1.5 text-sm text-subtle">Quantas parcelas adiantar? (a vencer: {disponiveis})</p>
            <div className="flex flex-wrap items-center gap-2">
              <input
                className="w-24 rounded-lg border border-line bg-background px-3 py-2"
                type="number"
                min={1}
                max={disponiveis}
                value={qtd}
                onChange={(e) => setQtd(e.target.value)}
                aria-label="Quantidade de parcelas"
              />
              <button type="button" onClick={() => setQtd(String(disponiveis))} className="rounded-full border border-line px-3 py-1.5 text-sm text-subtle">
                Quitar todas ({disponiveis})
              </button>
            </div>
          </div>
        )}

        {linhas.length === 0 ? (
          <p className="rounded-lg bg-muted p-3 text-sm text-subtle">
            {modo === "fatura" ? "Nenhuma parcela a vencer neste mês (ou já foram adiantadas)." : "Esta compra não tem parcelas a vencer para adiantar."}
          </p>
        ) : (
          <ul className="space-y-1 rounded-lg bg-muted p-3 text-sm">
            {linhas.map((l) => (
              <li key={`${l.parcelamento_id}-${l.indice}`} className="flex flex-wrap justify-between gap-x-3">
                <span className="min-w-0 break-words">{l.descricao}</span>
                <span className="text-subtle">
                  {brl(l.valor)} · venceria {dataBR(l.vence)}
                </span>
              </li>
            ))}
            <li className="flex justify-between border-t border-line pt-2 font-medium">
              <span>Total original</span>
              <span>{brl(totalOriginal)}</span>
            </li>
          </ul>
        )}

        <label className="block text-sm text-subtle">
          Data em que você pagou
          <input className={`${campo} mt-1`} type="date" value={pagoEm} onChange={(e) => setPagoEm(e.target.value)} />
        </label>
        <div>
          <p className="mb-1.5 text-sm text-subtle">Valor pago (deixe em branco se pagou o total)</p>
          <CampoValor rotulo="Valor pago" valor={valorPago} onChange={setValorPago} placeholder={totalOriginal > 0 ? totalOriginal.toFixed(2).replace(".", ",") : "0,00"} />
          {linhas.length > 0 && Math.abs(diferenca) >= 0.01 && (
            <p className={`mt-1 text-xs ${diferenca > 0 ? "text-primary" : "text-danger"}`}>
              {diferenca > 0 ? `Desconto de ${brl(diferenca)}` : `Acréscimo de ${brl(-diferenca)}`}
            </p>
          )}
        </div>
        {erro && <p className="text-sm text-danger">{erro}</p>}
        <button type="submit" disabled={salvando || linhas.length === 0} className={botaoPrimario}>
          {salvando ? "Salvando..." : "Registrar adiantamento"}
        </button>
      </form>
    </Modal>
  );
}
