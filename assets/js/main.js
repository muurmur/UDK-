(function () {
      'use strict';

      // ── УТИЛІТА THROTTLE ─────────────────────────────────
      function throttle(fn, ms) {
        var last = 0;
        return function() {
          var now = Date.now();
          if (now - last >= ms) { last = now; fn.apply(this, arguments); }
        };
      }

      // ── ПРОГРЕС-БАР СТОРІНКИ ─────────────────────────────
      var progressBar = document.getElementById('page-progress');
      var navEl = document.getElementById('nav');
      window.addEventListener('scroll', throttle(function () {
        var scrollTop = window.scrollY;
        var docHeight = document.documentElement.scrollHeight - window.innerHeight;
        var pct = docHeight > 0 ? (scrollTop / docHeight * 100) : 0;
        progressBar.style.width = pct.toFixed(1) + '%';
        navEl.classList.toggle('nav--scrolled', scrollTop > 20);
      }, 16), { passive: true });

      // ── МОБІЛЬНЕ МЕНЮ ──────────────────────────────────
      var burger = document.getElementById('nav-burger');
      var mobileMenu = document.getElementById('mobile-menu');

      burger.addEventListener('click', function () {
        burger.classList.toggle('nav__burger--open');
        mobileMenu.classList.toggle('mobile-menu--open');
      });

      document.querySelectorAll('.mobile-menu__link').forEach(function (link) {
        link.addEventListener('click', function () {
          burger.classList.remove('nav__burger--open');
          mobileMenu.classList.remove('mobile-menu--open');
        });
      });

      document.addEventListener('click', function (e) {
        if (!burger.contains(e.target) && !mobileMenu.contains(e.target)) {
          burger.classList.remove('nav__burger--open');
          mobileMenu.classList.remove('mobile-menu--open');
        }
      });

      // ── ПОЯВА ПРИ СКРОЛІ ─────────────────────────────────
      var revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry, i) {
          if (entry.isIntersecting) {
            setTimeout(function () {
              entry.target.classList.add('reveal--visible');
            }, i * 70);
            revealObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.08 });

      document.querySelectorAll('.reveal').forEach(function (el) {
        revealObserver.observe(el);
      });

      // ── ВКЛАДКИ ─────────────────────────────────────────
      document.querySelectorAll('.tab-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var tabId = btn.getAttribute('data-tab');
          document.querySelectorAll('.tab-panel').forEach(function (p) { p.classList.remove('tab-panel--active'); });
          document.querySelectorAll('.tab-btn').forEach(function (b) { b.classList.remove('tab-btn--active'); });
          document.getElementById(tabId).classList.add('tab-panel--active');
          btn.classList.add('tab-btn--active');
        });
      });

      // ── КАЛЬКУЛЯТОР ────────────────────────────────────
      // PALLETS_PER_TYPE — кількість блоків на піддоні
      // Розрахунок: об'єм піддону 1.8м³ / об'єм одного блоку (600×200×t мм)
      // wall[200]: 1.8 / (0.6×0.2×0.2)=0.024  = 75 шт  (CALC-2 виправлено: було 70)
      // wall[250]: 1.8 / (0.6×0.2×0.25)=0.030  = 60 шт  ✓
      // wall[300]: 1.8 / (0.6×0.2×0.30)=0.036  = 50 шт  ✓
      // wall[375]: 1.44/ (0.6×0.2×0.375)=0.045 = 32 шт  (виправлено: було 40)
      // wall[400]: 1.44/ (0.6×0.2×0.40)=0.048  = 30 шт  ✓
      // part — перегородочні блоки 600×100×t
      // part[50]:  1.8 / (0.6×0.1×0.05)=0.003  = 600 шт (виправлено: було 300)
      // part[75]:  1.8 / (0.6×0.1×0.075)=0.0045= 400 шт (виправлено: було 200)
      // part[100]: 1.8 / (0.6×0.1×0.10)=0.006  = 300 шт (виправлено: було 150)
      // part[125]: 1.8 / (0.6×0.1×0.125)=0.0075= 240 шт (виправлено: було 120)
      // part[150]: 1.8 / (0.6×0.1×0.15)=0.009  = 200 шт (виправлено: було 100)
      var PALLETS_PER_TYPE = {
        wall: { 200: 75, 250: 60, 300: 50, 375: 32, 400: 30 },
        part: { 50: 600, 75: 400, 100: 300, 125: 240, 150: 200 }
      };

      var CALC_IDS = ['calc-type', 'calc-thickness', 'calc-grade', 'calc-length', 'calc-height', 'calc-floors', 'calc-windows', 'calc-win-size', 'calc-doors', 'calc-door-size', 'calc-reserve', 'calc-truck-type'];

      var calcToastShown = false;
      var calcToastTimer = null;

      function showCalcToast() {
        var toast = document.getElementById('calc-toast');
        toast.classList.add('calc-toast--visible');
        calcToastTimer = setTimeout(hideCalcToast, 5000);
      }

      function hideCalcToast() {
        var toast = document.getElementById('calc-toast');
        toast.classList.remove('calc-toast--visible');
        if (calcToastTimer) { clearTimeout(calcToastTimer); calcToastTimer = null; }
      }

      document.getElementById('calc-toast-close').addEventListener('click', hideCalcToast);

      function isStorageAllowed() {
        try { return localStorage.getItem('udk_cache_consent') === 'granted'; } catch(e) { return false; }
      }

      function saveCalcCookies() {
        if (!isStorageAllowed()) return; // GDPR: зберігаємо тільки після явної згоди
        var data = {};
        CALC_IDS.forEach(function (id) {
          var el = document.getElementById(id);
          if (el) data[id] = el.value;
        });
        try { localStorage.setItem('udk_calc', JSON.stringify(data)); } catch (e) { }
      }

      function loadCalcCookies() {
        if (!isStorageAllowed()) return; // GDPR: читаємо тільки якщо дозволено
        try {
          var raw = localStorage.getItem('udk_calc');
          if (!raw) return;
          var data = JSON.parse(raw);
          CALC_IDS.forEach(function (id) {
            var el = document.getElementById(id);
            if (el && data[id] !== undefined) el.value = data[id];
          });
        } catch (e) { }
      }

      function readUrlParams() {
        var params = new URLSearchParams(window.location.search);
        var found = false;
        CALC_IDS.forEach(function (id) {
          if (params.has(id)) {
            var el = document.getElementById(id);
            if (el) { el.value = params.get(id); found = true; }
          }
        });
        return found;
      }

      function buildShareUrl() {
        var params = new URLSearchParams();
        CALC_IDS.forEach(function (id) {
          var el = document.getElementById(id);
          if (el && el.value) params.set(id, el.value);
        });
        return window.location.origin + window.location.pathname + '#calc?' + params.toString();
      }

      function updateThicknessOptions() {
        var type = document.getElementById('calc-type').value;
        var sel = document.getElementById('calc-thickness');
        if (type === 'wall') {
          sel.innerHTML = "<option value='200'>200 мм</option><option value='250' selected>250 мм</option><option value='300'>300 мм — без утеплення</option><option value='375'>375 мм — без утеплення</option><option value='400'>400 мм</option>";
        } else {
          sel.innerHTML = "<option value='50'>50 мм</option><option value='75'>75 мм</option><option value='100' selected>100 мм</option><option value='125'>125 мм</option><option value='150'>150 мм</option>";
        }
        runCalculator();
      }

      function runCalculator() {
        var type      = document.getElementById('calc-type').value;
        var thickness = parseInt(document.getElementById('calc-thickness').value);
        var grade     = parseInt(document.getElementById('calc-grade').value);
        var length    = parseFloat(document.getElementById('calc-length').value)  || 0;
        var height    = parseFloat(document.getElementById('calc-height').value)  || 0;
        var floors    = parseInt(document.getElementById('calc-floors').value)    || 1;
        var windows   = parseInt(document.getElementById('calc-windows').value)   || 0;
        var doors     = parseInt(document.getElementById('calc-doors').value)     || 0;
        var reserve   = parseFloat(document.getElementById('calc-reserve').value);

        // CALC-1: розміри отворів беруться з вибірників, не з констант
        var winAreaM2  = parseFloat(document.getElementById('calc-win-size').value)  || 1.44;
        var doorAreaM2 = parseFloat(document.getElementById('calc-door-size').value) || 2.10;

        // CALC-4: вантажопідйомність транспорту з вибірника
        var truckCapKg = parseFloat(document.getElementById('calc-truck-type').value) || 20000;

        // ── Крок 1: загальна висота ────────────────────────────
        var totalHeight = height * floors;

        // ── Крок 2: чиста площа стін (без отворів) ────────────
        // CALC-1: S_net = L × H_total − W × S_win − D × S_door
        var areaGross = length * totalHeight;
        var areaOpenings = windows * winAreaM2 + doors * doorAreaM2;
        var area = areaGross - areaOpenings;
        var isAreaError = false;
        
        if (areaGross > 0 && area < 0) {
          isAreaError = true;
          area = 0;
        } else if (area < 0) {
          area = 0;
        }

        // Toggle error styling and banner
        var errorBanner = document.getElementById('calc-error-banner');
        var inputIds = ['calc-length', 'calc-height', 'calc-windows', 'calc-doors'];
        
        if (isAreaError) {
          if (errorBanner) {
            errorBanner.style.display = 'block';
            document.getElementById('calc-err-op').textContent = areaOpenings.toFixed(1);
            document.getElementById('calc-err-wall').textContent = areaGross.toFixed(1);
          }
          inputIds.forEach(function(id) {
            var el = document.getElementById(id);
            if (el) {
              el.classList.add('form-input--error');
              if (el.parentElement) el.parentElement.classList.add('form-field--error');
            }
          });
        } else {
          if (errorBanner) errorBanner.style.display = 'none';
          inputIds.forEach(function(id) {
            var el = document.getElementById(id);
            if (el) {
              el.classList.remove('form-input--error');
              if (el.parentElement) el.parentElement.classList.remove('form-field--error');
            }
          });
        }

        // ── Крок 3: кількість блоків ───────────────────────────
        // N = ceil( S_net × (1 / face_area) × k )
        // face_area = 0.20 × 0.60 = 0.12 м² (однакова для всіх товщин)
        var blocks = Math.ceil(area * (1 / (0.2 * 0.6)) * reserve);

        // ── Крок 4: кількість піддонів ────────────────────────
        // CALC-2: виправлена таблиця PALLETS_PER_TYPE (wall[200]=75)
        var palletsCount = Math.ceil(blocks / (PALLETS_PER_TYPE[type][thickness] || 60));

        // ── Крок 5: об'єм замовлення (об'єм блоків, не стіни) ─
        // V = N × t × 0.20 × 0.60
        var volume = blocks * (thickness / 1000) * 0.2 * 0.6;

        // ── Крок 6: вага ──────────────────────────────────────
        // W_dry  = V × ρ (D400=400, D500=500 кг/м³) — паспортна суха щільність
        // W_real = W_dry × 1.10 — CALC-3: +10% вологи при доставці
        var weightDryKg  = volume * grade;
        var weightRealKg = weightDryKg * 1.10;

        // ── Крок 7: кількість авто ────────────────────────────
        // CALC-4: ділимо на вибрану вантажопідйомність (20 000 кг для фури)
        var trucks = Math.ceil(weightRealKg / truckCapKg);

        function set(id, val) { document.getElementById(id).textContent = val; }

        set('result-blocks',    blocks > 0        ? blocks.toLocaleString('uk') : '—');
        set('result-pallets',   palletsCount > 0 && !isAreaError ? palletsCount + ' шт.'       : '—');
        set('result-volume',    volume > 0       && !isAreaError ? volume.toFixed(1) + ' м³'   : '—');
        set('result-area',      area > 0         && !isAreaError ? area.toFixed(1) + ' м²'     : '—');
        set('result-thickness', thickness + ' мм · D' + grade);
        set('result-weight',    weightRealKg > 0 && !isAreaError ? (weightRealKg / 1000).toFixed(1) + ' т' : '—');
        set('result-trucks',    trucks > 0       && !isAreaError ? trucks + ' авто'            : '—');

        var bigEl = document.getElementById('result-blocks');
        bigEl.classList.add('result__big--pop');
        setTimeout(function () { bigEl.classList.remove('result__big--pop'); }, 220);

        saveCalcCookies();

        // ── P2 UX FUNNEL: показуємо CTA і готуємо pre-fill для B2B форми ──
        var funnelCta = document.getElementById('calc-funnel-cta');
        var b2bMessage = document.getElementById('b2b-message');
        if (blocks > 0 && length > 0 && height > 0) {
          if (funnelCta) funnelCta.style.display = 'block';
          // Pre-fill повідомлення у B2B формі
          if (b2bMessage) {
            b2bMessage.value =
              'Результат калькулятора:\n' +
              '  Тип: ' + type + ' · ' + thickness + 'мм · D' + grade + '\n' +
              '  Блоків: ' + blocks.toLocaleString('uk') + ' шт.\n' +
              '  Піддонів: ' + palletsCount + ' шт.\n' +
              '  Обʼєм: ' + volume.toFixed(1) + ' м³\n' +
              '  Площа стін: ' + area.toFixed(1) + ' м² (вікна ' + winAreaM2 + 'м², двері ' + doorAreaM2 + 'м²)\n' +
              '  Вага (з вологою): ' + (weightRealKg / 1000).toFixed(1) + ' т\n' +
              '  Авто: ' + trucks + ' шт. (вантажопідйомність ' + (truckCapKg/1000) + 'т)\n\n' +
              'Прошу підготувати комерційну пропозицію.';
          }
          // ── P2 ANALYTICS: відправляємо подію GA4 ──
          if (typeof udkTrack === 'function') {
            udkTrack('calc_result', { blocks: blocks, volume: volume.toFixed(1), grade: 'D' + grade, thickness: thickness, weight_t: (weightRealKg/1000).toFixed(1) });
          }
        } else {
          if (funnelCta) funnelCta.style.display = 'none';
        }

        // Показати сповіщення, коли введено довжину та висоту
        if (length > 0 && height > 0 && !calcToastShown) {
          calcToastShown = true;
          setTimeout(showCalcToast, 600);
        }
      }

      // Завантажити стан: URL-параметри мають пріоритет над cookies
      if (!readUrlParams()) { loadCalcCookies(); }
      runCalculator();

      document.getElementById('calc-type').addEventListener('change', updateThicknessOptions);
      document.getElementById('calc-grade').addEventListener('change', runCalculator);
      document.getElementById('calc-reserve').addEventListener('change', runCalculator);
      document.getElementById('calc-win-size').addEventListener('change', runCalculator);
      document.getElementById('calc-door-size').addEventListener('change', runCalculator);
      document.getElementById('calc-truck-type').addEventListener('change', runCalculator);
      document.getElementById('calc-floors').addEventListener('input', runCalculator);
      ['calc-length', 'calc-height', 'calc-windows', 'calc-win-size', 'calc-doors', 'calc-door-size', 'calc-truck-type'].forEach(function (id) {
        document.getElementById(id).addEventListener('input', runCalculator);
      });

      // ── ВАЛІДАЦІЯ ВВОДУ ДЛЯ КАЛЬКУЛЯТОРА ─────────────────────────
      ['calc-length', 'calc-height', 'calc-floors', 'calc-windows', 'calc-doors'].forEach(function(id) {
        var input = document.getElementById(id);
        if (!input) return;
        
        // Заборонити введення літер 'e', '-', '+' з клавіатури
        input.addEventListener('keydown', function(e) {
          if (['e', 'E', '+', '-'].indexOf(e.key) !== -1) {
            e.preventDefault();
          }
        });
        
        // Обмежити довжину та заборонити від'ємні при вставці
        input.addEventListener('input', function() {
          if (this.value < 0) this.value = Math.abs(this.value); // прибираємо мінус
          if (this.value.length > 5) this.value = this.value.slice(0, 5); // макс 5 символів
        });
      });

      // Кнопка копіювання посилання
      document.getElementById('share-url-btn').addEventListener('click', function () {
        var url = buildShareUrl();
        if (navigator.clipboard) {
          navigator.clipboard.writeText(url).then(function () {
            var btn = document.getElementById('share-url-btn');
            btn.textContent = 'Скопійовано! ✓';
            setTimeout(function () { btn.textContent = 'Скопіювати посилання ⎘'; }, 2000);
          });
        }
      });

      // ── ФОРМА B2B — Formspree AJAX ─────────────────────
      // Ініціалізація через @formspree/ajax CDN внизу <body>

      // ── АКОРДЕОН FAQ ─────────────────────────────────
      document.querySelectorAll('.faq-question').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var item = btn.closest('.faq-item');
          var isOpen = item.classList.contains('faq-item--open');

          // закрити всі
          document.querySelectorAll('.faq-item').forEach(function (el) {
            el.classList.remove('faq-item--open');
          });

          // відкрити клікнутий, якщо був закритий
          if (!isOpen) item.classList.add('faq-item--open');
        });
      });

      // ── ЧАТ-БОТ З МАСШТАБУВАННЯМ ТА НАВІГАЦІЄЮ (ПОКРАЩЕННЯ) ──────────
      var chatOpen = false;
      var chatBtn = document.getElementById('chat-btn');
      var chatPopup = document.getElementById('chat-popup');
      var chatMessages = document.getElementById('chat-messages');
      var chatInput = document.getElementById('chat-input');
      var chatSend = document.getElementById('chat-send');
      var chatQuick = document.getElementById('chat-quick');
      var chatResetBtn = document.getElementById('chat-reset-btn');

      // База відповідей чат-бота (UA / EN)
      var BOT_RESPONSES = {
        ua: [
          [/марк|d400|d500|обрати|яку/i, 'D400 — краще зберігає тепло, ідеальний для 1–2 поверхів. D500 — міцніший (B3.5), підходить для 2–4 поверхів. Для стін без утеплення рекомендуємо UDK D400 375 мм.'],
          [/дилер|купити|де|магазин/i, 'У нас є мережа з 200+ офіційних дилерів по всій Україні! Карта точок продажу знаходиться в розділі «Де купити» (трохи вище підвалу).'],
          [/bim|revit|archicad|модел/i, 'Всі BIM-моделі (Revit, ArchiCAD) доступні у нашому «Технічному центрі» абсолютно безкоштовно і без реєстрації!'],
          [/ціна|вартість|замов|купити опт/i, 'Ціна залежить від обсягу постачання та вашої геолокації. Будь ласка, заповніть форму «Оптовий запит» — наш менеджер надішле вам точний прорахунок з доставкою протягом 1 робочого дня.'],
          [/faq|питанн|довідка/i, 'Детальні відповіді на технічні та логістичні питання ви можете знайти у розділі FAQ внизу нашої сторінки.'],
          [/калькулятор|порахувати|обсяг/i, 'Скористайтеся нашим «Інженерним калькулятором» вище — він розрахує точну кількість блоків, піддонів, вагу та навіть кількість вантажівок!']
        ],
        en: [
          [/grade|density|d400|d500|choose/i, 'D400 features superior insulation and is ideal for 1-2 story builds. D500 offers higher strength (B3.5) for 2-4 story load-bearing walls. We recommend D400 375mm for uninsulated designs.'],
          [/dealer|buy|where|shop/i, 'We have 200+ official dealers across Ukraine. Check the interactive map in the "Where to buy" section near the footer to find the nearest point.'],
          [/bim|revit|archicad|model/i, 'All BIM assets for Revit and ArchiCAD can be downloaded from our "Technical Center" completely free of charge and with no registration.'],
          [/price|cost|order|wholesale/i, 'Prices vary based on cargo volumes and freight distance. Please fill out the "Wholesale Inquiry" form to receive a commercial proposal within 1 business day.'],
          [/faq|question|help/i, 'Detailed answers regarding specifications, delivery, and block properties can be found in our FAQ section at the bottom.'],
          [/calculator|calculate|volume/i, 'Use our custom "Engineering Calculator" above to instantly get required blocks, pallets, weight, and delivery truck estimates.']
        ]
      };

      function getChatLang() {
        return document.documentElement.lang === 'uk' ? 'ua' : 'en';
      }

      function addChatMessage(text, sender) {
        var msg = document.createElement('div');
        msg.className = 'chat-message chat-message--' + sender;
        msg.textContent = text;
        chatMessages.appendChild(msg);
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }

      function getChatBotReply(text) {
        var lang = getChatLang();
        var rules = BOT_RESPONSES[lang];
        for (var i = 0; i < rules.length; i++) {
          if (rules[i][0].test(text)) return rules[i][1];
        }
        return lang === 'ua' 
          ? 'З радістю проконсультуємо вас детальніше по телефону: +38 (067) 996-83-77 або заповніть форму оптового запиту.'
          : 'We would love to consult you in detail! Please call us at +38 (067) 996-83-77 or fill out the wholesale inquiry form.';
      }

      function handleChatSend(text) {
        if (!text) return;
        addChatMessage(text, 'user');
        chatResetBtn.style.display = 'inline-block'; // показуємо кнопку повернення в меню
        
        setTimeout(function () {
          var reply = getChatBotReply(text);
          addChatMessage(reply, 'bot');
        }, 600);
      }

      // Обробники кліків по кнопках меню
      document.querySelectorAll('.chat-quick-btn:not(.chat-quick-btn--reset)').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var quest = btn.getAttribute('data-question');
          // Локалізуємо питання для візуального відображення в чаті
          var lang = getChatLang();
          var visibleText = btn.getAttribute('data-lang-' + lang) || quest;
          handleChatSend(visibleText);
        });
      });

      // Кнопка повернення до головного меню (Reset)
      chatResetBtn.addEventListener('click', function () {
        // Очищаємо діалог
        chatMessages.innerHTML = '';
        var lang = getChatLang();
        var helloMsg = lang === 'ua'
          ? 'Вітаємо! Допоможу підібрати блоки або знайти дилера.'
          : 'Welcome! I can help you select blocks or find a dealer.';
        addChatMessage(helloMsg, 'bot');
        
        // Ховаємо кнопку скидання
        chatResetBtn.style.display = 'none';
      });

      // Надсилання текстового повідомлення
      chatSend.addEventListener('click', function () {
        var text = chatInput.value.trim();
        chatInput.value = '';
        handleChatSend(text);
      });

      chatInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          var text = this.value.trim();
          this.value = '';
          handleChatSend(text);
        }
      });

      // Відкриття / Закриття чату
      chatBtn.addEventListener('click', function () {
        chatOpen = !chatOpen;
        chatPopup.classList.toggle('chat-popup--open', chatOpen);
        
        var chatSvg = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>';
        var closeSvg = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>';
        document.getElementById('chat-icon').innerHTML = chatOpen ? closeSvg : chatSvg;
        document.getElementById('chat-badge').style.display = 'none';
      });

      // ── ЛОГІКА РУЧНОГО ЗМІНЕННЯ РОЗМІРУ ЧАТУ ──────────────
      (function () {
        var resizer = document.getElementById('chat-resize-handle');
        if (!resizer) return;

        var startX, startY, startWidth, startHeight;

        resizer.addEventListener('mousedown', initDrag, false);
        resizer.addEventListener('touchstart', initDrag, false);

        function initDrag(e) {
          e.preventDefault();
          startX = e.clientX || e.touches[0].clientX;
          startY = e.clientY || e.touches[0].clientY;
          startWidth = parseInt(document.defaultView.getComputedStyle(chatPopup).width, 10);
          startHeight = parseInt(document.defaultView.getComputedStyle(chatPopup).height, 10);

          document.documentElement.addEventListener('mousemove', doDrag, false);
          document.documentElement.addEventListener('mouseup', stopDrag, false);
          document.documentElement.addEventListener('touchmove', doDrag, false);
          document.documentElement.addEventListener('touchend', stopDrag, false);
        }

        function doDrag(e) {
          var clientX = e.clientX || e.touches[0].clientX;
          var clientY = e.clientY || e.touches[0].clientY;
          
          // Оскільки вікно чату зафіксоване знизу-праворуч, рух мишки ліворуч/вгору 
          // збільшує розмір вікна. Отже, віднімаємо дельту.
          var deltaX = clientX - startX;
          var deltaY = clientY - startY;

          var newWidth = startWidth - deltaX;
          var newHeight = startHeight - deltaY;

          // Обмежуємо розміри
          newWidth = Math.max(280, Math.min(newWidth, window.innerWidth * 0.9));
          newHeight = Math.max(380, Math.min(newHeight, window.innerHeight * 0.85));

          chatPopup.style.width = newWidth + 'px';
          chatPopup.style.height = newHeight + 'px';
        }

        function stopDrag() {
          document.documentElement.removeEventListener('mousemove', doDrag, false);
          document.documentElement.removeEventListener('mouseup', stopDrag, false);
          document.documentElement.removeEventListener('touchmove', doDrag, false);
          document.documentElement.removeEventListener('touchend', stopDrag, false);
        }
      })();

      // ── АНІМОВАНІ ЛІЧИЛЬНИКИ ──────────────────────────────
      function animateCounters() {
        document.querySelectorAll('[data-count-to]').forEach(function (el) {
          var target = parseInt(el.getAttribute('data-count-to'));
          var suffix = el.getAttribute('data-count-suffix') || '';
          var duration = 2000;
          var startTime = null;
          el.textContent = '0' + suffix;
          function step(ts) {
            if (!startTime) startTime = ts;
            var progress = Math.min((ts - startTime) / duration, 1);
            var eased = 1 - Math.pow(1 - progress, 3);
            el.textContent = Math.floor(eased * target) + suffix;
            if (progress < 1) requestAnimationFrame(step);
            else el.textContent = target + suffix;
          }
          requestAnimationFrame(step);
        });
      }
      // Лічильники запускатимуться після того, як зникне екран завантаження
      // (див. логіку екрану завантаження нижче — НЕ запускати тут)

      // ── ЛОГІКА ЕКРАНУ ЗАВАНТАЖЕННЯ ───────────────────────
      (function () {
        var splash = document.getElementById('splash-screen');
        var bar = document.getElementById('splash-bar');
        if (!splash) { animateCounters(); return; }

        var MIN_SHOW_MS = 1500;       // мінімальний час показу екрану завантаження
        var splashStart = Date.now();
        var pageLoaded = false;
        var alreadyHidden = false;

        // Імітація прогрес-бару: швидко доходить до ~85%, потім сповільнюється
        var progress = 0;
        var fakeTimer = setInterval(function () {
          if (progress < 70) progress += 3 + Math.random() * 5;
          else if (progress < 88) progress += 0.4 + Math.random() * 1.2;
          if (progress > 88) progress = 88;
          if (bar) bar.style.width = progress + '%';
        }, 100);

        function hideSplash() {
          if (alreadyHidden) return;
          alreadyHidden = true;
          clearInterval(fakeTimer);
          if (bar) bar.style.width = '100%';
          setTimeout(function () {
            splash.classList.add('splash--hidden');
            // Запустити лічильники після завершення зникнення екрану завантаження
            setTimeout(animateCounters, 650);
            // Видалити екран завантаження з DOM після анімації
            setTimeout(function () { splash.remove(); }, 700);
          }, 300);
        }

        function tryHide() {
          if (!pageLoaded) return;
          var elapsed = Date.now() - splashStart;
          if (elapsed >= MIN_SHOW_MS) {
            hideSplash();
          } else {
            setTimeout(hideSplash, MIN_SHOW_MS - elapsed);
          }
        }

        // Спрацьовує, коли сторінка закінчує завантаження
        function onPageReady() {
          pageLoaded = true;
          tryHide();
        }

        if (document.readyState === 'complete') {
          onPageReady();
        } else {
          window.addEventListener('load', onPageReady);
        }

        // Захисний таймаут: приховати через 6с, навіть якщо подія завантаження зависла
        setTimeout(hideSplash, 6000);
      })();

      // ── ПАРАЛАКС СІТКИ HERO ─────────────────────────────
      var heroGrid = document.getElementById('hero-grid');
      var heroEl = document.querySelector('.hero');
      window.addEventListener('scroll', throttle(function () {
        var scrollY = window.scrollY;
        var heroH = heroEl ? heroEl.offsetHeight : 0;
        if (scrollY < heroH && heroGrid) {
          heroGrid.style.transform = 'translateY(' + (scrollY * 0.35) + 'px) scale(' + (1 + scrollY * 0.0002) + ')';
        }
      }, 16), { passive: true });

      // ── CANVAS З ЧАСТИНКАМИ ────────────────────────────────
      (function () {
        var cvs = document.getElementById('hero-canvas');
        if (!cvs) return;
        var ctx = cvs.getContext('2d');
        var hero = document.querySelector('.hero');
        var dots = [];
        var N = 138;
        var mouse = { x: -9999, y: -9999 };

        // Стан анімації — пауза коли hero не видно (C1 fix)
        var animRunning = false;
        var animFrame;

        function makeDots() {
          dots = [];
          for (var i = 0; i < N; i++) {
            dots.push({
              x: Math.random() * cvs.width,
              y: Math.random() * cvs.height,
              vx: (Math.random() - .5) * .35,
              vy: (Math.random() - .5) * .35,
              r: Math.random() * 1.8 + .8
            });
          }
        }

        function resize() {
          cvs.width = hero.offsetWidth;
          cvs.height = hero.offsetHeight;
          makeDots();
        }

        // Debounce resize (C6 fix) — ре-ініціалізація не частіше ніж раз/300ms
        var resizeTimer;
        window.addEventListener('resize', function() {
          clearTimeout(resizeTimer);
          resizeTimer = setTimeout(resize, 300);
        });

        requestAnimationFrame(resize);

        hero.addEventListener('mousemove', function (e) {
          var r = hero.getBoundingClientRect();
          mouse.x = e.clientX - r.left;
          mouse.y = e.clientY - r.top;
        });
        hero.addEventListener('mouseleave', function () {
          mouse.x = -9999; mouse.y = -9999;
        });

        function frame() {
          if (!animRunning) return; // пауза коли поза viewport
          ctx.clearRect(0, 0, cvs.width, cvs.height);
          for (var i = 0; i < dots.length; i++) {
            var p = dots[i];
            p.x += p.vx; p.y += p.vy;
            if (p.x < 0) p.x = cvs.width;
            if (p.x > cvs.width) p.x = 0;
            if (p.y < 0) p.y = cvs.height;
            if (p.y > cvs.height) p.y = 0;

            /* точка */
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(234,175,16,0.28)';
            ctx.fill();

            /* лінії між точками */
            for (var j = i + 1; j < dots.length; j++) {
              var q = dots[j];
              var dx = p.x - q.x, dy = p.y - q.y;
              var d = Math.sqrt(dx * dx + dy * dy);
              if (d < 130) {
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(q.x, q.y);
                ctx.strokeStyle = 'rgba(234,175,16,' + (.07 * (1 - d / 130)) + ')';
                ctx.lineWidth = .5;
                ctx.stroke();
              }
            }

            /* відштовхування від миші + лінія підсвітки */
            var mx = p.x - mouse.x, my = p.y - mouse.y;
            var md = Math.sqrt(mx * mx + my * my);
            if (md < 160) {
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(mouse.x, mouse.y);
              ctx.strokeStyle = 'rgba(234,175,16,' + (.18 * (1 - md / 160)) + ')';
              ctx.lineWidth = .9;
              ctx.stroke();
              p.x += mx / md * 1.2;
              p.y += my / md * 1.2;
            }
          }
          animFrame = requestAnimationFrame(frame);
        }

        // IntersectionObserver: запускати/зупиняти анімацію залежно від видимості hero (C1 fix)
        new IntersectionObserver(function(entries) {
          animRunning = entries[0].isIntersecting;
          if (animRunning) frame(); // відновити анімацію
        }, { threshold: 0 }).observe(hero);
      })();

      // ── LAZY LOAD GOOGLE MAPS (C7 fix) ──────────────────────
      (function() {
        var mapWrap = document.getElementById('dealers-map-wrap');
        var placeholder = document.getElementById('dealers-map-placeholder');
        if (!mapWrap || !placeholder) return;

        function loadMap() {
          var iframe = document.createElement('iframe');
          iframe.src = 'https://www.google.com/maps/d/embed?mid=1HOUHOjLvQyx1UHiEBR3YPQ8hyp_qnps&ehbc=2E312F';
          iframe.width = '100%';
          iframe.style.cssText = 'border:0;display:block;margin-top:-60px;height:calc(100% + 60px);';
          iframe.allowFullscreen = true;
          placeholder.replaceWith(iframe);
        }

        // Завантажуємо через IntersectionObserver коли секція стає видимою
        var mapObserver = new IntersectionObserver(function(entries) {
          if (entries[0].isIntersecting) {
            loadMap();
            mapObserver.disconnect();
          }
        }, { rootMargin: '200px' }); // починаємо за 200px до появи
        mapObserver.observe(mapWrap);

        // Або при кліку на placeholder
        placeholder.addEventListener('click', function() {
          mapObserver.disconnect();
          loadMap();
        });
      })();
      document.getElementById('footer-phone').addEventListener('click', function (e) {
        e.preventDefault();
        var el = this, orig = el.textContent;
        navigator.clipboard.writeText('+380679968377').then(function () {
          el.textContent = '✓ Скопійовано!';
          el.style.color = 'var(--color-accent)';
          setTimeout(function () { el.textContent = orig; el.style.color = ''; }, 2000);
        });
      });

      // ── ПІДСВІЧУВАННЯ КУРСОРУ ─────────────────────────────────────
      (function () {
        var glow = document.getElementById('cursor-glow');
        if (!glow) return;
        document.addEventListener('mousemove', function (e) {
          glow.style.setProperty('--cx', e.clientX + 'px');
          glow.style.setProperty('--cy', e.clientY + 'px');
        });
        document.addEventListener('mouseleave', function () {
          glow.style.setProperty('--cx', '-9999px');
          glow.style.setProperty('--cy', '-9999px');
        });
      })();

      // ── КНОПКА ВГОРУ З КІЛЬЦЕМ ──────────────────────────
      (function () {
        var btn = document.getElementById('scroll-top');
        var ring = document.getElementById('scroll-ring');
        if (!btn || !ring) return;
        var circumference = 125.66;
        function onScroll() {
          var scrolled = window.scrollY;
          var total = document.documentElement.scrollHeight - window.innerHeight;
          var pct = total > 0 ? scrolled / total : 0;
          ring.style.strokeDashoffset = circumference * (1 - pct);
          if (scrolled > 300) {
            btn.classList.add('scroll-top--visible');
          } else {
            btn.classList.remove('scroll-top--visible');
          }
        }
        window.addEventListener('scroll', onScroll, { passive: true });
        btn.addEventListener('click', function () {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
      })();

      // ── КОМАНДНА ПАНЕЛЬ ──────────────────────────────────
      (function () {
        var overlay = document.getElementById('cmd-overlay');
        var input = document.getElementById('cmd-input');
        var resultsEl = document.getElementById('cmd-results');
        if (!overlay || !input) return;
        var sections = [
          { icon: '🏠', title: 'Головна', desc: 'Повернутись на початок', href: '#', keys: 'home головна' },
          { icon: '📦', title: 'Продукція', desc: 'Газобетонні блоки UDK', href: '#products', keys: 'продукція блоки' },
          { icon: '📐', title: 'Розміри та таблиці', desc: 'Характеристики всіх марок', href: '#sizes', keys: 'розміри таблиця характеристики' },
          { icon: '⚖️', title: 'D400 vs D500', desc: 'Порівняння густин', href: '#compare', keys: 'порівняння d400 d500' },
          { icon: '🌡️', title: 'Теплофізика', desc: 'Симулятор стіни та точка роси', href: '#physics', keys: 'теплофізика симулятор стіна опір дев поінт' },
          { icon: '🧮', title: 'Калькулятор', desc: 'Розрахувати кількість блоків', href: '#calc', keys: 'калькулятор розрахунок кількість' },
          { icon: '📄', title: 'Документи та BIM', desc: 'ДСТУ, сертифікати, BIM-моделі', href: '#tech', keys: 'документи сертифікати bim дсту' },
          { icon: '🗺️', title: 'Де купити', desc: 'Дилери та точки продажу', href: '#dealers', keys: 'дилери купити де' },
          { icon: '🏭', title: 'Виробничий цикл', desc: 'Як виробляють блоки', href: '#process', keys: 'виробництво процес автоклав' },
          { icon: '💬', title: 'FAQ', desc: 'Часті питання', href: '#faq', keys: 'faq питання' },
          { icon: '📋', title: 'Оптовий запит', desc: 'Заявка для дилерів і будівельників', href: '#b2b', keys: 'опт оптовий b2b запит' }
        ];
        var filtered = sections.slice();
        var selected = 0;

        function open() {
          overlay.classList.add('cmd-overlay--open');
          input.value = '';
          filtered = sections.slice();
          selected = 0;
          render();
          setTimeout(function () { input.focus(); }, 50);
        }
        function close() { overlay.classList.remove('cmd-overlay--open'); }

        function render() {
          resultsEl.innerHTML = '';
          if (filtered.length === 0) {
            resultsEl.innerHTML = '<div style="padding:20px 18px;font-size:13px;color:var(--color-text-hint)">Нічого не знайдено</div>';
            return;
          }
          filtered.forEach(function (s, i) {
            var el = document.createElement('div');
            el.className = 'cmd-item' + (i === selected ? ' cmd-item--selected' : '');
            el.innerHTML = '<div class="cmd-item__icon">' + s.icon + '</div>' +
              '<div><div class="cmd-item__title">' + s.title + '</div><div class="cmd-item__desc">' + s.desc + '</div></div>' +
              (s.href !== '#' ? '<span class="cmd-item__kbd">↵</span>' : '');
            el.addEventListener('click', function () { navigate(i); });
            resultsEl.appendChild(el);
          });
        }

        function navigate(i) {
          var item = filtered[i];
          if (item) {
            close();
            var target = document.querySelector(item.href === '#' ? 'body' : item.href);
            if (target) target.scrollIntoView({ behavior: 'smooth' });
          }
        }

        input.addEventListener('input', function () {
          var q = input.value.toLowerCase().trim();
          filtered = q ? sections.filter(function (s) {
            return (s.title + ' ' + s.desc + ' ' + s.keys).toLowerCase().includes(q);
          }) : sections.slice();
          selected = 0;
          render();
        });

        document.addEventListener('keydown', function (e) {
          if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.code === 'KeyK' || e.key === 'л')) {
            e.preventDefault();
            overlay.classList.contains('cmd-overlay--open') ? close() : open();
            return;
          }
          if (!overlay.classList.contains('cmd-overlay--open')) return;
          if (e.key === 'Escape') { close(); return; }
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            selected = Math.min(selected + 1, filtered.length - 1);
            render();
            var items = resultsEl.querySelectorAll('.cmd-item');
            if (items[selected]) items[selected].scrollIntoView({ block: 'nearest' });
            return;
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            selected = Math.max(selected - 1, 0);
            render();
            var items = resultsEl.querySelectorAll('.cmd-item');
            if (items[selected]) items[selected].scrollIntoView({ block: 'nearest' });
            return;
          }
          if (e.key === 'Enter') { navigate(selected); }
        });

        overlay.addEventListener('click', function (e) {
          if (e.target === overlay) close();
        });
      })();

      // ── ПЕРЕМИКАЧ МОВ ────────────────────────────────
      (function () {
        var btnUA = document.getElementById('lang-ua');
        var btnEN = document.getElementById('lang-en');
        if (!btnUA || !btnEN) return;
        var currentLang = 'ua';

        // C5 fix: безпечна вставка тексту — дозволяємо тільки <em>, <br>, <strong>
        // Всі інші теги видаляються. Захищає від XSS при майбутній CMS-інтеграції.
        function safeSetContent(el, html) {
          if (!html) return;
          // Дозволені теги (whitelist)
          var safe = html.replace(/<(?!\/?(?:em|br|strong)\b)[^>]*>/gi, '');
          if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
            el.placeholder = safe.replace(/<[^>]*>/g, ''); // для інпутів — тільки текст
          } else {
            el.innerHTML = safe;
          }
        }

        function applyLang(lang) {
          currentLang = lang;
          btnUA.classList.toggle('lang-btn--active', lang === 'ua');
          btnEN.classList.toggle('lang-btn--active', lang === 'en');
          // C9 fix: оновлюємо lang атрибут документа
          document.documentElement.lang = lang === 'ua' ? 'uk' : 'en';
          document.querySelectorAll('[data-lang-ua]').forEach(function (el) {
            var txt = lang === 'ua' ? el.getAttribute('data-lang-ua') : el.getAttribute('data-lang-en');
            if (txt) safeSetContent(el, txt);
          });
          document.dispatchEvent(new CustomEvent('udkLangChange', { detail: { lang: lang } }));
        }

        btnUA.addEventListener('click', function () { applyLang('ua'); });
        btnEN.addEventListener('click', function () { applyLang('en'); });
      })();

      // ── АНІМАЦІЯ ТАЙМЛАЙНУ ВИРОБНИЦТВА ─────────────
      (function () {
        var timeline = document.getElementById('process-timeline');
        var fill = document.getElementById('timeline-fill');
        if (!timeline || !fill) return;
        var steps = timeline.querySelectorAll('.timeline-step');
        var N = steps.length;

        function update() {
          var rect = timeline.getBoundingClientRect();
          var winH = window.innerHeight;
          /* прогрес 0–1: від появи верху до зникнення низу */
          var progress = 1 - (rect.bottom - winH * 0.3) / (rect.height + winH * 0.5);
          progress = Math.max(0, Math.min(1, progress));
          fill.style.width = (progress * 100) + '%';
          steps.forEach(function (step, i) {
            var threshold = i / (N - 1);
            if (progress >= threshold - 0.01) {
              step.classList.add('timeline-step--active');
            } else {
              step.classList.remove('timeline-step--active');
            }
          });
        }

        window.addEventListener('scroll', update, { passive: true });
        update();
      })();

    }());

