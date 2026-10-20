"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  addMeses,
  CORES_CONTA,
  distribuirPagamento,
  expandir,
  hoje,
  resumirMes,
  rotuloMes,
  saldoPorConta,
  type Adiantada,
  type Conta,
  type Parcelamento,
  type Pessoa,
  type RendaFixa,
  type Resumo,
  type Transacao,
} from "@/lib/finance";
import { configurado, supabase } from "@/lib/supabase";
import { Tutorial } from "./Ajuda";
import Consultor from "./Consultor";
import { FormLancamento, type NovaTransacao } from "./Forms";
import {
  FormAdiantar,
  FormCompra,
  FormParcelamento,
  FormRendaFixa,
  type LinhaAdiantamento,
  type NovaRenda,
  type NovoParcelamento,
} from "./FormsPrazo";
import { Logo, Marca } from "./Marca";
import { PainelCasal, PainelPessoal, type Gestao } from "./Views";

type Visao = "meu" | "par" | "casal";

function assinarTema(cb: () => void) {
  const o = new MutationObserver(cb);
  o.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => o.disconnect();
}

function BotaoTema() {
  const escuro = useSyncExternalStore(
    assinarTema,
    () => document.documentElement.dataset.theme === "dark",
    () => false,
  );
  function alternar() {
    const proximo = escuro ? "light" : "dark";
    document.documentElement.dataset.theme = proximo;
    try {
      localStorage.setItem("tema", proximo);
    } catch {}
  }
  return (
    <button
      type="button"
      role="switch"
      aria-checked={escuro}
      aria-label="Alternar tema escuro"
      title={escuro ? "Mudar para tema claro" : "Mudar para tema escuro"}
      onClick={alternar}
      className="relative flex h-8 w-16 items-center justify-between rounded-full bg-white/15 px-2 text-sm"
    >
      <span aria-hidden>☀️</span>
      <span aria-hidden>🌙</span>
      <span
        aria-hidden
        className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-[left] duration-200 ${escuro ? "left-9" : "left-1"}`}
      />
    </button>
  );
}

function Avatar({ sessao, nome }: { sessao: Session; nome: string }) {
  const url = sessao.user.user_metadata?.avatar_url as string | undefined;
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={nome} referrerPolicy="no-referrer" className="h-9 w-9 rounded-full object-cover" />;
  }
  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary font-semibold text-on-primary">
      {nome.charAt(0).toUpperCase()}
    </span>
  );
}

function Tela({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 py-16 text-center">
      <div className="absolute right-4 top-4 rounded-full bg-header p-1">
        <BotaoTema />
      </div>
      <div className="animar-entrada flex flex-col items-center gap-5">{children}</div>
    </div>
  );
}

type Carga = {
  pessoas: Pessoa[];
  transacoes: Transacao[];
  rendas: RendaFixa[];
  parcelamentos: Parcelamento[];
  contas: Conta[];
  adiantadas: Adiantada[];
};

async function buscar(): Promise<{ erro: string } | Carga> {
  const [a, t, r, p, c, d] = await Promise.all([
    supabase.from("autorizados").select("email,nome"),
    supabase.from("transacoes").select("*").order("data", { ascending: false }),
    supabase.from("rendas_fixas").select("*").order("inicio", { ascending: false }),
    supabase.from("parcelamentos").select("*").order("primeira", { ascending: false }),
    supabase.from("contas").select("*").order("criado_em", { ascending: true }),
    supabase.from("parcelas_adiantadas").select("*"),
  ]);
  const falha = a.error ?? t.error ?? r.error ?? p.error ?? c.error ?? d.error;
  if (falha) {
    const faltaTabela = /rendas_fixas|parcelamentos|contas|conta_id|parcelas_adiantadas|dia_fechamento|dia_vencimento|data_compra/.test(falha.message);
    return {
      erro: faltaTabela
        ? "Faltam tabelas ou colunas no banco. No Supabase (SQL Editor), rode, em ordem, os arquivos 02, 03 e 04 da pasta supabase."
        : falha.message,
    };
  }
  const minusculo = <T extends { autor_email: string }>(x: T) => ({ ...x, autor_email: x.autor_email.toLowerCase() });
  return {
    pessoas: (a.data ?? []).map((x) => ({ email: x.email.toLowerCase(), nome: x.nome ?? x.email.split("@")[0] })),
    transacoes: (t.data ?? []).map((x) => ({ ...minusculo(x), valor: Number(x.valor) })),
    rendas: (r.data ?? []).map((x) => ({ ...minusculo(x), valor: Number(x.valor) })),
    parcelamentos: (p.data ?? []).map((x) => ({ ...minusculo(x), valor_total: Number(x.valor_total) })),
    contas: (c.data ?? []).map((x) => ({ ...minusculo(x), saldo_inicial: Number(x.saldo_inicial) })),
    adiantadas: (d.data ?? []).map((x) => ({
      ...minusculo(x),
      valor_pago: Number(x.valor_pago),
      pago_por: x.pago_por ? String(x.pago_por).toLowerCase() : null,
    })),
  };
}

function entrarComGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin },
  });
}

export default function App() {
  const [sessao, setSessao] = useState<Session | null | undefined>(undefined);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [rendas, setRendas] = useState<RendaFixa[]>([]);
  const [parcelamentos, setParcelamentos] = useState<Parcelamento[]>([]);
  const [contas, setContas] = useState<Conta[]>([]);
  const [adiantadas, setAdiantadas] = useState<Adiantada[]>([]);
  const [alvoAdiantar, setAlvoAdiantar] = useState<string | null>(null);
  const [carregado, setCarregado] = useState(false);
  const [erro, setErro] = useState("");
  const [visao, setVisao] = useState<Visao>("meu");
  const [mesSel, setMesSel] = useState<string | null>(null);
  const [modal, setModal] = useState<"lancar" | "comprar" | "ajuda" | "renda" | "parcelamento" | "adiantar" | null>(null);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSessao(data.session));
    const { data } = supabase.auth.onAuthStateChange((_evento, s) => setSessao(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const email = sessao?.user.email?.toLowerCase();

  const aplicar = useCallback((r: Awaited<ReturnType<typeof buscar>>) => {
    if ("erro" in r) {
      setErro(r.erro);
      return;
    }
    setErro("");
    setPessoas(r.pessoas);
    setTransacoes(r.transacoes);
    setRendas(r.rendas);
    setParcelamentos(r.parcelamentos);
    setContas(r.contas);
    setAdiantadas(r.adiantadas);
    setCarregado(true);
    // Primeiro acesso neste navegador: abre o guia "Como usar" uma única vez.
    try {
      if (!localStorage.getItem("tutorial-visto")) {
        localStorage.setItem("tutorial-visto", "1");
        setModal("ajuda");
      }
    } catch {}
  }, []);

  const carregar = useCallback(() => buscar().then(aplicar), [aplicar]);

  useEffect(() => {
    if (email) buscar().then(aplicar);
  }, [email, aplicar]);

  async function sair() {
    setMenu(false);
    setCarregado(false);
    setPessoas([]);
    setTransacoes([]);
    setRendas([]);
    setParcelamentos([]);
    setContas([]);
    setAdiantadas([]);
    await supabase.auth.signOut();
  }

  // Grava, recarrega e devolve a mensagem de erro (ou null).
  async function gravar(pedido: PromiseLike<{ error: { message: string } | null }>): Promise<string | null> {
    const { error } = await pedido;
    if (error) return error.message;
    await carregar();
    return null;
  }

  const salvarRenda = (r: NovaRenda) => gravar(supabase.from("rendas_fixas").insert({ ...r, autor_email: email }));
  const salvarParcelamento = (p: NovoParcelamento) => gravar(supabase.from("parcelamentos").insert({ ...p, autor_email: email }));

  async function aoFalhar(pedido: PromiseLike<{ error: { message: string } | null }>) {
    const falha = await gravar(pedido);
    if (falha) setErro(falha);
  }

  const adicionarConta = (nome: string, saldoInicial: number) =>
    gravar(
      supabase.from("contas").insert({
        nome,
        cor: CORES_CONTA[contas.length % CORES_CONTA.length],
        saldo_inicial: saldoInicial,
        autor_email: email,
      }),
    );

  // Registra o pagamento antecipado: as parcelas saem da fatura original e entram na data paga.
  const salvarAdiantamento = (linhas: LinhaAdiantamento[], pagoEm: string, valorPago: number, pagoPor: string, pagoComConta: string | null) => {
    const valores = distribuirPagamento(linhas.map((l) => l.valor), valorPago);
    return gravar(
      supabase.from("parcelas_adiantadas").insert(
        linhas.map((l, i) => ({
          parcelamento_id: l.parcelamento_id,
          indice: l.indice,
          pago_em: pagoEm,
          valor_pago: valores[i],
          pago_por: pagoPor,
          pago_com_conta_id: pagoComConta,
          autor_email: email,
        })),
      ),
    );
  };

  function desfazerAdiantamento(parcelamentoId: string) {
    if (!window.confirm("Desfazer os pagamentos que você registrou desta compra? As parcelas voltam para as datas originais.")) return;
    return aoFalhar(supabase.from("parcelas_adiantadas").delete().eq("parcelamento_id", parcelamentoId).eq("autor_email", email));
  }

  const definirCartao = (id: string, fechamento: number | null, vencimento: number | null) =>
    gravar(supabase.from("contas").update({ dia_fechamento: fechamento, dia_vencimento: vencimento }).eq("id", id));

  function encerrarRenda(id: string) {
    const renda = rendas.find((x) => x.id === id);
    if (!renda) return;
    // Deixa de contar a partir do mês atual; se nunca chegou a valer, apaga.
    const fim = addMeses(hoje().slice(0, 7), -1);
    if (renda.inicio > fim) return aoFalhar(supabase.from("rendas_fixas").delete().eq("id", id));
    return aoFalhar(supabase.from("rendas_fixas").update({ fim }).eq("id", id));
  }

  async function salvar(nova: NovaTransacao): Promise<string | null> {
    const { error } = await supabase.from("transacoes").insert({ ...nova, autor_email: email });
    if (error) return error.message;
    await carregar();
    return null;
  }

  async function excluir(id: string) {
    const { error } = await supabase.from("transacoes").delete().eq("id", id);
    if (error) setErro(error.message);
    else await carregar();
  }

  if (!configurado) {
    return (
      <Tela>
        <h1 className="text-2xl font-semibold">Configuração pendente</h1>
        <p className="max-w-md text-subtle">
          Defina <code>NEXT_PUBLIC_SUPABASE_URL</code> e <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> (veja <code>.env.example</code>) e reinicie.
        </p>
      </Tela>
    );
  }

  if (sessao === undefined) {
    return (
      <Tela>
        <p className="text-subtle">Carregando...</p>
      </Tela>
    );
  }

  if (!sessao || !email) {
    return (
      <Tela>
        <Marca size={96} />
        <h1 className="text-3xl font-semibold tracking-tight">o-ebanq</h1>
        <p className="max-w-sm text-subtle">Finanças a dois, com clareza e segurança. Entre com a conta Google autorizada.</p>
        <button type="button" onClick={entrarComGoogle} className="flex items-center gap-3 rounded-full bg-primary px-6 py-3 font-medium text-on-primary">
          <span aria-hidden className="flex h-6 w-6 items-center justify-center rounded-full bg-white font-bold text-blue-600">G</span>
          Entrar com Google
        </button>
      </Tela>
    );
  }

  if (erro && !carregado) {
    return (
      <Tela>
        <h1 className="text-xl font-semibold">Não foi possível carregar os dados</h1>
        <p className="max-w-md text-sm text-danger">{erro}</p>
        <button type="button" onClick={carregar} className="rounded-full border border-strong px-6 py-3 text-strong">
          Tentar de novo
        </button>
      </Tela>
    );
  }

  if (!carregado) {
    return (
      <Tela>
        <p className="text-subtle">Carregando seus dados...</p>
      </Tela>
    );
  }

  // O banco só devolve a lista de autorizados para quem já está nela.
  const euAutorizado = pessoas.find((p) => p.email === email);
  if (!euAutorizado) {
    return (
      <Tela>
        <h1 className="text-2xl font-semibold">Acesso não autorizado</h1>
        <p className="max-w-md text-subtle">
          A conta <strong>{email}</strong> não tem permissão para usar o sistema.
        </p>
        <button type="button" onClick={sair} className="rounded-full border border-strong px-6 py-3 text-strong">
          Sair e usar outra conta
        </button>
      </Tela>
    );
  }

  const nomeGoogle = (sessao.user.user_metadata?.full_name as string | undefined) ?? euAutorizado.nome;
  const eu: Pessoa = { email, nome: euAutorizado.nome || nomeGoogle };
  const par = pessoas.find((p) => p.email !== email);
  const nomeDe = (e: string) => pessoas.find((p) => p.email === e)?.nome ?? e.split("@")[0];
  const mesAtual = hoje().slice(0, 7);
  const mes = mesSel ?? mesAtual;
  const mesMin = addMeses(mesAtual, -24);
  const mesMax = addMeses(mesAtual, 24);

  // Lançamentos reais + renda fixa e parcelas geradas para cada mês
  const todas = expandir(transacoes, rendas, parcelamentos, mesMax, adiantadas);

  // Resumo usado pelo "Posso Comprar?" de acordo com a visão ativa
  const resumoVisao: Resumo = resumirMes(
    todas,
    mes,
    visao === "casal" ? undefined : (t) => t.autor_email === email && t.escopo === "pessoal",
  );

  async function consultarIA(pedido: Record<string, unknown>): Promise<string> {
    const resposta = await fetch("/api/ia", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${sessao?.access_token ?? ""}` },
      body: JSON.stringify({ ...pedido, visao: visao === "casal" ? "casal" : "pessoal", mes }),
    });
    const json = await resposta.json().catch(() => ({}));
    if (!resposta.ok) throw new Error(json.erro ?? "Não foi possível consultar a IA.");
    return json.texto as string;
  }

  const saldos = saldoPorConta(todas, contas, hoje());
  const minhasContas = contas.filter((c) => c.autor_email === email);

  const g: Gestao = {
    hoje: hoje(),
    adiantadas,
    onAdiantarFatura: () => {
      setAlvoAdiantar(null);
      setModal("adiantar");
    },
    onAdiantarCompra: (id) => {
      setAlvoAdiantar(id);
      setModal("adiantar");
    },
    onDesfazerAdiantamento: desfazerAdiantamento,
    onDefinirCartao: definirCartao,
    contas,
    saldos,
    onAdicionarConta: adicionarConta,
    onExcluirConta: (id) => aoFalhar(supabase.from("contas").delete().eq("id", id)),
    rendas,
    parcelamentos,
    onNovo: () => setModal("lancar"),
    onComprar: () => setModal("comprar"),
    onNovaRenda: () => setModal("renda"),
    onEncerrarRenda: encerrarRenda,
    onExcluirRenda: (id) => aoFalhar(supabase.from("rendas_fixas").delete().eq("id", id)),
    onNovoParcelamento: () => setModal("parcelamento"),
    onExcluirParcelamento: (id) => aoFalhar(supabase.from("parcelamentos").delete().eq("id", id)),
    onExcluir: excluir,
  };

  const abas: { id: Visao; nome: string }[] = [
    { id: "meu", nome: "Meu painel" },
    { id: "par", nome: par ? par.nome : "Par" },
    { id: "casal", nome: "Casal" },
  ];

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 bg-header px-4 py-3 text-white shadow-md sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <h1>
            <Logo />
          </h1>
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              type="button"
              aria-label="Como usar"
              title="Como usar"
              onClick={() => setModal("ajuda")}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-sm font-semibold"
            >
              ?
            </button>
            <BotaoTema />
            <div className="relative">
              <button type="button" aria-label="Menu da conta" aria-expanded={menu} onClick={() => setMenu((m) => !m)} className="rounded-full">
                <Avatar sessao={sessao} nome={nomeGoogle} />
              </button>
              {menu && (
                <div className="animar-entrada absolute right-0 z-20 mt-2 w-60 rounded-xl bg-surface p-4 text-foreground shadow-xl">
                  <p className="truncate font-medium">{nomeGoogle}</p>
                  <p className="truncate text-xs text-subtle">{email}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setMenu(false);
                      setModal("ajuda");
                    }}
                    className="mt-3 w-full rounded-lg border border-line px-3 py-2 text-sm"
                  >
                    Como usar
                  </button>
                  <button type="button" onClick={sair} className="mt-2 w-full rounded-lg border border-line px-3 py-2 text-sm">
                    Sair
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-6 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <nav className="flex w-full gap-1 rounded-full bg-muted p-1 text-sm sm:inline-flex sm:w-auto" aria-label="Visões">
            {abas.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setVisao(a.id)}
                aria-current={visao === a.id}
                className={`min-w-0 flex-1 truncate rounded-full px-3 py-2 sm:flex-none sm:px-4 sm:py-1.5 ${visao === a.id ? "bg-primary font-medium text-on-primary" : "text-subtle"}`}
              >
                {a.nome}
              </button>
            ))}
          </nav>
          <div className="flex items-center justify-between gap-2 rounded-full bg-surface px-2 py-1 shadow-sm sm:justify-start">
            <button type="button" aria-label="Mês anterior" disabled={mes <= mesMin} onClick={() => setMesSel(addMeses(mes, -1))} className="h-8 w-8 rounded-full text-lg">
              ‹
            </button>
            <div className="min-w-36 text-center">
              <p className="text-sm font-medium capitalize">{rotuloMes(mes)}</p>
              {mes !== mesAtual && (
                <button type="button" onClick={() => setMesSel(null)} className="text-xs text-primary">
                  Voltar ao mês atual
                </button>
              )}
            </div>
            <button type="button" aria-label="Próximo mês" disabled={mes >= mesMax} onClick={() => setMesSel(addMeses(mes, 1))} className="h-8 w-8 rounded-full text-lg">
              ›
            </button>
          </div>
        </div>

        {erro && <p className="rounded-lg bg-danger/15 px-4 py-3 text-sm text-danger">{erro}</p>}

        {visao === "meu" && (
          <PainelPessoal transacoes={todas} pessoa={eu} eu={eu} mes={mes} somenteLeitura={false} nomeDe={nomeDe} g={g} />
        )}
        {visao === "par" &&
          (par ? (
            <PainelPessoal transacoes={todas} pessoa={par} eu={eu} mes={mes} somenteLeitura nomeDe={nomeDe} g={g} />
          ) : (
            <p className="rounded-2xl bg-surface p-5 text-subtle">
              Nenhum par autorizado ainda. Adicione o e-mail dele na tabela <code>autorizados</code> do Supabase.
            </p>
          ))}
        {visao === "casal" && (
          <PainelCasal transacoes={todas} eu={eu} par={par} mes={mes} nomeDe={nomeDe} g={g} />
        )}
      </main>

      <Consultor
        visao={visao === "casal" ? "casal" : "pessoal"}
        rotuloVisao={`${visao === "casal" ? "Casal" : visao === "par" ? "Seu painel pessoal" : "Meu painel"} · ${rotuloMes(mes)}`}
        consultarIA={consultarIA}
      />
      {modal === "ajuda" && <Tutorial onFechar={() => setModal(null)} />}
      {modal === "lancar" && (
        <FormLancamento
          escopoInicial={visao === "casal" ? "casal" : "pessoal"}
          contas={minhasContas}
          onSalvar={salvar}
          onSalvarCredito={salvarParcelamento}
          onFechar={() => setModal(null)}
        />
      )}
      {modal === "comprar" && (
        <FormCompra
          resumo={resumoVisao}
          rotuloVisao={visao === "casal" ? "Casal" : "Meu painel"}
          consultarIA={consultarIA}
          onFechar={() => setModal(null)}
        />
      )}
      {modal === "adiantar" && (
        <FormAdiantar
          modo={alvoAdiantar ? "compra" : "fatura"}
          compraId={alvoAdiantar ?? undefined}
          parcelamentos={parcelamentos}
          contas={contas}
          adiantadas={adiantadas}
          eu={eu}
          pessoas={pessoas}
          nomeDe={nomeDe}
          mesPadrao={addMeses(mes, 1)}
          onSalvar={salvarAdiantamento}
          onFechar={() => setModal(null)}
        />
      )}
      {modal === "renda" && <FormRendaFixa mesAtual={mesAtual} contas={minhasContas} onSalvar={salvarRenda} onFechar={() => setModal(null)} />}
      {modal === "parcelamento" && (
        <FormParcelamento
          mesInicial={mes}
          escopoInicial={visao === "casal" ? "casal" : "pessoal"}
          contas={minhasContas}
          onSalvar={salvarParcelamento}
          onFechar={() => setModal(null)}
        />
      )}
    </div>
  );
}
