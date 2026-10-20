"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import type { Session } from "@supabase/supabase-js";
import { hoje, type Pessoa, type Resumo, type Transacao, resumir, noMes } from "@/lib/finance";
import { configurado, supabase } from "@/lib/supabase";
import { Tutorial } from "./Ajuda";
import { FormCompra, FormLancamento, type NovaTransacao } from "./Forms";
import { Logo, Marca } from "./Marca";
import { PainelCasal, PainelPessoal } from "./Views";

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

async function buscar(): Promise<{ erro: string } | { pessoas: Pessoa[]; transacoes: Transacao[] }> {
  const [a, t] = await Promise.all([
    supabase.from("autorizados").select("email,nome"),
    supabase.from("transacoes").select("*").order("data", { ascending: false }),
  ]);
  const falha = a.error ?? t.error;
  if (falha) return { erro: falha.message };
  return {
    pessoas: (a.data ?? []).map((p) => ({ email: p.email.toLowerCase(), nome: p.nome ?? p.email.split("@")[0] })),
    transacoes: (t.data ?? []).map((x) => ({ ...x, autor_email: x.autor_email.toLowerCase(), valor: Number(x.valor) })),
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
  const [carregado, setCarregado] = useState(false);
  const [erro, setErro] = useState("");
  const [visao, setVisao] = useState<Visao>("meu");
  const [modal, setModal] = useState<"lancar" | "comprar" | "ajuda" | null>(null);
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
    await supabase.auth.signOut();
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
  const mes = hoje().slice(0, 7);

  // Resumo usado pelo "Posso Comprar?" de acordo com a visão ativa
  const resumoVisao: Resumo =
    visao === "casal"
      ? resumir(noMes(transacoes, mes))
      : resumir(noMes(transacoes, mes).filter((t) => t.autor_email === email && t.escopo === "pessoal"));

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

        {erro && <p className="rounded-lg bg-danger/15 px-4 py-3 text-sm text-danger">{erro}</p>}

        {visao === "meu" && (
          <PainelPessoal
            transacoes={transacoes}
            pessoa={eu}
            eu={eu}
            mes={mes}
            somenteLeitura={false}
            nomeDe={nomeDe}
            onExcluir={excluir}
            onNovo={() => setModal("lancar")}
            onComprar={() => setModal("comprar")}
          />
        )}
        {visao === "par" &&
          (par ? (
            <PainelPessoal
              transacoes={transacoes}
              pessoa={par}
              eu={eu}
              mes={mes}
              somenteLeitura
              nomeDe={nomeDe}
              onExcluir={excluir}
              onNovo={() => {}}
              onComprar={() => {}}
            />
          ) : (
            <p className="rounded-2xl bg-surface p-5 text-subtle">
              Nenhum par autorizado ainda. Adicione o e-mail dele na tabela <code>autorizados</code> do Supabase.
            </p>
          ))}
        {visao === "casal" && (
          <PainelCasal
            transacoes={transacoes}
            eu={eu}
            par={par}
            mes={mes}
            nomeDe={nomeDe}
            onExcluir={excluir}
            onNovo={() => setModal("lancar")}
            onComprar={() => setModal("comprar")}
          />
        )}
      </main>

      {modal === "ajuda" && <Tutorial onFechar={() => setModal(null)} />}
      {modal === "lancar" && (
        <FormLancamento escopoInicial={visao === "casal" ? "casal" : "pessoal"} onSalvar={salvar} onFechar={() => setModal(null)} />
      )}
      {modal === "comprar" && (
        <FormCompra resumo={resumoVisao} rotuloVisao={visao === "casal" ? "Casal" : "Meu painel"} onFechar={() => setModal(null)} />
      )}
    </div>
  );
}