(function() {

    // ══ ДАНІ (замінити dummy.pdf/zip на реальні URL після інтеграції CMS) ══
    var TC_DATA = {
      cert: {
        blocks: {
          D400: [
            { label: '600×200×100 мм', file: 'dummy.pdf', name: 'UDK_CE_D400_600x200x100.pdf' },
            { label: '600×200×150 мм', file: 'dummy.pdf', name: 'UDK_CE_D400_600x200x150.pdf' },
            { label: '600×200×200 мм', file: 'dummy.pdf', name: 'UDK_CE_D400_600x200x200.pdf' },
            { label: '600×200×250 мм', file: 'dummy.pdf', name: 'UDK_CE_D400_600x200x250.pdf' },
            { label: '600×200×300 мм', file: 'dummy.pdf', name: 'UDK_CE_D400_600x200x300.pdf' },
            { label: '600×200×375 мм', file: 'dummy.pdf', name: 'UDK_CE_D400_600x200x375.pdf' },
            { label: '600×200×400 мм', file: 'dummy.pdf', name: 'UDK_CE_D400_600x200x400.pdf' }
          ],
          D500: [
            { label: '600×200×200 мм', file: 'dummy.pdf', name: 'UDK_CE_D500_600x200x200.pdf' },
            { label: '600×200×250 мм', file: 'dummy.pdf', name: 'UDK_CE_D500_600x200x250.pdf' },
            { label: '600×200×300 мм', file: 'dummy.pdf', name: 'UDK_CE_D500_600x200x300.pdf' },
            { label: '600×200×375 мм', file: 'dummy.pdf', name: 'UDK_CE_D500_600x200x375.pdf' }
          ]
        },
        mixes: {
          TBM: { file: 'dummy.pdf', name: 'UDK_CE_TBM_Adhesive.pdf' },
          CPS: { file: 'dummy.pdf', name: 'UDK_CE_CPS_Cement.pdf' },
          MP1: { file: 'dummy.pdf', name: 'UDK_CE_MP1_Plaster.pdf' },
          TIG: { file: 'dummy.pdf', name: 'UDK_CE_TIG_Adhesive.pdf' },
          TGR: { file: 'dummy.pdf', name: 'UDK_CE_TGR_Adhesive.pdf' }
        }
      },
      lab: {
        // Формат: рік → місяць → масив {label, file, name}
        '2026': {
          '01': [
            { label: 'Партія #2601-01', file: 'dummy.pdf', name: 'UDK_Lab_2026_01_P01.pdf' },
            { label: 'Партія #2601-02', file: 'dummy.pdf', name: 'UDK_Lab_2026_01_P02.pdf' }
          ],
          '02': [
            { label: 'Партія #2602-01', file: 'dummy.pdf', name: 'UDK_Lab_2026_02_P01.pdf' },
            { label: 'Партія #2602-02', file: 'dummy.pdf', name: 'UDK_Lab_2026_02_P02.pdf' },
            { label: 'Партія #2602-03', file: 'dummy.pdf', name: 'UDK_Lab_2026_02_P03.pdf' }
          ],
          '03': [
            { label: 'Партія #2603-01', file: 'dummy.pdf', name: 'UDK_Lab_2026_03_P01.pdf' }
          ],
          '04': [
            { label: 'Партія #2604-01', file: 'dummy.pdf', name: 'UDK_Lab_2026_04_P01.pdf' },
            { label: 'Партія #2604-02', file: 'dummy.pdf', name: 'UDK_Lab_2026_04_P02.pdf' }
          ],
          '05': [
            { label: 'Партія #2605-01', file: 'dummy.pdf', name: 'UDK_Lab_2026_05_P01.pdf' }
          ]
        },
        '2025': {
          '10': [
            { label: 'Партія #2510-01', file: 'dummy.pdf', name: 'UDK_Lab_2025_10_P01.pdf' },
            { label: 'Партія #2510-02', file: 'dummy.pdf', name: 'UDK_Lab_2025_10_P02.pdf' }
          ],
          '11': [
            { label: 'Партія #2511-01', file: 'dummy.pdf', name: 'UDK_Lab_2025_11_P01.pdf' }
          ],
          '12': [
            { label: 'Партія #2512-01', file: 'dummy.pdf', name: 'UDK_Lab_2025_12_P01.pdf' },
            { label: 'Партія #2512-02', file: 'dummy.pdf', name: 'UDK_Lab_2025_12_P02.pdf' }
          ]
        },
        '2024': {
          '06': [{ label: 'Партія #2406-01', file: 'dummy.pdf', name: 'UDK_Lab_2024_06.pdf' }],
          '09': [{ label: 'Партія #2409-01', file: 'dummy.pdf', name: 'UDK_Lab_2024_09.pdf' }],
          '12': [{ label: 'Партія #2412-01', file: 'dummy.pdf', name: 'UDK_Lab_2024_12.pdf' }]
        }
      },
      bim: {
        revit: [
          { label: 'Стінові блоки (всі типорозміри)',  file: 'dummy.zip', name: 'UDK_BIM_Revit_WallBlocks.zip' },
          { label: 'Перегородочні блоки',              file: 'dummy.zip', name: 'UDK_BIM_Revit_Partitions.zip' },
          { label: 'UDK U-Block (несъємна опалубка)',  file: 'dummy.zip', name: 'UDK_BIM_Revit_UBlock.zip' },
          { label: 'Повний набір (всі типи)',           file: 'dummy.zip', name: 'UDK_BIM_Revit_Full.zip' }
        ],
        archicad: [
          { label: 'Стінові блоки (всі типорозміри)',  file: 'dummy.zip', name: 'UDK_BIM_ArchiCAD_WallBlocks.zip' },
          { label: 'Перегородочні блоки',              file: 'dummy.zip', name: 'UDK_BIM_ArchiCAD_Partitions.zip' },
          { label: 'UDK U-Block (несъємна опалубка)',  file: 'dummy.zip', name: 'UDK_BIM_ArchiCAD_UBlock.zip' },
          { label: 'Повний набір (всі типи)',           file: 'dummy.zip', name: 'UDK_BIM_ArchiCAD_Full.zip' }
        ]
      }
    };

    var MONTH_NAMES = {
      '01':'Січень','02':'Лютий','03':'Березень','04':'Квітень',
      '05':'Травень','06':'Червень','07':'Липень','08':'Серпень',
      '09':'Вересень','10':'Жовтень','11':'Листопад','12':'Грудень'
    };

    // ── утиліти ────────────────────────────────────────────────
    function setBtn(btn, file, name, enabled) {
      if (!btn) return;
      btn.href = enabled ? file : '#';
      btn.download = enabled ? name : '';
      btn.setAttribute('aria-disabled', enabled ? 'false' : 'true');
      btn.style.pointerEvents = enabled ? '' : 'none';
      btn.style.opacity = enabled ? '' : '0.32';
    }

    function setStatus(id, msg, cls) {
      var el = document.getElementById(id);
      if (!el) return;
      el.textContent = msg || '';
      el.className = 'tc-status' + (cls ? ' tc-status--' + cls : '');
    }

    function rebuildSelect(sel, items, placeholder) {
      sel.innerHTML = '';
      var ph = document.createElement('option');
      ph.value = '';
      ph.textContent = placeholder;
      sel.appendChild(ph);
      items.forEach(function(item) {
        var opt = document.createElement('option');
        opt.value = item.value !== undefined ? item.value : item.label;
        opt.textContent = item.label;
        sel.appendChild(opt);
      });
      sel.disabled = false;
    }

    // ── АККОРДЕОН (Архів + Розділи) ───────────────────────────
    document.querySelectorAll('.tc-accordion-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var expanded = btn.getAttribute('aria-expanded') === 'true';
        var bodyId = btn.id === 'lab-archive-btn' ? 'lab-archive-body' : 'guide-chapters-body';
        var body = document.getElementById(bodyId);
        btn.setAttribute('aria-expanded', expanded ? 'false' : 'true');
        if (body) body.classList.toggle('tc-accordion-body--open', !expanded);
      });
    });

    // ══════════════════════════════════════════════════════════
    // КАРТКА 1 — Сертифікати
    // ══════════════════════════════════════════════════════════

    // Tabs
    document.querySelectorAll('[data-tc-tab="cert"]').forEach(function(tab) {
      tab.addEventListener('click', function() {
        document.querySelectorAll('[data-tc-tab="cert"]').forEach(function(t) {
          t.classList.remove('tc-tab--active');
          t.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('tc-tab--active');
        tab.setAttribute('aria-selected', 'true');
        var panel = tab.getAttribute('data-tc-panel');
        document.getElementById('cert-blocks').style.display = panel === 'cert-blocks' ? '' : 'none';
        document.getElementById('cert-mixes').style.display  = panel === 'cert-mixes'  ? '' : 'none';
        setStatus('cert-status', '');
      });
    });

    // Density → Size cascade
    var certDensity = document.getElementById('cert-density');
    var certSize    = document.getElementById('cert-size');
    var certBlocksBtn = document.getElementById('cert-blocks-btn');

    certDensity.addEventListener('change', function() {
      var grade = certDensity.value;
      certSize.innerHTML = '';
      if (!grade) {
        certSize.disabled = true;
        certSize.innerHTML = '<option value="">Спочатку оберіть марку</option>';
        setBtn(certBlocksBtn, '#', '', false);
        setStatus('cert-status', '');
        return;
      }
      var sizes = TC_DATA.cert.blocks[grade] || [];
      rebuildSelect(certSize, sizes.map(function(s) { return { label: s.label, value: s.label }; }), 'Оберіть розмір…');
      setBtn(certBlocksBtn, '#', '', false);
      setStatus('cert-status', '');
    });

    certSize.addEventListener('change', function() {
      var grade = certDensity.value;
      var sizeLabel = certSize.value;
      if (!grade || !sizeLabel) { setBtn(certBlocksBtn, '#', '', false); return; }
      var sizes = TC_DATA.cert.blocks[grade] || [];
      var found = sizes.find(function(s) { return s.label === sizeLabel; });
      if (found) {
        setBtn(certBlocksBtn, found.file, found.name, true);
        setStatus('cert-status', '✓ Готово до завантаження', 'ok');
        if (typeof udkTrack === 'function') udkTrack('document_download_ready', { type: 'cert', grade: grade, size: sizeLabel });
      }
    });

    // Mix product
    var certMixProduct = document.getElementById('cert-mix-product');
    var certMixesBtn   = document.getElementById('cert-mixes-btn');
    certMixProduct.addEventListener('change', function() {
      var prod = certMixProduct.value;
      if (!prod) { setBtn(certMixesBtn, '#', '', false); return; }
      var data = TC_DATA.cert.mixes[prod];
      if (data) {
        setBtn(certMixesBtn, data.file, data.name, true);
        setStatus('cert-status', '✓ Готово до завантаження', 'ok');
      }
    });

    // ══════════════════════════════════════════════════════════
    // КАРТКА 2 — Протоколи лабораторії
    // ══════════════════════════════════════════════════════════
    var labYear  = document.getElementById('lab-year');
    var labMonth = document.getElementById('lab-month');
    var labBatch = document.getElementById('lab-batch');
    var labDlBtn = document.getElementById('lab-dl-btn');

    labYear.addEventListener('change', function() {
      var yr = labYear.value;
      labMonth.innerHTML = '<option value="">Оберіть місяць…</option>';
      labBatch.innerHTML = '<option value="">Спочатку оберіть місяць</option>';
      labBatch.disabled = true;
      setBtn(labDlBtn, '#', '', false);
      setStatus('lab-status', '');
      if (!yr) { labMonth.disabled = true; return; }
      var months = Object.keys(TC_DATA.lab[yr] || {}).sort();
      months.forEach(function(m) {
        var opt = document.createElement('option');
        opt.value = m;
        opt.textContent = MONTH_NAMES[m] || m;
        labMonth.appendChild(opt);
      });
      labMonth.disabled = false;
    });

    labMonth.addEventListener('change', function() {
      var yr = labYear.value; var mo = labMonth.value;
      labBatch.innerHTML = '<option value="">Оберіть партію…</option>';
      setBtn(labDlBtn, '#', '', false);
      setStatus('lab-status', '');
      if (!yr || !mo) { labBatch.disabled = true; return; }
      var batches = TC_DATA.lab[yr][mo] || [];
      batches.forEach(function(b) {
        var opt = document.createElement('option');
        opt.value = b.name;
        opt.setAttribute('data-file', b.file);
        opt.textContent = b.label;
        labBatch.appendChild(opt);
      });
      labBatch.disabled = false;
      setStatus('lab-status', batches.length + ' протокол(ів) знайдено', 'warn');
    });

    labBatch.addEventListener('change', function() {
      var sel = labBatch.options[labBatch.selectedIndex];
      if (!sel || !sel.value) { setBtn(labDlBtn, '#', '', false); return; }
      setBtn(labDlBtn, sel.getAttribute('data-file'), sel.value, true);
      setStatus('lab-status', '✓ Готово до завантаження', 'ok');
    });

    // ══════════════════════════════════════════════════════════
    // КАРТКА 3 — BIM-моделі
    // ══════════════════════════════════════════════════════════
    var bimSoftware = document.getElementById('bim-software');
    var bimProduct  = document.getElementById('bim-product');
    var bimDlBtn    = document.getElementById('bim-dl-btn');

    bimSoftware.addEventListener('change', function() {
      var sw = bimSoftware.value;
      bimProduct.innerHTML = '<option value="">2. Оберіть тип продукції…</option>';
      setBtn(bimDlBtn, '#', '', false);
      setStatus('bim-status', '');
      if (!sw) { bimProduct.disabled = true; return; }
      var products = TC_DATA.bim[sw] || [];
      products.forEach(function(p) {
        var opt = document.createElement('option');
        opt.value = p.name;
        opt.setAttribute('data-file', p.file);
        opt.textContent = p.label;
        bimProduct.appendChild(opt);
      });
      bimProduct.disabled = false;
      setStatus('bim-status', sw === 'revit' ? 'Revit 2020–2024 (.rfa)' : 'ArchiCAD 22–27 (.gsm)', 'warn');
    });

    bimProduct.addEventListener('change', function() {
      var sel = bimProduct.options[bimProduct.selectedIndex];
      if (!sel || !sel.value) { setBtn(bimDlBtn, '#', '', false); return; }
      setBtn(bimDlBtn, sel.getAttribute('data-file'), sel.value, true);
      setStatus('bim-status', '✓ Готово до завантаження', 'ok');
      if (typeof udkTrack === 'function') udkTrack('bim_download_ready', { software: bimSoftware.value, product: sel.textContent });
    });

  })();

