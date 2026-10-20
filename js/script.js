'use strict';

/* ==========================================================
   Agência Criativa Web: interações 3D
   Módulos: tema, fundo 3D (canvas), cena do hero, tilt dos
   cartões, carrossel 3D, revelar ao rolar, contadores,
   cabeçalho, formulário e brilho do cursor.
   ========================================================== */
(() => {
  const raiz = document.documentElement;
  const reduzMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const aleatorio = (min, max) => Math.random() * (max - min) + min;

  // Posição do ponteiro compartilhada entre os módulos
  const ponteiro = { x: 0, y: 0, px: window.innerWidth / 2, py: window.innerHeight / 2, moveu: false };

  window.addEventListener(
    'pointermove',
    (e) => {
      ponteiro.px = e.clientX;
      ponteiro.py = e.clientY;
      ponteiro.x = e.clientX / window.innerWidth - 0.5; // -0.5 a 0.5
      ponteiro.y = e.clientY / window.innerHeight - 0.5;
      ponteiro.moveu = true;
    },
    { passive: true }
  );

  /* ---------- 1. TEMA (claro/escuro) ---------- */
  function iniciarTema() {
    const botao = document.querySelector('[data-acao="alternar-tema"]');
    if (!botao) return;

    const icone = botao.querySelector('.botao-tema__icone');
    const CHAVE = 'agencia-tema';
    let salvo = null;

    try {
      salvo = localStorage.getItem(CHAVE);
    } catch (erro) {
      /* armazenamento indisponível: segue sem salvar */
    }

    const preferido = window.matchMedia('(prefers-color-scheme: light)').matches ? 'claro' : 'escuro';

    function aplicar(tema) {
      raiz.setAttribute('data-tema', tema);
      botao.setAttribute('aria-pressed', String(tema === 'claro'));
      botao.setAttribute('aria-label', tema === 'claro' ? 'Ativar tema escuro' : 'Ativar tema claro');
      botao.classList.toggle('botao-tema--claro', tema === 'claro');
      icone.textContent = tema === 'claro' ? '☀️' : '🌙';
      document.dispatchEvent(new CustomEvent('tema:mudou'));
    }

    aplicar(salvo === 'claro' || salvo === 'escuro' ? salvo : preferido);

    botao.addEventListener('click', () => {
      const novo = raiz.getAttribute('data-tema') === 'claro' ? 'escuro' : 'claro';
      aplicar(novo);
      try {
        localStorage.setItem(CHAVE, novo);
      } catch (erro) {
        /* ignora */
      }
    });
  }

  /* ---------- 2. FUNDO 3D: partículas com perspectiva ---------- */
  function iniciarFundo() {
    const canvas = document.querySelector('.fundo-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let largura = 0;
    let altura = 0;
    let corParticula = '255, 255, 255';
    const suave = { x: 0, y: 0 };

    const quantidade = window.innerWidth < 700 ? 55 : 100;
    const pontos = Array.from({ length: quantidade }, () => ({
      x: aleatorio(-1, 1),
      y: aleatorio(-1, 1),
      z: aleatorio(0.1, 1),
      v: aleatorio(0.0006, 0.0016),
      ciano: Math.random() > 0.7,
    }));

    function lerCor() {
      const valor = getComputedStyle(raiz).getPropertyValue('--particula').trim();
      if (valor) corParticula = valor;
    }

    function redimensionar() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      largura = window.innerWidth;
      altura = window.innerHeight;
      canvas.width = largura * dpr;
      canvas.height = altura * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function desenhar() {
      suave.x += (ponteiro.x - suave.x) * 0.05;
      suave.y += (ponteiro.y - suave.y) * 0.05;
      ctx.clearRect(0, 0, largura, altura);

      const visiveis = [];

      for (const p of pontos) {
        if (!reduzMovimento) {
          p.z -= p.v;
          if (p.z <= 0.05) {
            p.z = 1;
            p.x = aleatorio(-1, 1);
            p.y = aleatorio(-1, 1);
          }
        }

        const f = 1 / (0.35 + p.z * 1.5); // fator de perspectiva
        const sx = largura / 2 + (p.x * largura * 0.55 - suave.x * 300 * (1.1 - p.z)) * f * 0.8;
        const sy =
          altura / 2 +
          (p.y * altura * 0.55 - suave.y * 300 * (1.1 - p.z) - window.scrollY * 0.12 * (1.1 - p.z)) * f * 0.8;

        if (sx < -50 || sx > largura + 50 || sy < -50 || sy > altura + 50) continue;

        const alfa = Math.min(0.95, Math.max(0.12, 1.15 - p.z));
        visiveis.push({ sx, sy, alfa, r: Math.max(0.6, 1.3 * f), ciano: p.ciano });
      }

      // Linhas entre partículas próximas
      for (let i = 0; i < visiveis.length; i++) {
        for (let j = i + 1; j < visiveis.length; j++) {
          const dx = visiveis[i].sx - visiveis[j].sx;
          const dy = visiveis[i].sy - visiveis[j].sy;
          const d2 = dx * dx + dy * dy;
          if (d2 < 12100) {
            const alfa = (1 - Math.sqrt(d2) / 110) * 0.22;
            ctx.strokeStyle = `rgba(${corParticula}, ${alfa.toFixed(3)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(visiveis[i].sx, visiveis[i].sy);
            ctx.lineTo(visiveis[j].sx, visiveis[j].sy);
            ctx.stroke();
          }
        }
      }

      // Pontos
      for (const p of visiveis) {
        ctx.fillStyle = p.ciano ? `rgba(0, 212, 255, ${p.alfa})` : `rgba(${corParticula}, ${p.alfa})`;
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      if (!reduzMovimento) requestAnimationFrame(desenhar);
    }

    lerCor();
    redimensionar();
    window.addEventListener('resize', redimensionar);
    document.addEventListener('tema:mudou', () => {
      lerCor();
      if (reduzMovimento) desenhar();
    });
    desenhar();
  }

  /* ---------- 3. CENA 3D DO HERO ---------- */
  function iniciarCena() {
    const palco = document.querySelector('.cena__palco');
    if (!palco) return;

    let rx = -12;
    let ry = 24;
    let visivel = true;

    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entradas) => {
        visivel = entradas[0].isIntersecting;
      }).observe(palco);
    }

    function quadro(t) {
      if (visivel) {
        const alvoRy = 24 + ponteiro.x * 60 + Math.sin(t / 2200) * 6;
        const alvoRx = -12 - ponteiro.y * 40 + Math.cos(t / 2600) * 4;
        ry += (alvoRy - ry) * 0.06;
        rx += (alvoRx - rx) * 0.06;
        palco.style.setProperty('--rx', `${rx.toFixed(2)}deg`);
        palco.style.setProperty('--ry', `${ry.toFixed(2)}deg`);
      }
      requestAnimationFrame(quadro);
    }

    if (!reduzMovimento) requestAnimationFrame(quadro);
  }

  /* ---------- 4. TILT 3D DOS CARTÕES ---------- */
  function iniciarTilt() {
    if (reduzMovimento) return;

    document.querySelectorAll('[data-tilt]').forEach((el) => {
      const max = Number(el.dataset.tilt) || 10;

      el.addEventListener('pointermove', (e) => {
        if (e.pointerType === 'touch') return;
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        el.style.setProperty('--tilt-y', `${((px - 0.5) * max * 2).toFixed(2)}deg`);
        el.style.setProperty('--tilt-x', `${((0.5 - py) * max * 2).toFixed(2)}deg`);
        el.style.setProperty('--brilho-x', `${(px * 100).toFixed(1)}%`);
        el.style.setProperty('--brilho-y', `${(py * 100).toFixed(1)}%`);
      });

      el.addEventListener('pointerleave', () => {
        el.style.setProperty('--tilt-x', '0deg');
        el.style.setProperty('--tilt-y', '0deg');
      });
    });
  }

  /* ---------- 5. CARROSSEL 3D ---------- */
  function iniciarCarrossel() {
    const carrossel = document.querySelector('[data-carrossel]');
    if (!carrossel) return;

    const anel = carrossel.querySelector('.carrossel__anel');
    const itens = Array.from(carrossel.querySelectorAll('.carrossel__item'));
    const status = document.querySelector('[data-carrossel-status]');
    const total = itens.length;
    const passo = 360 / total;
    let giro = 0;
    let pausado = false;

    itens.forEach((item, i) => {
      item.style.setProperty('--i', i);
      item.style.setProperty('--total', total);
    });

    function calcularRaio() {
      const larguraItem = itens[0].offsetWidth;
      const raio = Math.round(larguraItem / 2 / Math.tan(Math.PI / total)) + 28;
      carrossel.style.setProperty('--raio-carrossel', `${raio}px`);
    }

    function atualizar() {
      anel.style.setProperty('--giro', `${giro}deg`);
      const indice = ((Math.round(-giro / passo) % total) + total) % total;
      itens.forEach((item, i) => item.classList.toggle('carrossel__item--ativo', i === indice));
      if (status) status.textContent = `Projeto ${indice + 1} de ${total}`;
    }

    function ir(direcao) {
      giro -= direcao * passo;
      atualizar();
    }

    // Botões
    document.querySelectorAll('[data-carrossel-acao]').forEach((botao) => {
      botao.addEventListener('click', () => ir(botao.dataset.carrosselAcao === 'proximo' ? 1 : -1));
    });

    // Teclado
    carrossel.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') ir(1);
      if (e.key === 'ArrowLeft') ir(-1);
    });

    // Arrastar com mouse ou toque
    let arrastando = false;
    let inicioX = 0;
    let giroInicial = 0;

    carrossel.addEventListener('pointerdown', (e) => {
      arrastando = true;
      inicioX = e.clientX;
      giroInicial = giro;
      carrossel.classList.add('carrossel--arrastando');
      carrossel.setPointerCapture(e.pointerId);
    });

    carrossel.addEventListener('pointermove', (e) => {
      if (!arrastando) return;
      giro = giroInicial + (e.clientX - inicioX) * 0.35;
      atualizar();
    });

    function soltar() {
      if (!arrastando) return;
      arrastando = false;
      carrossel.classList.remove('carrossel--arrastando');
      giro = Math.round(giro / passo) * passo; // encaixa no item mais próximo
      atualizar();
    }

    carrossel.addEventListener('pointerup', soltar);
    carrossel.addEventListener('pointercancel', soltar);

    // Giro automático (pausa quando o usuário interage)
    ['pointerenter', 'focusin'].forEach((nome) => carrossel.addEventListener(nome, () => (pausado = true)));
    ['pointerleave', 'focusout'].forEach((nome) => carrossel.addEventListener(nome, () => (pausado = false)));

    if (!reduzMovimento) {
      setInterval(() => {
        if (!pausado && !arrastando && !document.hidden) ir(1);
      }, 4500);
    }

    calcularRaio();
    atualizar();
    window.addEventListener('resize', calcularRaio);
  }

  /* ---------- 6. REVELAR AO ROLAR ---------- */
  function iniciarRevelar() {
    const elementos = document.querySelectorAll('.revelar');

    if (!('IntersectionObserver' in window) || reduzMovimento) {
      elementos.forEach((el) => el.classList.add('revelar--visivel'));
      return;
    }

    const observador = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((entrada) => {
          if (entrada.isIntersecting) {
            entrada.target.classList.add('revelar--visivel');
            observador.unobserve(entrada.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    elementos.forEach((el) => observador.observe(el));
  }

  /* ---------- 7. CONTADORES ---------- */
  function iniciarContadores() {
    const contadores = document.querySelectorAll('[data-contar]');

    function escrever(el, valor) {
      el.textContent = `${el.dataset.prefixo || ''}${Math.round(valor)}${el.dataset.sufixo || ''}`;
    }

    function animar(el) {
      const alvo = Number(el.dataset.contar);
      if (reduzMovimento) return escrever(el, alvo);

      const duracao = 1600;
      const inicio = performance.now();

      function passo(agora) {
        const progresso = Math.min((agora - inicio) / duracao, 1);
        const suavizado = 1 - Math.pow(1 - progresso, 3); // easeOutCubic
        escrever(el, alvo * suavizado);
        if (progresso < 1) requestAnimationFrame(passo);
      }

      requestAnimationFrame(passo);
    }

    if (!('IntersectionObserver' in window)) {
      contadores.forEach((el) => escrever(el, Number(el.dataset.contar)));
      return;
    }

    const observador = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((entrada) => {
          if (entrada.isIntersecting) {
            animar(entrada.target);
            observador.unobserve(entrada.target);
          }
        });
      },
      { threshold: 0.6 }
    );

    contadores.forEach((el) => observador.observe(el));
  }

  /* ---------- 8. CABEÇALHO: rolagem, menu e link ativo ---------- */
  function iniciarCabecalho() {
    const cabecalho = document.querySelector('.cabecalho');
    const botaoMenu = document.querySelector('[data-acao="menu"]');
    const lista = document.querySelector('.cabecalho__lista');
    if (!cabecalho || !botaoMenu || !lista) return;

    const atualizar = () => cabecalho.classList.toggle('cabecalho--rolado', window.scrollY > 24);
    window.addEventListener('scroll', atualizar, { passive: true });
    atualizar();

    function fecharMenu() {
      lista.classList.remove('cabecalho__lista--aberta');
      botaoMenu.setAttribute('aria-expanded', 'false');
      botaoMenu.setAttribute('aria-label', 'Abrir menu');
    }

    botaoMenu.addEventListener('click', () => {
      const aberto = lista.classList.toggle('cabecalho__lista--aberta');
      botaoMenu.setAttribute('aria-expanded', String(aberto));
      botaoMenu.setAttribute('aria-label', aberto ? 'Fechar menu' : 'Abrir menu');
    });

    lista.addEventListener('click', (e) => {
      if (e.target.closest('a')) fecharMenu();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') fecharMenu();
    });

    // Destaca o link da seção visível
    if ('IntersectionObserver' in window) {
      const links = Array.from(lista.querySelectorAll('.cabecalho__link'));
      const observador = new IntersectionObserver(
        (entradas) => {
          entradas.forEach((entrada) => {
            if (!entrada.isIntersecting) return;
            links.forEach((link) =>
              link.classList.toggle('cabecalho__link--ativo', link.getAttribute('href') === `#${entrada.target.id}`)
            );
          });
        },
        { rootMargin: '-45% 0px -50% 0px' }
      );

      document.querySelectorAll('main section[id]').forEach((secao) => observador.observe(secao));
    }
  }

  /* ---------- 9. FORMULÁRIO ---------- */
  function iniciarFormulario() {
    const form = document.querySelector('[data-formulario]');
    if (!form) return;

    const status = form.querySelector('.formulario__status');

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      status.className = 'formulario__status';

      if (!form.checkValidity()) {
        status.textContent = 'Confira os campos: nome, e-mail válido e uma mensagem com pelo menos 10 caracteres.';
        status.classList.add('formulario__status--erro');
        form.reportValidity();
        return;
      }

      const nome = new FormData(form).get('nome');
      status.textContent = `Obrigado, ${nome}! Recebemos sua mensagem e responderemos em breve.`;
      status.classList.add('formulario__status--ok');
      form.reset();
    });
  }

  /* ---------- 10. BRILHO QUE SEGUE O CURSOR ---------- */
  function iniciarCursor() {
    const brilho = document.querySelector('.cursor-brilho');
    if (!brilho || reduzMovimento || window.matchMedia('(pointer: coarse)').matches) return;

    let x = ponteiro.px;
    let y = ponteiro.py;

    function quadro() {
      if (ponteiro.moveu) brilho.classList.add('cursor-brilho--ativo');
      x += (ponteiro.px - x) * 0.12;
      y += (ponteiro.py - y) * 0.12;
      brilho.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      requestAnimationFrame(quadro);
    }

    requestAnimationFrame(quadro);
  }

  /* ---------- Inicialização ---------- */
  iniciarTema();
  iniciarFundo();
  iniciarCena();
  iniciarTilt();
  iniciarCarrossel();
  iniciarRevelar();
  iniciarContadores();
  iniciarCabecalho();
  iniciarFormulario();
  iniciarCursor();
})();
