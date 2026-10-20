const perfis = ["Meu Painel", "Painel do Par", "Painel do Casal"];

const resumo = [
  { titulo: "Disponível para gastar", valor: "R$ 0,00", cor: "text-primary" },
  { titulo: "Reservado / Guardado", valor: "R$ 0,00", cor: "text-navy" },
  { titulo: "Contas a vencer", valor: "R$ 0,00", cor: "text-warning" },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="bg-navy px-6 py-4 text-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">o&amp;eBanq</h1>
          <nav className="flex gap-1 rounded-full bg-navy-soft p-1 text-sm">
            {perfis.map((perfil, i) => (
              <button
                key={perfil}
                className={`rounded-full px-4 py-1.5 ${
                  i === 0 ? "bg-primary font-medium text-navy" : "text-slate-300"
                }`}
              >
                {perfil}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        <section className="grid gap-4 sm:grid-cols-3">
          {resumo.map((item) => (
            <div key={item.titulo} className="rounded-2xl bg-surface p-5 shadow-sm">
              <p className="text-sm text-slate-500">{item.titulo}</p>
              <p className={`mt-2 text-2xl font-semibold ${item.cor}`}>{item.valor}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 flex flex-wrap gap-3">
          <button className="rounded-full bg-primary px-6 py-3 font-medium text-navy">
            + Cadastrar Gasto
          </button>
          <button className="rounded-full border border-navy px-6 py-3 font-medium text-navy">
            🔍 Posso Comprar?
          </button>
        </section>
      </main>
    </div>
  );
}