window.formspree = window.formspree || function () { (formspree.q = formspree.q || []).push(arguments); };
    formspree('initForm', { formElement: '#b2b-form', formId: 'xkokznjw' });

(function() {
      const consentBanner = document.getElementById('cookie-consent');
      const btnAccept = document.getElementById('cookie-accept');
      const btnDecline = document.getElementById('cookie-decline');
      const consentKey = 'udk_cache_consent';

      function registerSW() {
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.register('/sw.js')
            .then(function (reg) {
              console.log('[UDK PWA] Service Worker зареєстровано (v7):', reg.scope);
            })
            .catch(function (err) {
              console.warn('[UDK PWA] Service Worker не зареєстровано:', err);
            });
        }
      }

      function unregisterSW() {
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then(function(registrations) {
            for(let registration of registrations) {
              registration.unregister();
            }
          });
        }
        // Очищаємо кеш
        if ('caches' in window) {
          caches.keys().then(function(names) {
            for (let name of names) {
              caches.delete(name);
            }
          });
        }
      }

      const currentConsent = localStorage.getItem(consentKey);

      if (currentConsent === 'granted') {
        // Якщо вже дозволено - просто реєструємо при завантаженні
        window.addEventListener('load', registerSW);
      } else if (currentConsent === 'denied') {
        // Якщо відмовлено - на всяк випадок видаляємо (якщо було зареєстровано раніше)
        unregisterSW();
      } else {
        // Якщо немає відповіді - показуємо банер
        setTimeout(function() {
          if(consentBanner) {
            consentBanner.classList.add('cookie-consent--show');
          }
        }, 1500);
      }

      if(btnAccept) {
        btnAccept.addEventListener('click', function() {
          localStorage.setItem(consentKey, 'granted');
          consentBanner.classList.remove('cookie-consent--show');
          registerSW();
        });
      }

      if(btnDecline) {
        btnDecline.addEventListener('click', function() {
          localStorage.setItem(consentKey, 'denied');
          consentBanner.classList.remove('cookie-consent--show');
          unregisterSW();
        });
      }
    })();

    // ── ЛАЙТБОКС ДЛЯ ТАЙМЛАЙНУ (Виробничий цикл) ────────────
    (function() {
      var steps = document.querySelectorAll('.timeline-step');
      var lightbox = document.getElementById('timeline-lightbox');
      var lbImg = document.getElementById('lightbox-img');
      var lbCaption = document.getElementById('lightbox-caption');
      var lbClose = document.getElementById('lightbox-close');

      if (!lightbox) return;

      var images = [
        'assets/images/UDK1.png',
        'assets/images/UDK2.png',
        'assets/images/UDK3.png',
        'assets/images/UDK4.png',
        'assets/images/UDK5.png',
        'assets/images/UDK6.png'
      ];

      steps.forEach(function(step) {
        step.addEventListener('click', function() {
          var stepIndex = parseInt(step.getAttribute('data-step'));
          var imgSrc = images[stepIndex];
          
          if (!imgSrc) return;

          lbImg.src = imgSrc;
          var titleEl = step.querySelector('.timeline-step__title');
          lbCaption.textContent = titleEl ? titleEl.textContent : '';
          
          lightbox.classList.add('lightbox--open');
          document.body.style.overflow = 'hidden';
        });
      });

      function closeLightbox() {
        lightbox.classList.remove('lightbox--open');
        document.body.style.overflow = '';
        setTimeout(function() { lbImg.src = ''; }, 400);
      }

      lbClose.addEventListener('click', closeLightbox);
      lightbox.addEventListener('click', function(e) {
        if (e.target === lightbox || e.target.classList.contains('lightbox__content')) {
          closeLightbox();
        }
      });
      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && lightbox.classList.contains('lightbox--open')) {
          closeLightbox();
        }
      });
    })();

