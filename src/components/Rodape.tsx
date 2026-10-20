const links = [
  {
    nome: "Instagram",
    texto: "@otavioh.dev",
    href: "https://www.instagram.com/otavioh.dev/",
    icone: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    nome: "GitHub",
    texto: "otaviohenrique-dev-web",
    href: "https://github.com/otaviohenrique-dev-web",
    icone: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
        <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.76 2.69 1.25 3.35.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.62 1.59.23 2.76.11 3.05.74.81 1.18 1.83 1.18 3.09 0 4.42-2.7 5.4-5.27 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
      </svg>
    ),
  },
];

export default function Rodape() {
  return (
    <footer className="mt-10 border-t border-line bg-surface/70 px-4 pb-24 pt-6 text-sm text-subtle backdrop-blur sm:px-6 sm:pb-6">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 sm:flex-row">
        <p>
          Desenvolvido por <strong className="text-foreground">Otávio Henrique</strong>
        </p>
        <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          {links.map((l) => (
            <li key={l.nome}>
              <a
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${l.nome} de Otávio Henrique`}
                className="inline-flex items-center gap-1.5 transition-colors hover:text-primary"
              >
                {l.icone}
                <span>{l.texto}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
