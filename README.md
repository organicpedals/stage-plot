# Stage Plot

Mapas de palco, mapas de luz, input list, rider técnico e PDF. Funciona offline; os dados ficam no navegador/app.

## Versão online (GitHub Pages)
Todo push na branch `main` roda testes, gera o build e publica em `https://<usuario>.github.io/<repo>/`.
Ative uma vez: **Settings → Pages → Source: GitHub Actions**.

## Versão software (Windows, offline)
- Baixe em **Releases** (tag `v*`) ou em **Actions → Instalador Windows → Artifacts**:
  - `StagePlot-Setup-x.y.z.exe` — instalador;
  - `StagePlot-Portable-x.y.z.exe` — roda sem instalar.
- Localmente: `npm install` e `npm run desktop` (saída em `release/`). `npm run desktop:dev` abre o app sem empacotar.
- O Windows pode avisar "editor desconhecido": o app não é assinado digitalmente.

## Desenvolvimento
`npm run dev` (porta 8801) · `npm test` · `npm run build` (saída em `../out/v01`, ou `dist` com `OUT_DIR=dist`).