(function() {
    var GA4_ID = 'G-XXXXXXXXXX'; // ← замінити на реальний ID
    var CLARITY_ID = 'XXXXXXXXXX'; // ← замінити на реальний ID
    var IS_PROD = (GA4_ID !== 'G-XXXXXXXXXX');

    // ── GA4 ────────────────────────────────────────────────────
    if (IS_PROD) {
      var gaScript = document.createElement('script');
      gaScript.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA4_ID;
      gaScript.async = true;
      document.head.appendChild(gaScript);
    }
    window.dataLayer = window.dataLayer || [];
    function gtag(){ dataLayer.push(arguments); }
    gtag('js', new Date());
    if (IS_PROD) gtag('config', GA4_ID, { send_page_view: true });

    // ── Microsoft Clarity (heatmaps, session recordings) ──────
    if (IS_PROD && CLARITY_ID !== 'XXXXXXXXXX') {
      (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src='https://www.clarity.ms/tag/'+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
      })(window, document, 'clarity', 'script', CLARITY_ID);
    }

    // ── Universal track helper ─────────────────────────────────
    // udkTrack(eventName, params) — у prod надсилає в GA4, у dev логує
    window.udkTrack = function(eventName, params) {
      if (IS_PROD) {
        gtag('event', eventName, params || {});
      } else {
        console.log('[UDK Analytics DEBUG]', eventName, params || {});
      }
    };

    // Локальний throttle для scroll-подій у цьому блоці
    function _throttle(fn, ms) {
      var last = 0;
      return function() { var now = Date.now(); if (now - last >= ms) { last = now; fn.apply(this, arguments); } };
    }

    // ── АВТО-ТРЕКІНГ ПОДІЙ ────────────────────────────────────

    // 1. CTA-кнопки (Hero, Nav, будь-які .btn--primary / .nav__cta)
    document.addEventListener('click', function(e) {
      var el = e.target.closest('a[href="#b2b"], .nav__cta, .btn--primary, #calc-to-b2b-btn, #mobile-fab');
      if (el) {
        udkTrack('cta_click', {
          label: el.textContent.trim().slice(0, 60),
          source: el.id || el.className.split(' ')[0]
        });
      }
    });

    // 2. FAQ відкриття
    document.addEventListener('click', function(e) {
      var faqBtn = e.target.closest('.faq__question, .faq__toggle');
      if (faqBtn) {
        var faqItem = faqBtn.closest('.faq__item');
        var question = faqItem ? faqItem.querySelector('[data-lang-ua]') : null;
        udkTrack('faq_open', { question: question ? question.getAttribute('data-lang-ua').slice(0, 80) : 'unknown' });
      }
    });

    // 3. Перемикання мови
    document.addEventListener('click', function(e) {
      var langBtn = e.target.closest('#lang-ua, #lang-en');
      if (langBtn) {
        udkTrack('lang_switch', { to: langBtn.id === 'lang-ua' ? 'ua' : 'en' });
      }
    });

    // 4. PDF export
    var pdfBtn = document.querySelector('button[onclick="window.print()"]');
    if (pdfBtn) {
      pdfBtn.addEventListener('click', function() {
        udkTrack('pdf_export', { blocks: document.getElementById('result-blocks').textContent });
      });
    }

    // 5. Share link
    var shareBtn = document.getElementById('share-url-btn');
    if (shareBtn) {
      shareBtn.addEventListener('click', function() {
        udkTrack('share_link', {});
      });
    }

    // 6. BIM/документи — завантаження
    document.addEventListener('click', function(e) {
      var link = e.target.closest('a[href$=".pdf"], a[href$=".zip"], a[href*="bim"], a[href*="BIM"]');
      if (link) {
        udkTrack('document_download', {
          file: link.href.split('/').pop(),
          label: link.textContent.trim().slice(0, 60)
        });
      }
    });

    // 7. B2B форма — submit
    var b2bForm = document.getElementById('b2b-form');
    if (b2bForm) {
      b2bForm.addEventListener('submit', function() {
        var volume = document.getElementById('result-volume') ? document.getElementById('result-volume').textContent : '';
        udkTrack('b2b_form_submit', { volume: volume });
      });
    }

    // 8. Scroll Depth (25%, 50%, 75%, 100%)
    var scrollDepthFired = {};
    window.addEventListener('scroll', _throttle(function() {
      var pct = Math.round((window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100);
      [25, 50, 75, 100].forEach(function(depth) {
        if (pct >= depth && !scrollDepthFired[depth]) {
          scrollDepthFired[depth] = true;
          udkTrack('scroll_depth', { percent: depth });
        }
      });
    }, 500), { passive: true });

    // ── MOBILE FAB: показати після першого скролу ──────────────
    var mobileFab = document.getElementById('mobile-fab');
    var b2bSection = document.getElementById('b2b');
    if (mobileFab) {
      var fabShown = false;
      window.addEventListener('scroll', _throttle(function() {
        var scrolled = window.scrollY > 300;
        var b2bRect = b2bSection ? b2bSection.getBoundingClientRect() : null;
        var nearB2B = b2bRect && b2bRect.top < window.innerHeight && b2bRect.bottom > 0;
        if (scrolled && !nearB2B) {
          if (!fabShown) { mobileFab.classList.add('mobile-fab--visible'); fabShown = true; }
        } else {
          mobileFab.classList.remove('mobile-fab--visible');
          fabShown = false;
        }
      }, 100), { passive: true });
    }

    // ── ТЕПЛОФІЗИЧНИЙ СИМУЛЯТОР СТІНИ (НОВИЙ РОЗДІЛ) ─────────────
    (function () {
      var simGrade = document.getElementById('sim-grade');
      var simThickness = document.getElementById('sim-thickness');
      var simThicknessVal = document.getElementById('sim-thickness-val');
      var simInsulationType = document.getElementById('sim-insulation-type');
      var simInsulation = document.getElementById('sim-insulation');
      var simInsulationVal = document.getElementById('sim-insulation-val');
      var simInsulationWrap = document.getElementById('sim-insulation-wrap');
      var simTemp = document.getElementById('sim-temp');
      var simTempVal = document.getElementById('sim-temp-val');
      var simRValue = document.getElementById('sim-r-value');
      var simDbnBadge = document.getElementById('sim-dbn-badge');
      var canvas = document.getElementById('physics-canvas');
      var warningBox = document.getElementById('sim-warning-box');
      var warningTitle = document.getElementById('sim-warning-title');
      var warningDesc = document.getElementById('sim-warning-desc');
      var legendOutsideTemp = document.getElementById('legend-outside-temp');

      if (!simGrade || !canvas) return;

      var ctx = canvas.getContext('2d');

      // Heat transfer coefficients (W/mK)
      var lambdas = {
        block: { 400: 0.10, 500: 0.12 },
        insulation: { none: 0, wool: 0.040, polystyrene: 0.038 }
      };

      // Surface air resistances (m2K/W)
      var R_si = 0.115;
      var R_se = 0.043;
      var T_in = 20; // Internal air temp (Celsius)
      var T_dew = 9.3; // Dew point condensation temperature (at 50% relative humidity, +20C inside)

      function getLang() {
        return document.documentElement.lang === 'uk' ? 'ua' : 'en';
      }

      function updateSimulator() {
        var grade = parseInt(simGrade.value) || 400;
        var thicknessBlockMm = parseInt(simThickness.value) || 375;
        var insType = simInsulationType.value;
        var thicknessInsMm = parseInt(simInsulation.value) || 100;
        var T_out = parseInt(simTemp.value) || -20;
        var lang = getLang();

        // 1. Toggle insulation controls
        if (insType === 'none') {
          simInsulationWrap.style.display = 'none';
        } else {
          simInsulationWrap.style.display = 'block';
        }

        // 2. Update text labels
        simThicknessVal.textContent = thicknessBlockMm + ' ' + (lang === 'ua' ? 'мм' : 'mm');
        simInsulationVal.textContent = thicknessInsMm + ' ' + (lang === 'ua' ? 'мм' : 'mm');
        simTempVal.textContent = (T_out > 0 ? '+' : '') + T_out + ' °C';
        legendOutsideTemp.textContent = (T_out > 0 ? '+' : '') + T_out + '°C';

        // 3. Thermal resistances (R = d / lambda)
        var d_block = thicknessBlockMm / 1000; // in meters
        var lambda_block = lambdas.block[grade];
        var R_block = d_block / lambda_block;

        var d_ins = thicknessInsMm / 1000; // in meters
        var lambda_ins = lambdas.insulation[insType];
        var R_ins = insType !== 'none' ? d_ins / lambda_ins : 0;

        var R_total = R_si + R_block + R_ins + R_se;

        // 4. Update R-value readout
        simRValue.textContent = R_total.toFixed(2);

        // 5. Check DBN Compliance (Zone 1 requires R >= 3.3)
        var isCompliant = R_total >= 3.3;
        simDbnBadge.className = 'physics-dbn-badge ' + (isCompliant ? 'physics-dbn-badge--pass' : 'physics-dbn-badge--fail');
        if (isCompliant) {
          simDbnBadge.textContent = lang === 'ua' ? 'ВІДПОВІДАЄ ДБН ✅' : 'DBN COMPLIANT ✅';
        } else {
          simDbnBadge.textContent = lang === 'ua' ? 'НЕ ВІДПОВІДАЄ ДБН ❌' : 'NON-COMPLIANT ❌';
        }

        // 6. Draw wall structure and temperature gradient on Canvas
        drawCanvas(thicknessBlockMm, insType, thicknessInsMm, T_out, R_total, R_block, R_ins);
      }

      function drawCanvas(thickBlock, insType, thickIns, T_out, R_total, R_block, R_ins) {
        var w = canvas.width = canvas.offsetWidth;
        var h = canvas.height = canvas.offsetHeight;

        ctx.clearRect(0, 0, w, h);

        // Grid lines (blueprint style)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 0.5;
        for (var x = 20; x < w; x += 20) {
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
        }
        for (var y = 20; y < h; y += 20) {
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }

        // X boundaries of visual zones
        var padLeft = Math.round(w * 0.15); // indoor air zone
        var padRight = Math.round(w * 0.15); // outdoor air zone
        var usableWidth = w - padLeft - padRight;

        // Visual width ratios (scaled representation)
        // Max total thickness: block 400 + insulation 150 = 550mm
        var maxThickness = 550;
        var blockRatio = thickBlock / maxThickness;
        var insRatio = insType !== 'none' ? thickIns / maxThickness : 0;
        var totalRatio = blockRatio + insRatio;

        // Actual pixel widths
        var pixelBlock = Math.round(usableWidth * (blockRatio / totalRatio));
        var pixelIns = insType !== 'none' ? Math.round(usableWidth * (insRatio / totalRatio)) : 0;

        var x0 = padLeft; // start of block
        var x1 = x0 + pixelBlock; // end of block / start of insulation
        var x2 = x1 + pixelIns; // end of insulation

        // Colors
        var colorBlock = 'rgba(255, 255, 255, 0.06)';
        var colorIns = insType === 'wool' ? 'rgba(234, 179, 8, 0.06)' : 'rgba(56, 189, 248, 0.06)';
        var borderBlock = 'rgba(255, 255, 255, 0.2)';
        var borderIns = insType === 'wool' ? 'rgba(234, 179, 8, 0.25)' : 'rgba(56, 189, 248, 0.25)';

        // Heat flow flux (q)
        var q = (T_in - T_out) / R_total;

        // Boundary temperatures
        var T_si = T_in - q * R_si; // interior surface temperature
        var T_boundary = T_si - q * R_block; // boundary block/insulation
        var T_se = insType !== 'none' ? T_boundary - q * R_ins : T_boundary; // exterior surface temperature
        var T_so = T_se - q * R_se; // outer air boundary

        // 1. Draw structural layer blocks
        // Block Layer
        ctx.fillStyle = colorBlock;
        ctx.fillRect(x0, 0, pixelBlock, h);
        ctx.strokeStyle = borderBlock;
        ctx.lineWidth = 1;
        ctx.strokeRect(x0, 0, pixelBlock, h);

        // Insulation Layer
        if (pixelIns > 0) {
          ctx.fillStyle = colorIns;
          ctx.fillRect(x1, 0, pixelIns, h);
          ctx.strokeStyle = borderIns;
          ctx.lineWidth = 1;
          ctx.strokeRect(x1, 0, pixelIns, h);
        }

        // Draw Layer Labels
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        
        var blockLabel = 'UDK ' + simGrade.value + ' (' + thickBlock + 'mm)';
        ctx.fillText(blockLabel, x0 + pixelBlock / 2, h - 14);

        if (pixelIns > 0) {
          var insLabel = (insType === 'wool' ? 'WOOL' : 'EPS') + ' (' + thickIns + 'mm)';
          ctx.fillStyle = insType === 'wool' ? 'rgba(234, 179, 8, 0.6)' : 'rgba(56, 189, 248, 0.6)';
          ctx.fillText(insLabel, x1 + pixelIns / 2, h - 14);
        }

        // 2. Draw temperature heat map overlay
        var tempGrad = ctx.createLinearGradient(0, 0, w, 0);
        tempGrad.addColorStop(0, 'rgba(239, 68, 68, 0.08)'); // Warm inside
        tempGrad.addColorStop(x0 / w, 'rgba(239, 68, 68, 0.08)');
        tempGrad.addColorStop(x2 / w, 'rgba(56, 189, 248, 0.08)'); // Freezing outside
        tempGrad.addColorStop(1, 'rgba(56, 189, 248, 0.15)');
        ctx.fillStyle = tempGrad;
        ctx.fillRect(0, 0, w, h);

        // 3. Map temperatures to vertical graph coordinates
        // Let Y=30px correspond to +20C, Y=h-40px correspond to -20C
        var yTempMax = 20;
        var yTempMin = -20;
        function getTempY(temp) {
          var pct = (temp - yTempMin) / (yTempMax - yTempMin); // 0 to 1
          pct = Math.max(0, Math.min(1, pct));
          return h - 40 - pct * (h - 70); // vertical scale
        }

        // Vertices for temperature line
        var pts = [
          { x: 0, y: getTempY(T_in) },
          { x: x0, y: getTempY(T_si) },
          { x: x1, y: getTempY(T_boundary) },
          { x: x2, y: getTempY(T_se) },
          { x: w, y: getTempY(T_out) }
        ];

        // Draw temperature drop line
        ctx.strokeStyle = 'rgba(234, 175, 16, 0.8)';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = 'rgba(234, 175, 16, 0.4)';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (var i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0; // reset

        // Draw temperature markers at boundaries
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        
        ctx.fillText((T_si > 0 ? '+' : '') + T_si.toFixed(1) + '°', x0, pts[1].y - 8);
        ctx.fillText((T_boundary > 0 ? '+' : '') + T_boundary.toFixed(1) + '°', x1, pts[2].y - 8);
        if (pixelIns > 0) {
          ctx.fillText((T_se > 0 ? '+' : '') + T_se.toFixed(1) + '°', x2, pts[3].y - 8);
        }

        // 4. Find and draw the Dew Point (Точка роси) intersection
        // The condensation dew point occurs at T_dew = 9.3C.
        // We find the X coordinate where Y(x) = getTempY(9.3C)
        var dewY = getTempY(T_dew);
        var dewX = -1;

        // Check each segment to see if 9.3C is crossed
        for (var i = 0; i < pts.length - 1; i++) {
          var pA = pts[i];
          var pB = pts[i+1];
          var yA = pA.y;
          var yB = pB.y;

          // Check if dewY is between yA and yB (or yB and yA)
          if ((dewY >= yA && dewY <= yB) || (dewY >= yB && dewY <= yA)) {
            // Linear interpolation of X
            var ratio = (dewY - yA) / (yB - yA);
            dewX = pA.x + ratio * (pB - pA.x);
            break;
          }
        }

        // Check if condensation risk is inside the room (dew point is left of or on internal surface x0)
        // Or if interior surface temperature is colder than dew point temperature (T_si <= 9.3C)
        var isDewWarning = T_si <= T_dew;
        var lang = getLang();

        if (dewX !== -1) {
          // Draw horizontal helper line for Dew Point
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.25)';
          ctx.setLineDash([4, 4]);
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(0, dewY); ctx.lineTo(w, dewY); ctx.stroke();
          ctx.setLineDash([]); // reset

          // Draw Dew point label on left margin
          ctx.fillStyle = 'rgba(239, 68, 68, 0.7)';
          ctx.font = '8px monospace';
          ctx.textAlign = 'left';
          ctx.fillText('9.3°C Dew', 4, dewY - 4);

          // Draw flashing droplet icon at dewX, dewY
          ctx.beginPath();
          ctx.arc(dewX, dewY, 5, 0, Math.PI * 2);
          ctx.fillStyle = isDewWarning ? '#ef4444' : '#10b981';
          ctx.shadowColor = isDewWarning ? 'rgba(239, 68, 68, 0.6)' : 'rgba(16, 185, 129, 0.6)';
          ctx.shadowBlur = 10;
          ctx.fill();
          ctx.shadowBlur = 0;

          // Visual drop
          ctx.fillStyle = '#fff';
          ctx.font = '10px sans-serif';
          ctx.fillText('💧', dewX - 5, dewY - 8);
        }

        // 5. Update Warning Box
        if (isDewWarning) {
          warningBox.className = 'physics-warning-box physics-warning-box--warning';
          if (lang === 'ua') {
            warningTitle.textContent = '⚠️ Ризик конденсату та грибка! Стіна холодна.';
            warningDesc.textContent = 'Точка роси (' + T_dew + '°C) виходить безпосередньо на внутрішню стіну кімнати. Волога буде конденсуватись на шпалерах. Збільшіть товщину блоку або додайте утеплення!';
          } else {
            warningTitle.textContent = '⚠️ Condensation & mould risk! The wall is cold.';
            warningDesc.textContent = 'The condensation dew point (' + T_dew + '°C) occurs on the interior room plaster. Moisture will form directly on internal walls. Increase block thickness or add insulation!';
          }
        } else {
          warningBox.className = 'physics-warning-box physics-warning-box--safe';
          if (lang === 'ua') {
            warningTitle.textContent = '✅ Конденсат безпечний (всередині матеріалу)';
            warningDesc.textContent = 'Точка роси знаходиться глибоко всередині стінового блоку або в утеплювачі. Конденсація на внутрішній стіні кімнати повністю виключена.';
          } else {
            warningTitle.textContent = '✅ Condensation is safe (inside material)';
            warningDesc.textContent = 'The dew point is safely located inside the core block or insulation material. Condensation on interior walls is completely prevented.';
          }
        }
      }

      // Hook up event listeners
      simGrade.addEventListener('change', updateSimulator);
      simThickness.addEventListener('input', updateSimulator);
      simInsulationType.addEventListener('change', updateSimulator);
      simInsulation.addEventListener('input', updateSimulator);
      simTemp.addEventListener('input', updateSimulator);

      // Trigger first run
      updateSimulator();

      // Redraw simulator when language changes
      document.addEventListener('udkLangChange', function () {
        updateSimulator();
      });

      // Redraw canvas on window resize to ensure correct pixel scale
      var resizeTimer;
      window.addEventListener('resize', function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(updateSimulator, 250);
      });
    })();

    // ── ІНТЕРАКТИВНЕ МОДАЛЬНЕ ВІКНО З 3D КУБОМ ─────────────────────────
    (function () {
      var modal = document.getElementById('product-modal');
      var closeBtn = document.getElementById('modal-close');
      var cuboid = document.getElementById('block-cuboid');
      var thicknessSlider = document.getElementById('modal-thickness-slider');
      var thicknessReadout = document.getElementById('modal-thickness-readout');
      var ticksContainer = document.getElementById('modal-ticks-container');
      var labelDepth = document.getElementById('label-3d-depth');
      var scene = document.getElementById('scene-3d-box');

      var modalTitle = document.getElementById('modal-title');
      var modalDesc = document.getElementById('modal-desc');
      var modalEyebrow = document.getElementById('modal-eyebrow');
      var specStrength = document.getElementById('spec-strength');
      var specDensity = document.getElementById('spec-density');
      var specLambda = document.getElementById('spec-lambda');
      var modalCtaBtn = document.getElementById('modal-cta-btn');

      if (!modal || !cuboid || !scene) return;

      // Product dataset
      var products = {
        1: {
          ua: {
            eyebrow: "01 — Несучий Стіновий Блок",
            title: "Стінові блоки UDK Gazbeton",
            desc: "Високоточні конструкційно-теплоізоляційні блоки UDK для зведення несучих зовнішніх та внутрішніх стін будівель (до 4 поверхів). Завдяки категорійній точності геометрії (±1 мм) створюють безшовну стінову кладку, що нівелює будь-яке утворення містків холоду та забезпечує однорідну теплоізоляцію будинку.",
            cta: "Розрахувати кількість →"
          },
          en: {
            eyebrow: "01 — Load-bearing Wall Block",
            title: "UDK Wall Blocks",
            desc: "High-precision structural and insulating UDK blocks designed for load-bearing external and internal walls (up to 4 stories). Extreme dimensional Category I accuracy (±1 mm) eliminates heat-bleeding seams, providing airtight uniform thermal insulation for your house.",
            cta: "Calculate Quantity →"
          },
          strength: "B2.5 / B3.5",
          density: "D400 / D500",
          lambda: "0.10 / 0.12 W/mK",
          thicknesses: [200, 250, 300, 375, 400],
          defaultThickness: 375
        },
        2: {
          ua: {
            eyebrow: "02 — Блоки Для Перегородок",
            title: "Перегородочні блоки UDK",
            desc: "Легкі газобетонні блоки, спеціально оновлені для зведення міжкімнатних перегородок та самонесучих огороджувальних конструкцій. Вони мають відмінні звукоізоляційні показники, легко ріжуться ручною пилою під будь-які кути, швидко монтуються та створюють мінімальне навантаження на залізобетонні плити перекриття.",
            cta: "Порахувати перегородки →"
          },
          en: {
            eyebrow: "02 — Partition Block",
            title: "UDK Partition Blocks",
            desc: "Lightweight aerated concrete blocks custom-optimized for fast assembly of interior partition walls and self-supporting enclosures. Deliver outstanding acoustic noise cancellation, cut easily to any angle with hand saws, and place minimal dead-weight load on floor slabs.",
            cta: "Calculate Partitions →"
          },
          strength: "B2.5",
          density: "D400 / D500",
          lambda: "0.10 / 0.12 W/mK",
          thicknesses: [50, 75, 100, 125, 150],
          defaultThickness: 100
        },
        3: {
          ua: {
            eyebrow: "03 — Спеціальний Елемент",
            title: "Блоки UDK U-Block",
            desc: "Спеціальні лоткові U-подібні блоки, що слугують незнімною теплоізоляційною опалубкою для влаштування залізобетонних перемичок над вікнами та дверима, сейсмопоясів, балок та ребер жорсткості. Дозволяють уникнути складного монтажу дерев'яної опалубки та створюють однорідну теплу поверхню стіни під подальшу штукатурку.",
            cta: "Перейти до розрахунку →"
          },
          en: {
            eyebrow: "03 — Special Formwork",
            title: "UDK U-Block Elements",
            desc: "Special U-shaped structural channel elements serving as permanent thermal concrete formwork for lintels over doors/windows, seismically-isolated ring beams, and concrete support structures. Eliminates tedious wood carpentry setups while offering a uniform aerated block texture for facades.",
            cta: "Go to Calculator →"
          },
          strength: "B3.5",
          density: "D500",
          lambda: "0.12 W/mK",
          thicknesses: [250, 300, 375],
          defaultThickness: 300
        }
      };

      var activeProductId = 1;

      function getModalLang() {
        return document.documentElement.lang === 'uk' ? 'ua' : 'en';
      }

      function updateModalSpecs() {
        var p = products[activeProductId];
        var lang = getModalLang();

        modalEyebrow.textContent = p[lang].eyebrow;
        modalTitle.textContent = p[lang].title;
        modalDesc.textContent = p[lang].desc;
        modalCtaBtn.textContent = p[lang].cta;

        specStrength.textContent = p.strength;
        specDensity.textContent = p.density;
        specLambda.textContent = p.lambda;
      }

      // Open Modal
      function openModal(id) {
        activeProductId = id;
        var p = products[id];
        
        // 1. Update text content
        updateModalSpecs();

        // 2. Setup Slider ticks and min/max
        var thicknesses = p.thicknesses;
        thicknessSlider.min = thicknesses[0];
        thicknessSlider.max = thicknesses[thicknesses.length - 1];
        
        var step = 25;
        thicknessSlider.step = step;
        
        // Populate tick markers below slider
        ticksContainer.innerHTML = '';
        thicknesses.forEach(function (t) {
          var span = document.createElement('span');
          span.textContent = t;
          ticksContainer.appendChild(span);
        });

        // Set default value
        var defVal = p.defaultThickness;
        thicknessSlider.value = defVal;
        
        // 3. Render 3D Block initial geometry
        update3DBlockGeometry(defVal);

        // 4. Open Modal Window
        modal.classList.add('block-modal--open');
        document.body.style.overflow = 'hidden'; // block page scrolling
      }

      function closeModal() {
        modal.classList.remove('block-modal--open');
        document.body.style.overflow = ''; // restore scrolling
      }

      // Update 3D Block geometric scaling
      function update3DBlockGeometry(depthMm) {
        var lang = getModalLang();
        
        // We calculate visual depth.
        // Let length 600mm map to width 160px on screen.
        // Therefore, 1mm maps to 160/600 = 0.266 pixels.
        var pixelDepth = depthMm * (160 / 600);

        // Update CSS variable --depth inside cuboid
        cuboid.style.setProperty('--depth', pixelDepth + 'px');

        // Update face dimension readouts
        labelDepth.textContent = depthMm + ' ' + (lang === 'ua' ? 'мм' : 'mm');
        thicknessReadout.textContent = depthMm + ' ' + (lang === 'ua' ? 'мм' : 'mm');

        // Translate the label coordinates based on depth
        labelDepth.style.transform = 'translateZ(' + (pixelDepth / 2 + 10) + 'px)';
      }

      // Hook up clicks on UDK Product Cards
      var cards = document.querySelectorAll('.prod-card');
      cards.forEach(function (card, index) {
        card.style.cursor = 'pointer';
        card.addEventListener('click', function () {
          // Indexes are 1-based (index + 1)
          openModal(index + 1);
        });
      });

      closeBtn.addEventListener('click', closeModal);
      modal.addEventListener('click', function (e) {
        if (e.target === modal) closeModal();
      });

      thicknessSlider.addEventListener('input', function () {
        var val = parseInt(this.value);
        var p = products[activeProductId];
        
        // Snapping logic to available sizes
        var snappedVal = p.thicknesses[0];
        var minDiff = Math.abs(val - snappedVal);
        p.thicknesses.forEach(function (t) {
          var diff = Math.abs(val - t);
          if (diff < minDiff) {
            minDiff = diff;
            snappedVal = t;
          }
        });
        
        this.value = snappedVal;
        update3DBlockGeometry(snappedVal);
      });

      // ── ЛОГІКА ОБЕРТАННЯ 3D БЛОКУ МИШКОЮ ───────────────────────
      (function () {
        var isDragging = false;
        var prevX = 0;
        var prevY = 0;
        var rotX = -22; // starting pitch
        var rotY = 42;  // starting yaw

        scene.addEventListener('mousedown', startRotate, false);
        scene.addEventListener('touchstart', startRotate, false);

        function startRotate(e) {
          isDragging = true;
          prevX = e.clientX || e.touches[0].clientX;
          prevY = e.clientY || e.touches[0].clientY;

          document.addEventListener('mousemove', doRotate, false);
          document.addEventListener('mouseup', stopRotate, false);
          document.addEventListener('touchmove', doRotate, false);
          document.addEventListener('touchend', stopRotate, false);
        }

        function doRotate(e) {
          if (!isDragging) return;
          e.preventDefault();
          
          var clientX = e.clientX || e.touches[0].clientX;
          var clientY = e.clientY || e.touches[0].clientY;

          var deltaX = clientX - prevX;
          var deltaY = clientY - prevY;

          prevX = clientX;
          prevY = clientY;

          rotY += deltaX * 0.5;
          rotX -= deltaY * 0.5;

          rotX = Math.max(-80, Math.min(80, rotX));

          cuboid.style.transform = 'rotateX(' + rotX + 'deg) rotateY(' + rotY + 'deg)';
        }

        function stopRotate() {
          isDragging = false;
          document.removeEventListener('mousemove', doRotate, false);
          document.removeEventListener('mouseup', stopRotate, false);
          document.removeEventListener('touchmove', doRotate, false);
          document.removeEventListener('touchend', stopRotate, false);
        }
      })();

      // Redraw / re-localize modal when language is changed
      document.addEventListener('udkLangChange', function () {
        if (modal.classList.contains('block-modal--open')) {
          updateModalSpecs();
          update3DBlockGeometry(parseInt(thicknessSlider.value));
        }
      });
    })();

  })();

