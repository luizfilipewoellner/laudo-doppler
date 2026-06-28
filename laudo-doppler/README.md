# Laudo Mapeamento Venoso — App Desktop (Mac + Windows)

Gerador de laudo de Mapeamento Venoso (Ecodoppler), funciona offline após instalado.

---

## Como gerar os instaladores (Mac .dmg e Windows .exe)

Este projeto usa o **GitHub Actions** para gerar os instaladores automaticamente
na nuvem, sem precisar ter Mac e Windows ao mesmo tempo.

---

### PASSO 1 — Criar conta no GitHub (gratuito)

Acesse https://github.com e clique em "Sign up".
Use qualquer e-mail. O plano gratuito é suficiente.

---

### PASSO 2 — Criar um repositório

1. Após fazer login, clique no **"+"** no canto superior direito → "New repository"
2. Dê um nome, por exemplo: `laudo-doppler`
3. Deixe como **Private** (só você vai ver)
4. Clique em **"Create repository"**

---

### PASSO 3 — Fazer upload dos arquivos

Na página do repositório recém-criado:

1. Clique em **"uploading an existing file"**
2. **Arraste toda a pasta `laudo-doppler`** para a área de upload
   (ou clique em "choose your files" e selecione todos os arquivos)
3. Aguarde o upload terminar
4. No campo "Commit changes", escreva qualquer coisa (ex: "primeira versão")
5. Clique em **"Commit changes"**

> Importante: a pasta `.github` (com o ponto na frente) precisa ser incluída.
> No Mac, arquivos com ponto ficam ocultos por padrão. Para incluí-los:
> - No Finder, pressione Cmd+Shift+. para mostrar arquivos ocultos
> - Ou faça o upload via terminal: veja a seção "Upload via terminal" abaixo.

---

### PASSO 4 — Acompanhar o build

1. No repositório, clique na aba **"Actions"**
2. Você verá o build rodando (ícone amarelo = rodando, verde = pronto, vermelho = erro)
3. Aguarde alguns minutos (normalmente 5 a 10 minutos)

---

### PASSO 5 — Baixar os instaladores

1. Clique no build que terminou (ícone verde ✓)
2. Role a página até a seção **"Artifacts"** no final
3. Você verá dois arquivos para baixar:
   - **instalador-mac** → contém o `.dmg` para Mac
   - **instalador-windows** → contém o `.exe` para Windows
4. Clique em cada um para baixar

---

### Rodar o build novamente (quando houver atualizações)

Sempre que você fizer upload de uma versão atualizada do `App.jsx`,
o GitHub gera os instaladores automaticamente.

Ou para rodar manualmente sem fazer upload:
1. Vá na aba **"Actions"**
2. Clique em **"Build Instaladores (Mac + Windows)"** no menu lateral
3. Clique em **"Run workflow"** → **"Run workflow"**

---

### Upload via terminal (recomendado para incluir arquivos ocultos)

Se preferir usar o terminal para garantir que a pasta `.github` seja incluída:

```bash
# Instale o Git se não tiver: https://git-scm.com
cd caminho/para/laudo-doppler

git init
git add .
git commit -m "primeira versão"
git remote add origin https://github.com/SEU_USUARIO/laudo-doppler.git
git branch -M main
git push -u origin main
```
Substitua `SEU_USUARIO` pelo seu nome de usuário do GitHub.

---

### Sobre o ícone do app

O ícone atual (`build/icon.png`) é um placeholder simples.
Para usar o logo da sua clínica:
1. Crie uma imagem quadrada (512x512 pixels, PNG)
2. Substitua o arquivo `build/icon.png`
3. Faça upload novamente — o build gera os instaladores com o novo ícone

---

### Aviso ao instalar

**Mac:** pode aparecer "app de desenvolvedor não identificado".
Para abrir: clique com botão direito → Abrir → confirmar. Só precisa fazer isso uma vez.

**Windows:** o SmartScreen pode alertar.
Clique em "Mais informações" → "Executar assim mesmo".

Esses avisos aparecem porque o app não tem assinatura digital paga (certificado),
o que é normal para uso pessoal/clínico sem distribuição comercial.
