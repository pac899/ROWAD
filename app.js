(function(){
  'use strict';

  const supabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

  const el = {
    storeName: document.getElementById('store-name'),
    footerStoreName: document.getElementById('footer-store-name'),
    storeLogo: document.getElementById('store-logo'),
    sliderTrack: document.getElementById('slider-track'),
    sliderPrev: document.getElementById('slider-prev'),
    sliderNext: document.getElementById('slider-next'),
    sliderDots: document.getElementById('slider-dots'),
    categoriesList: document.getElementById('categories-list'),
    productsGrid: document.getElementById('products-grid'),
    searchInput: document.getElementById('search-input'),
    cartBar: document.getElementById('cart-bar'),
    cartBarButton: document.getElementById('cart-bar-button'),
    cartBarCount: document.getElementById('cart-bar-count'),
    cartBarTotal: document.getElementById('cart-bar-total'),
    cartOverlay: document.getElementById('cart-overlay'),
    cartDrawer: document.getElementById('cart-drawer'),
    cartClose: document.getElementById('cart-close'),
    cartItems: document.getElementById('cart-items'),
    cartTotal: document.getElementById('cart-total'),
    checkoutBtn: document.getElementById('checkout-btn'),
    // Components modal
    compOverlay: document.getElementById('comp-overlay'),
    compDialog: document.getElementById('comp-dialog'),
    compList: document.getElementById('comp-list'),
    compClose: document.getElementById('comp-close'),
    compCancel: document.getElementById('comp-cancel'),
    compConfirm: document.getElementById('comp-confirm'),
    // Product details modal
    prodOverlay: document.getElementById('prod-overlay'),
    prodDialog: document.getElementById('prod-dialog'),
    prodClose: document.getElementById('prod-close'),
    prodTitle: document.getElementById('prod-title'),
    prodDesc: document.getElementById('prod-desc'),
    prodPrice: document.getElementById('prod-price'),
    prodAdd: document.getElementById('prod-add'),
    prodBuy: document.getElementById('prod-buy'),
    prodMainList: document.getElementById('prod-main-list'),
    prodThumbsList: document.getElementById('prod-thumbs-list'),
    themeToggle: document.getElementById('theme-toggle'),
    // Sidebar (categories)
    menuButton: document.getElementById('menu-button'),
    sideOverlay: document.getElementById('side-overlay'),
    sideDrawer: document.getElementById('side-drawer'),
    sideClose: document.getElementById('side-close'),
    sideCats: document.getElementById('side-cats'),
    sideSearch: document.getElementById('side-search'),
    aboutOverlay: document.getElementById('about-overlay'),
    aboutDialog: document.getElementById('about-dialog'),
    aboutOpen: document.getElementById('about-open'),
    aboutClose: document.getElementById('about-close'),
    aboutOk: document.getElementById('about-ok'),
    // Notifications dialog
    notifOverlay: document.getElementById('notif-overlay'),
    notifDialog: document.getElementById('notif-dialog'),
    notifOpen: document.getElementById('notif-open'),
    notifClose: document.getElementById('notif-close'),
    notifEnable: document.getElementById('notif-enable'),
    notifCopy: document.getElementById('notif-copy'),
    notifStatus: document.getElementById('notif-status'),
    notifToken: document.getElementById('notif-token'),
    // Name prompt
    nameOverlay: document.getElementById('name-overlay'),
    nameDialog: document.getElementById('name-dialog'),
    nameClose: document.getElementById('name-close'),
    nameCancel: document.getElementById('name-cancel'),
    nameConfirm: document.getElementById('name-confirm'),
    nameInput: document.getElementById('name-input'),
  };

  // -------------------------
  // Simple localStorage cache (TTL)
  // -------------------------
  const CACHE_NS = 'menu_cache_v1';
  function cacheKey(key){ return `${CACHE_NS}:${key}`; }
  function cacheSet(key, data, ttlMs){
    try{
      const rec = { data, exp: Date.now() + ttlMs };
      localStorage.setItem(cacheKey(key), JSON.stringify(rec));
    }catch(_){ /* ignore */ }
  }

  function openNotif(){
    if(!el.notifDialog || !el.notifOverlay) return;
    el.notifDialog.hidden = false; el.notifOverlay.hidden = false;
    refreshNotifStatus();
  }
  function closeNotif(){
    if(!el.notifDialog || !el.notifOverlay) return;
    el.notifDialog.hidden = true; el.notifOverlay.hidden = true;
  }
  function refreshNotifStatus(){
    try{
      const supported = ('serviceWorker' in navigator) && window.firebase && window.FCM_VAPID_KEY;
      const perm = (typeof Notification !== 'undefined') ? Notification.permission : 'default';
      const tok = (()=>{ try{ return localStorage.getItem('device_token') || ''; }catch(_){ return ''; } })();
      if(el.notifStatus){
        if(!supported){ el.notifStatus.textContent = 'الجهاز/المتصفح لا يدعم إشعارات الويب.'; }
        else if(perm === 'denied'){ el.notifStatus.textContent = 'تم رفض الإذن. عدّل إعدادات الموقع للسماح بالإشعارات.'; }
        else if(perm === 'granted' && tok){ el.notifStatus.textContent = 'الإشعارات مفعلة.'; }
        else if(perm === 'granted' && !tok){ el.notifStatus.textContent = 'الإشعارات مفعلة، جاري جلب التوكن...'; }
        else { el.notifStatus.textContent = 'الإذن غير مفعّل بعد.'; }
      }
      if(el.notifToken){ el.notifToken.value = tok; }
    }catch(_){ }
  }
  async function enableNotifications(){
    try{
      if(!(window.firebase && 'serviceWorker' in navigator && window.Notification)){
        toast('الجهاز لا يدعم الإشعارات'); return;
      }
      const perm = await Notification.requestPermission();
      if(perm !== 'granted'){ refreshNotifStatus(); return; }
      const reg = await navigator.serviceWorker.getRegistration();
      const messaging = window.firebase.messaging();
      const token = await messaging.getToken({ vapidKey: window.FCM_VAPID_KEY, serviceWorkerRegistration: reg }).catch(()=>null);
      if(token){
        state.deviceToken = token;
        try{ localStorage.setItem('device_token', token); }catch(_){ }
        if(el.notifToken) el.notifToken.value = token;
        toast('تم تفعيل الإشعارات');
      }
      refreshNotifStatus();
    }catch(e){ console.warn(e); toast('تعذر تفعيل الإشعارات'); }
  }
  async function copyNotifToken(){
    try{
      const tok = el.notifToken?.value || localStorage.getItem('device_token') || '';
      if(!tok){ toast('لا يوجد توكن'); return; }
      await navigator.clipboard.writeText(tok);
      toast('تم النسخ');
    }catch(_){ toast('تعذر النسخ'); }
  }

  function resolveTableNumber(){
    try{
      // 1) URLSearchParams (?table=1)
      const q = new URLSearchParams(location.search);
      const t1 = q.get('table');
      let t = t1 ? parseInt(t1, 10) : NaN;
      // 2) Raw search supports ?table:1
      if(Number.isNaN(t)){
        const m = location.search.match(/table[:=](\d+)/);
        if(m) t = parseInt(m[1], 10);
      }
      // 3) Fallback: full href regex
      if(Number.isNaN(t)){
        const m2 = location.href.match(/[?&]table[:=](\d+)/);
        if(m2) t = parseInt(m2[1], 10);
      }
      // 4) LocalStorage
      if(Number.isNaN(t)){
        const ls = localStorage.getItem('table_number');
        if(ls){ const n = parseInt(ls, 10); if(!Number.isNaN(n) && n > 0) t = n; }
      }
      return !Number.isNaN(t) && t > 0 ? t : null;
    }catch(_){ return null; }
  }

  function openAbout(){
    if(!el.aboutDialog || !el.aboutOverlay) return;
    el.aboutDialog.hidden = false; el.aboutOverlay.hidden = false;
  }
  function closeAbout(){
    if(!el.aboutDialog || !el.aboutOverlay) return;
    el.aboutDialog.hidden = true; el.aboutOverlay.hidden = true;
  }

  function renderSideCategories(){
    if(!el.sideCats) return;
    el.sideCats.innerHTML = '';
    const mk = (label, onClick) => {
      const a = document.createElement('a'); a.href = '#'; a.textContent = label; a.onclick = (e)=>{ e.preventDefault(); onClick && onClick(); };
      return a;
    };
    const q = state.sideSearchQuery.toLowerCase();
    // All
    if('الكل'.includes(q) || q === ''){
      const a = mk('الكل', () => { setActiveCategory(null); closeSide(); });
      a.dataset.cat = 'ALL';
      el.sideCats.appendChild(a);
    }
    // Offers
    if(state.offerProductIds.size > 0){
      if('العروض'.includes(q) || q === ''){
        const a = mk('العروض', () => { setActiveCategory('OFFERS'); closeSide(); });
        a.dataset.cat = 'OFFERS';
        el.sideCats.appendChild(a);
      }
    }
    // Categories
    state.categories.forEach(c => {
      const name = String(c.name||'');
      if(q === '' || name.toLowerCase().includes(q)){
        const a = mk(name, () => { setActiveCategory(c.id); closeSide(); });
        a.dataset.cat = String(c.id);
        el.sideCats.appendChild(a);
      }
    });
    // Highlight active
    Array.from(el.sideCats.querySelectorAll('a')).forEach(a => a.classList.remove('active'));
    const key = state.activeCategoryId === null ? 'ALL' : String(state.activeCategoryId);
    const activeA = el.sideCats.querySelector(`a[data-cat="${CSS.escape(key)}"]`);
    if(activeA) activeA.classList.add('active');
  }

  function openSide(){
    if(!el.sideDrawer || !el.sideOverlay) return;
    el.sideDrawer.hidden = false; el.sideOverlay.hidden = false;
    requestAnimationFrame(() => el.sideDrawer.classList.add('open'));
  }
  function closeSide(){
    if(!el.sideDrawer || !el.sideOverlay) return;
    el.sideDrawer.classList.remove('open');
    setTimeout(() => { el.sideDrawer.hidden = true; el.sideOverlay.hidden = true; }, 200);
  }

  async function renderAllRows(){
    el.productsGrid.innerHTML = '';
    // Offers line first if any active offers
    if(state.offerProductIds.size){
      renderCategoryLine('العروض', () => setActiveCategory('OFFERS'));
    }
    // Then each category as a single line
    for(const c of state.categories){
      renderCategoryLine(c.name, () => setActiveCategory(c.id));
    }
  }

  function renderCategoryLine(title, onViewAll){
    const section = document.createElement('section');
    section.className = 'cat-section';
    const header = document.createElement('div'); header.className = 'cat-header';
    const h = document.createElement('h3'); h.className = 'cat-title'; h.textContent = title;
    const view = document.createElement('button'); view.className = 'view-all'; view.textContent = 'عرض الجميع';
    view.onclick = onViewAll;
    header.appendChild(h); header.appendChild(view);
    section.appendChild(header);
    el.productsGrid.appendChild(section);
  }
  function cacheGet(key){
    try{
      const raw = localStorage.getItem(cacheKey(key));
      if(!raw) return null;
      const rec = JSON.parse(raw);
      if(!rec || typeof rec.exp !== 'number') return null;
      if(Date.now() > rec.exp){ localStorage.removeItem(cacheKey(key)); return null; }
      return rec.data;
    }catch(_){ return null; }
  }

  let state = {
    categories: [],
    activeCategoryId: null,
    banners: [],
    sliderIndex: 0,
    sliderTimer: null,
    splide: null,
    prodMainSplide: null,
    prodThumbsSplide: null,
    currentProduct: null,
    editingCartIndex: null,
    loading: {
      store: true,
      banners: true,
      categories: true,
      products: true,
    },
    offersMap: new Map(), // productId -> { price, offerId, discount_kind, discount_value }
    offerProductIds: new Set(),
    cart: [],
    pendingConfig: null,
    searchQuery: '',
    searchDebounce: null,
    sideSearchQuery: '',
    tableNumber: null,
    deviceToken: null,
  };

  async function init(){
    // Show skeletons initially
    renderSkeletons();

    // Parse table number from URL/localStorage
    try{
      const t = resolveTableNumber();
      if(typeof t === 'number' && t > 0) state.tableNumber = t;
    }catch(_){ }

    // Parse device token from URL (?device=... or ?token=... or ?device_token=...)
    try{
      const q = new URLSearchParams(location.search);
      const dt = q.get('device') || q.get('token') || q.get('device_token');
      if(dt){ state.deviceToken = dt; try{ localStorage.setItem('device_token', dt); }catch(_){ } }
      if(!state.deviceToken){ try{ state.deviceToken = localStorage.getItem('device_token') || null; }catch(_){ state.deviceToken = null; } }
    }catch(_){ }

    await Promise.all([
      loadStoreInfo(),
      loadBanners(),
      loadOffers(),
      loadCategories()
    ]);
    // Default view: All categories (grouped sections)
    setActiveCategory(null);

    // Lenis smooth scrolling
    if(window.Lenis){
      const lenis = new window.Lenis({
        duration: 0.9,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        smoothTouch: true,
      });
      function raf(time){
        lenis.raf(time);
        requestAnimationFrame(raf);
      }
      requestAnimationFrame(raf);
    }

    // Init Firebase Cloud Messaging (optional, if config provided)
    try{
      if(window.FIREBASE_CONFIG && window.firebase && 'serviceWorker' in navigator && window.Notification){
        window.firebase.initializeApp(window.FIREBASE_CONFIG);
        // Register service worker for FCM
        const swUrl = 'firebase-messaging-sw.js';
        const reg = await navigator.serviceWorker.register(swUrl);
        const messaging = window.firebase.messaging();
        // Request permission and get token, passing SW registration (v9 compat)
        const perm = await Notification.requestPermission();
        if(perm === 'granted'){
          const token = await messaging.getToken({ vapidKey: window.FCM_VAPID_KEY, serviceWorkerRegistration: reg }).catch(()=>null);
          if(token){ state.deviceToken = token; try{ localStorage.setItem('device_token', token); }catch(_){ } }
        }
        // Foreground messages
        messaging.onMessage((payload) => {
          try{ toast(payload?.notification?.title || 'إشعار'); }catch(_){ }
        });
        // Token refresh (compat API)
        if(typeof messaging.onTokenRefresh === 'function'){
          messaging.onTokenRefresh(async () => {
            try{
              const newTok = await messaging.getToken({ vapidKey: window.FCM_VAPID_KEY, serviceWorkerRegistration: reg });
              if(newTok){ state.deviceToken = newTok; try{ localStorage.setItem('device_token', newTok); }catch(_){ } }
            }catch(_){ /* ignore */ }
          });
        }
      }
    }catch(e){ console.warn('FCM init skipped', e); }

    // Cart UI bindings
    el.cartBarButton?.addEventListener('click', openCart);
    el.cartClose?.addEventListener('click', closeCart);
    el.cartOverlay?.addEventListener('click', closeCart);
    el.checkoutBtn?.addEventListener('click', checkout);
    // Components modal bindings
    el.compClose?.addEventListener('click', closeComponents);
    el.compCancel?.addEventListener('click', closeComponents);
    el.compOverlay?.addEventListener('click', closeComponents);
    el.compConfirm?.addEventListener('click', confirmComponents);
    // Product details modal bindings
    el.prodClose?.addEventListener('click', closeProductModal);
    el.prodOverlay?.addEventListener('click', closeProductModal);
    el.prodAdd?.addEventListener('click', () => {
      if(state.currentProduct){
        const src = document.querySelector('#prod-main .splide__slide.is-active img') || document.querySelector('#prod-main img');
        maybeConfigureProduct(state.currentProduct, { sourceEl: src });
      }
    });
    el.prodBuy?.addEventListener('click', () => {
      if(state.currentProduct){
        maybeConfigureProduct(state.currentProduct, { buyNow: true });
      }
    });
    // Theme toggle
    el.themeToggle?.addEventListener('click', toggleTheme);
    // Sidebar bindings
    el.menuButton?.addEventListener('click', openSide);
    el.sideClose?.addEventListener('click', closeSide);
    el.sideOverlay?.addEventListener('click', closeSide);
    // Side search filter
    el.sideSearch?.addEventListener('input', (e)=>{ state.sideSearchQuery = (e.target.value||'').trim(); renderSideCategories(); });
    // About dialog bindings
    el.aboutOpen?.addEventListener('click', openAbout);
    el.aboutClose?.addEventListener('click', closeAbout);
    el.aboutOk?.addEventListener('click', closeAbout);
    el.aboutOverlay?.addEventListener('click', closeAbout);
    // Name prompt bindings
    el.nameClose?.addEventListener('click', closeNamePrompt);
    el.nameCancel?.addEventListener('click', closeNamePrompt);
    el.nameOverlay?.addEventListener('click', closeNamePrompt);
    el.nameConfirm?.addEventListener('click', confirmNamePrompt);
    // Notifications dialog bindings
    el.notifOpen?.addEventListener('click', () => { openNotif(); });
    el.notifClose?.addEventListener('click', closeNotif);
    el.notifOverlay?.addEventListener('click', closeNotif);
    el.notifEnable?.addEventListener('click', enableNotifications);
    el.notifCopy?.addEventListener('click', copyNotifToken);
    // Apply saved theme
    applySavedTheme(true);
    // Search debounce
    if(el.searchInput){
      el.searchInput.addEventListener('input', (e) => {
        const q = (e.target.value || '').trim();
        state.searchQuery = q;
        clearTimeout(state.searchDebounce);
        state.searchDebounce = setTimeout(() => {
          if(q.length >= 2){
            runSearch(q);
          } else {
            setActiveCategory(null);
          }
        }, 250);
      });
    }
    updateCartUI();
  }

  async function runSearch(q){
    try {
      state.loading.products = true;
      renderProducts([]);
      const pattern = `%${q}%`;
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .or(`name.ilike.${pattern},description.ilike.${pattern}`)
        .order('created_at', { ascending: false });
      if(error) throw error;
      renderSingleSection('نتائج البحث', data || []);
    } catch(e){
      console.error('Search error', e);
      renderSingleSection('نتائج البحث', []);
    } finally {
      state.loading.products = false;
    }
  }

  async function loadOffers(force=false){
    try {
      const now = new Date().toISOString();
      // Try cache
      let offers = force ? null : (cacheGet('offers:active') || null);
      if(!offers){
        const { data: d1, error: e1 } = await supabase
          .from('offers')
          .select('*')
          .eq('is_active', true)
          .lte('starts_at', now)
          .gte('ends_at', now);
        if(e1) throw e1;
        offers = d1 || [];
        cacheSet('offers:active', offers, 5 * 60 * 1000); // 5m
      }
      if(!offers || offers.length === 0){
        state.offersMap = new Map();
        state.offerProductIds = new Set();
        return;
      }
      const offerIds = offers.map(o => o.id);
      let links = force ? null : cacheGet('offer_products:links');
      if(!links){
        const { data: d2, error: e2 } = await supabase
          .from('offer_products')
          .select('*')
          .in('offer_id', offerIds);
        if(e2) throw e2;
        links = d2 || [];
        cacheSet('offer_products:links', links, 5 * 60 * 1000); // 5m
      }
      state.offersMap = new Map();
      state.offerProductIds = new Set();
      for(const link of (links||[])){
        const off = offers.find(o => o.id === link.offer_id);
        if(!off) continue;
        state.offersMap.set(link.product_id, {
          offerId: off.id,
          discount_kind: off.discount_kind,
          discount_value: Number(off.discount_value)
        });
        state.offerProductIds.add(link.product_id);
      }
    } catch(e){
      console.error('Offers error', e);
      state.offersMap = new Map();
      state.offerProductIds = new Set();
    }
  }

  async function loadStoreInfo(force=false){
    try {
      const cached = force ? null : cacheGet('stores:first');
      let store = cached;
      if(!cached){
        const { data, error } = await supabase.from('stores').select('*').limit(1).maybeSingle();
        if(error) throw error;
        store = data || {};
        cacheSet('stores:first', store, 60 * 60 * 1000); // 60m
      }
      el.storeName.textContent = store.name || 'المتجر';
      el.footerStoreName.textContent = store.name || 'المتجر';
      if(store.logo_url){
        el.storeLogo.src = store.logo_url;
        el.storeLogo.style.display = 'block';
      } else if (store.image_url){
        el.storeLogo.src = store.image_url;
        el.storeLogo.style.display = 'block';
      } else {
        el.storeLogo.style.display = 'none';
      }
    } catch (e){
      console.error('Store info error', e);
      el.storeName.textContent = 'المتجر';
      el.footerStoreName.textContent = 'المتجر';
      el.storeLogo.style.display = 'none';
    }
    finally {
      state.loading.store = false;
    }
  }

  async function loadBanners(force=false){
    try {
      const cached = force ? null : cacheGet('ads_banners:active');
      let rows = cached;
      if(!cached){
        const { data, error } = await supabase
          .from('ads_banners')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false });
        if(error) throw error;
        rows = data || [];
        cacheSet('ads_banners:active', rows, 10 * 60 * 1000); // 10m
      }
      state.banners = rows;
      renderSlider();
    } catch(e){
      console.error('Banners error', e);
      state.banners = [];
      renderSlider();
    }
    finally {
      state.loading.banners = false;
    }
  }

  function renderSlider(){
    const banners = state.banners;
    // Destroy previous Splide if exists
    if(state.splide){
      try { state.splide.destroy(true); } catch(_) {}
      state.splide = null;
    }
    const list = document.getElementById('ad-slides');
    if(!list) return;
    list.innerHTML = '';

    if(!banners.length){
      const li = document.createElement('li');
      li.className = 'splide__slide';
      li.innerHTML = '<div class="card-media" style="height:240px; display:grid; place-items:center; color:#5d6b86; background:#f3f4f8; border-radius:18px;">لا توجد إعلانات</div>';
      list.appendChild(li);
      return;
    }

    banners.forEach(b => {
      const li = document.createElement('li');
      li.className = 'splide__slide';
      if(b.link){
        li.innerHTML = `<a href="${b.link}" target="_blank" rel="noopener"><img src="${b.image_url}" alt="" /></a>`;
      } else {
        li.innerHTML = `<img src="${b.image_url}" alt="" />`;
      }
      list.appendChild(li);
    });

    // Initialize Splide
    const dir = document.documentElement.getAttribute('dir') === 'rtl' ? 'rtl' : 'ltr';
    state.splide = new Splide('#ad-splide', {
      type: 'loop',
      perPage: 1,
      autoplay: true,
      interval: 4000,
      pauseOnHover: true,
      pauseOnFocus: true,
      arrows: false,
      pagination: true,
      drag: true,
      direction: dir,
      speed: 600,
      gap: '12px',
      rewind: false,
      updateOnMove: true,
      classes: {
        pagination: 'splide__pagination',
      },
      breakpoints: {
        640: { gap: '8px' },
        1024: { gap: '10px' },
      },
    });
    state.splide.mount();
  }

  function setupSliderControls(useClones=false, realCount=0){
    clearInterval(state.sliderTimer);
    state.sliderTimer = setInterval(() => nextSlide(), 5000);
    el.sliderPrev.onclick = prevSlide;
    el.sliderNext.onclick = nextSlide;

    // Pause on hover
    const container = document.querySelector('.ads-slider');
    if(container){
      container.addEventListener('mouseenter', () => clearInterval(state.sliderTimer));
      container.addEventListener('mouseleave', () => {
        clearInterval(state.sliderTimer);
        state.sliderTimer = setInterval(() => nextSlide(), 5000);
      });
    }

    // Drag/swipe horizontal
    let dragging = false; let startX = 0; let deltaX = 0;
    const track = el.sliderTrack;
    const onStart = (x) => { dragging = true; startX = x; deltaX = 0; track.style.transition = 'none'; };
    const onMove = (x) => { if(!dragging) return; deltaX = x - startX; track.style.transform = `translateX(calc(-${state.sliderIndex*100}% + ${deltaX}px))`; };
    const onEnd = () => {
      if(!dragging) return; dragging = false; track.style.transition = '';
      const threshold = 60; // px
      if(deltaX < -threshold) nextSlide();
      else if(deltaX > threshold) prevSlide();
      else setSliderPosition();
    };
    track.addEventListener('mousedown', (e)=>onStart(e.clientX));
    window.addEventListener('mousemove', (e)=>onMove(e.clientX));
    window.addEventListener('mouseup', onEnd);
    track.addEventListener('touchstart', (e)=> e.touches[0] && onStart(e.touches[0].clientX));
    window.addEventListener('touchmove', (e)=> e.touches[0] && onMove(e.touches[0].clientX), { passive: true });
    window.addEventListener('touchend', onEnd);

    // Seamless correction on transition end when using clones
    if(useClones){
      track.addEventListener('transitionend', () => {
        const total = realCount + 2; // including clones
        if(state.sliderIndex === total - 1){ // past last clone
          state.sliderIndex = 1;
          setSliderPosition(false);
        } else if(state.sliderIndex === 0){ // before first clone
          state.sliderIndex = realCount;
          setSliderPosition(false);
        }
      });
    }
  }

  function prevSlide(){
    const n = el.sliderTrack.children.length; // may include clones
    state.sliderIndex = (state.sliderIndex - 1 + n) % n;
    setSliderPosition();
  }
  function nextSlide(){
    const n = el.sliderTrack.children.length;
    state.sliderIndex = (state.sliderIndex + 1) % n;
    setSliderPosition();
  }
  function goToSlide(i){
    // Dots map to real slides: if clones exist, offset by +1
    const hasClones = el.sliderTrack.children.length > state.banners.length;
    state.sliderIndex = hasClones ? i + 1 : i;
    setSliderPosition();
  }
  function setSliderPosition(animate=true){
    const track = el.sliderTrack;
    if(!animate){ track.style.transition = 'none'; }
    track.style.transform = `translateX(-${state.sliderIndex * 100}%)`;
    if(!animate){
      // force reflow to apply transform before re-enabling transition
      void track.offsetHeight; track.style.transition = '';
    }
    // Update dots based on real slide index
    const hasClones = el.sliderTrack.children.length > state.banners.length;
    const realIndex = hasClones ? (state.sliderIndex - 1 + state.banners.length) % state.banners.length : state.sliderIndex;
    Array.from(el.sliderDots.children).forEach((d, i) => d.classList.toggle('active', i === realIndex));
  }

  async function loadCategories(force=false){
    try {
      const cached = force ? null : cacheGet('categories:all');
      let rows = cached;
      if(!cached){
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .order('sort_order', { ascending: true })
          .order('name', { ascending: true });
        if(error) throw error;
        rows = data || [];
        cacheSet('categories:all', rows, 30 * 60 * 1000); // 30m
      }
      state.categories = rows;
      renderCategories();
      renderSideCategories();
    } catch(e){
      console.error('Categories error', e);
      state.categories = [];
      renderCategories();
      renderSideCategories();
    }
    finally {
      state.loading.categories = false;
    }
  }

  function renderCategories(){
    el.categoriesList.innerHTML = '';
    if(!state.categories.length){
      if(state.loading.categories){
        for(let i=0;i<4;i++){
          const sk = document.createElement('span');
          sk.className = 'skeleton skeleton-chip';
          el.categoriesList.appendChild(sk);
        }
      } else {
        const chip = document.createElement('button');
        chip.className = 'category-btn active';
        chip.textContent = 'الكل';
        chip.addEventListener('click', () => setActiveCategory(null));
        el.categoriesList.appendChild(chip);
        setActiveCategory(null);
      }
      return;
    }

    // All first
    const allBtn = document.createElement('button');
    allBtn.className = 'category-btn' + (state.activeCategoryId === null ? ' active' : '');
    allBtn.textContent = 'الكل';
    allBtn.addEventListener('click', () => setActiveCategory(null));
    el.categoriesList.appendChild(allBtn);

    // Offers second (if any active offers)
    if(state.offerProductIds.size > 0){
      const offersBtn = document.createElement('button');
      offersBtn.className = 'category-btn' + (state.activeCategoryId === 'OFFERS' ? ' active' : '');
      offersBtn.textContent = 'العروض';
      offersBtn.addEventListener('click', () => setActiveCategory('OFFERS'));
      el.categoriesList.appendChild(offersBtn);
    }

    state.categories.forEach(c => {
      const btn = document.createElement('button');
      btn.className = 'category-btn';
      btn.textContent = c.name;
      btn.addEventListener('click', () => setActiveCategory(c.id));
      el.categoriesList.appendChild(btn);
    });

    updateActiveCategoryUI();
  }

  function setActiveCategory(id){
    state.activeCategoryId = id;
    updateActiveCategoryUI();
    loadProducts(id);
  }

  function updateActiveCategoryUI(){
    const buttons = Array.from(el.categoriesList.querySelectorAll('.category-btn'));
    buttons.forEach(b => b.classList.remove('active'));
    if(state.activeCategoryId === 'OFFERS'){
      const offersBtn = buttons.find(b => b.textContent === 'العروض');
      if(offersBtn) offersBtn.classList.add('active');
    } else if(state.activeCategoryId === null){
      const all = buttons.find(b => b.textContent === 'الكل');
      if(all) all.classList.add('active');
    } else {
      const match = buttons.find(b => b.textContent === (state.categories.find(c => c.id === state.activeCategoryId)?.name));
      if(match) match.classList.add('active');
    }
  }

  async function loadProducts(categoryId){
    try {
      state.loading.products = true;
      // Initial skeleton while loading
      renderProducts([]);

      // OFFERS category
      if(categoryId === 'OFFERS' && state.offerProductIds.size){
        let products = [];
        // Fetch only products that are in offers
        const ids = Array.from(state.offerProductIds);
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('is_active', true)
          .in('id', ids)
          .order('created_at', { ascending: false });
        if(error) throw error;
        products = data || [];
        renderProducts(products);
      } else if(categoryId === null) {
        // All view: grouped sections per category + offers first
        await renderGroupedCategories();
      } else {
        let products = [];
        let query = supabase
          .from('products')
          .select('*')
          .eq('is_active', true);
        if(categoryId){
          query = query.eq('category_id', categoryId);
        }
        const { data, error } = await query.order('created_at', { ascending: false });
        if(error) throw error;
        products = data || [];
        renderProducts(products);
      }
    } catch(e){
      console.error('Products error', e);
      renderProducts([]);
    }
    finally {
      state.loading.products = false;
    }
  }

  async function renderGroupedCategories(){
    // Clear grid and render sections per category as cards grids
    el.productsGrid.className = '';
    el.productsGrid.innerHTML = '';
    // Offers section first if exists
    if(state.offerProductIds.size){
      const ids = Array.from(state.offerProductIds);
      const { data: prods } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .in('id', ids)
        .order('created_at', { ascending: false })
        .limit(20);
      const items = prods || [];
      if(items.length){
        const section = document.createElement('section');
        section.className = 'cat-section';
        const header = document.createElement('div'); header.className = 'cat-header';
        const h = document.createElement('h3'); h.className = 'cat-title'; h.textContent = 'العروض';
        const view = document.createElement('button'); view.className = 'view-all'; view.textContent = 'عرض الكل';
        view.onclick = () => setActiveCategory('OFFERS');
        header.appendChild(h); header.appendChild(view);
        section.appendChild(header);
        const grid = document.createElement('div'); grid.className = 'products-grid';
        items.forEach(p => grid.appendChild(createProductCard(p)));
        section.appendChild(grid);
        el.productsGrid.appendChild(section);
      }
    }

    for(const c of state.categories){
      const { data: prods } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .eq('category_id', c.id)
        .order('created_at', { ascending: false })
        .limit(20);
      const items = prods || [];
      if(items.length === 0) continue;
      const section = document.createElement('section');
      section.className = 'cat-section';
      const header = document.createElement('div'); header.className = 'cat-header';
      const h = document.createElement('h3'); h.className = 'cat-title'; h.textContent = c.name;
      const view = document.createElement('button'); view.className = 'view-all'; view.textContent = 'عرض الكل';
      view.onclick = () => setActiveCategory(c.id);
      header.appendChild(h); header.appendChild(view);
      section.appendChild(header);
      const grid = document.createElement('div'); grid.className = 'products-grid';
      items.forEach(p => grid.appendChild(createProductCard(p)));
      section.appendChild(grid);
      el.productsGrid.appendChild(section);
    }
  }

  function createProductCard(p){
    const card = document.createElement('article');
    card.className = 'card';
    card.onclick = () => openProductModal(p);
    const media = document.createElement('div');
    media.className = 'card-media';
    // Multiple images support on card
    const imgs = [];
    const gal = Array.isArray(p.gallery_paths) ? p.gallery_paths.filter(Boolean) : [];
    if(p.image_path) imgs.push(p.image_path);
    gal.forEach(u => { if(u && !imgs.includes(u)) imgs.push(u); });
    if(imgs.length <= 1){
      media.innerHTML = imgs[0] ? `<img src="${imgs[0]}" alt="${p.name}">` : '<span>لا صورة</span>';
    } else {
      media.classList.add('scroller');
      const track = document.createElement('div');
      track.className = 'media-track';
      imgs.forEach(src => {
        const it = document.createElement('img');
        it.className = 'media-item';
        it.src = src; it.alt = p.name;
        track.appendChild(it);
      });
      media.appendChild(track);
      // small dots indicator
      const dots = document.createElement('div'); dots.className = 'media-dots';
      imgs.forEach((_, i) => { const d = document.createElement('span'); d.className = 'dot' + (i===0?' active':''); dots.appendChild(d); });
      media.appendChild(dots);
      // sync active dot on scroll
      media.addEventListener('scroll', () => {
        const idx = Math.round(media.scrollLeft / media.clientWidth);
        Array.from(dots.children).forEach((el, k) => el.classList.toggle('active', k===idx));
      });
    }
    media.style.cursor = 'pointer';
    media.onclick = (e) => { e.stopPropagation(); openProductModal(p); };
    const body = document.createElement('div'); body.className = 'card-body';
    const title = document.createElement('h3'); title.className = 'card-title'; title.textContent = p.name;
    const desc = document.createElement('p'); desc.className = 'card-desc'; desc.textContent = p.description || '';
    const meta = document.createElement('div'); meta.className = 'card-meta';
    const price = document.createElement('div'); price.className = 'price';
    const discounted = getDiscountedPrice(p.id, p.price);
    if(discounted !== null && discounted < Number(p.price || 0)){
      price.innerHTML = `<span style="text-decoration:line-through;color:#9aa7c9;margin-inline-start:8px;">${formatPrice(p.price)}</span> ${formatPrice(discounted)}`;
    } else {
      price.textContent = formatPrice(p.price);
    }
    const badge = document.createElement('div');
    const hasOffer = state.offersMap.has(p.id);
    badge.className = 'badge' + (p.is_out_of_stock ? ' out' : (hasOffer ? '' : ''));
    badge.textContent = p.is_out_of_stock ? 'غير متوفر' : (hasOffer ? 'عرض' : 'متاح');
    const actions = document.createElement('div'); actions.className = 'actions';
    const addBtn = document.createElement('button'); addBtn.className = 'btn btn-outline'; addBtn.textContent = 'إضافة للسلة'; addBtn.onclick = (e) => { e.stopPropagation(); maybeConfigureProduct(p, { sourceEl: media }); };
    const buyBtn = document.createElement('button'); buyBtn.className = 'btn btn-primary'; buyBtn.textContent = 'شراء الآن'; buyBtn.onclick = (e) => { e.stopPropagation(); maybeConfigureProduct(p, { buyNow: true }); };
    meta.appendChild(price); meta.appendChild(badge);
    body.appendChild(title); body.appendChild(desc); body.appendChild(meta);
    actions.appendChild(addBtn); actions.appendChild(buyBtn); body.appendChild(actions);
    card.appendChild(media); card.appendChild(body);
    return card;
  }

  async function openProductModal(product){
    state.currentProduct = product;
    if(!el.prodDialog || !el.prodOverlay) return;
    // Fill info
    if(el.prodTitle) el.prodTitle.textContent = product.name || '';
    if(el.prodDesc) el.prodDesc.textContent = product.description || '';
    const discounted = getDiscountedPrice(product.id, product.price);
    if(el.prodPrice){
      if(discounted !== null && discounted < Number(product.price || 0)){
        el.prodPrice.innerHTML = `<span style="text-decoration:line-through;color:#9aa7c9;margin-inline-start:8px;">${formatPrice(product.price)}</span> ${formatPrice(discounted)}`;
      } else {
        el.prodPrice.textContent = formatPrice(product.price);
      }
    }

    // Build images list using schema: products.gallery_paths (text[])
    const images = [];
    const gallery = Array.isArray(product.gallery_paths) ? product.gallery_paths.filter(Boolean) : [];
    if(product.image_path) images.push(product.image_path);
    gallery.forEach(u => { if(u && !images.includes(u)) images.push(u); });
    if(images.length === 0){ images.push(''); }

    // Populate lists
    if(el.prodMainList) el.prodMainList.innerHTML = '';
    if(el.prodThumbsList) el.prodThumbsList.innerHTML = '';
    images.forEach((src) => {
      const li = document.createElement('li'); li.className = 'splide__slide';
      li.innerHTML = src ? `<img src="${src}" alt="${product.name}">` : '<div class="card-media" style="aspect-ratio:1/1;"><span>لا صورة</span></div>';
      el.prodMainList?.appendChild(li);
      const tli = document.createElement('li'); tli.className = 'splide__slide';
      tli.innerHTML = src ? `<img src="${src}" alt="">` : '<div style="width:100%;height:64px;background:#f3f4f8;"></div>';
      el.prodThumbsList?.appendChild(tli);
    });

    // Destroy old splides
    try{ state.prodMainSplide && state.prodMainSplide.destroy(true); }catch(_){ }
    try{ state.prodThumbsSplide && state.prodThumbsSplide.destroy(true); }catch(_){ }

    // Init Splide galleries and sync
    const dir = document.documentElement.getAttribute('dir') === 'rtl' ? 'rtl' : 'ltr';
    state.prodThumbsSplide = new Splide('#prod-thumbs', {
      fixedWidth: 84,
      fixedHeight: 64,
      gap: 8,
      rewind: false,
      pagination: false,
      arrows: false,
      isNavigation: true,
      direction: dir,
      focus: 'center',
      cover: true,
      drag: true,
      breakpoints: { 640: { fixedWidth: 72, fixedHeight: 56, gap: 6 } }
    });
    state.prodMainSplide = new Splide('#prod-main', {
      type: 'slide',
      perPage: 1,
      arrows: true,
      pagination: false,
      direction: dir,
      gap: '10px',
      speed: 500,
    });
    state.prodMainSplide.sync(state.prodThumbsSplide);
    state.prodThumbsSplide.mount();
    state.prodMainSplide.mount();

    // Open modal with hero animation
    el.prodOverlay.hidden = false;
    el.prodDialog.hidden = false;
    requestAnimationFrame(() => {
      el.prodOverlay.classList.add('show');
      el.prodDialog.classList.add('open');
    });
  }

  function closeProductModal(){
    if(!el.prodDialog || !el.prodOverlay) return;
    el.prodDialog.classList.remove('open');
    el.prodOverlay.classList.remove('show');
    setTimeout(() => {
      el.prodDialog.hidden = true;
      el.prodOverlay.hidden = true;
      try{ state.prodMainSplide && state.prodMainSplide.destroy(true); }catch(_){ }
      try{ state.prodThumbsSplide && state.prodThumbsSplide.destroy(true); }catch(_){ }
      state.prodMainSplide = null; state.prodThumbsSplide = null; state.currentProduct = null;
    }, 200);
  }

  function renderSingleSection(titleText, items){
    el.productsGrid.className = '';
    el.productsGrid.innerHTML = '';
    const section = document.createElement('section');
    section.className = 'cat-section';
    const header = document.createElement('div'); header.className = 'cat-header';
    const h = document.createElement('h3'); h.className = 'cat-title'; h.textContent = titleText || '';
    header.appendChild(h);
    section.appendChild(header);
    const grid = document.createElement('div'); grid.className = 'products-grid';
    if(items && items.length){
      items.forEach(p => grid.appendChild(createProductCard(p)));
    } else {
      const empty = document.createElement('div'); empty.className = 'card'; empty.innerHTML = '<div class="card-body">لا توجد منتجات</div>';
      grid.appendChild(empty);
    }
    section.appendChild(grid);
    el.productsGrid.appendChild(section);
  }

  function renderProducts(products){
    el.productsGrid.className = 'products-grid';
    el.productsGrid.innerHTML = '';
    if(!products.length){
      if(state.loading.products){
        for(let i=0;i<6;i++){
          const card = document.createElement('article');
          card.className = 'card skeleton-card';
          const media = document.createElement('div');
          media.className = 'skeleton skeleton-img';
          const body = document.createElement('div');
          body.className = 'card-body';
          const t1 = document.createElement('div'); t1.className = 'skeleton skeleton-text'; t1.style.width = '70%';
          const t2 = document.createElement('div'); t2.className = 'skeleton skeleton-text'; t2.style.width = '90%';
          const t3 = document.createElement('div'); t3.className = 'skeleton skeleton-text'; t3.style.width = '50%';
          body.appendChild(t1); body.appendChild(t2); body.appendChild(t3);
          card.appendChild(media); card.appendChild(body);
          el.productsGrid.appendChild(card);
        }
      } else {
        el.productsGrid.innerHTML = '<div class="card"><div class="card-body">لا توجد منتجات</div></div>';
      }
      return;
    }

    products.forEach(p => {
      const card = createProductCard(p);
      el.productsGrid.appendChild(card);
    });
  }

  function formatPrice(n){
    const num = Number(n || 0);
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 }).format(num);
  }

  document.addEventListener('visibilitychange', async () => {
    if(document.hidden){
      try { state.splide && state.splide.Components.Autoplay.pause(); } catch(_) {}
    } else {
      try { state.splide && state.splide.Components.Autoplay.play(); } catch(_) {}
      // Revalidate on focus to pick up deletions/changes
      await Promise.all([
        loadBanners(true),
        loadOffers(true),
        loadCategories(true),
        loadStoreInfo(true),
      ]);
      // Re-render current view
      setActiveCategory(state.activeCategoryId);
    }
  });

  function renderSkeletons(){
    // Slider (Splide) skeleton
    const list = document.getElementById('ad-slides');
    if(list){
      list.innerHTML = '';
      const li = document.createElement('li');
      li.className = 'splide__slide';
      const s1 = document.createElement('div');
      s1.className = 'skeleton skeleton-img skeleton-card';
      li.appendChild(s1);
      list.appendChild(li);
    }
    // categories
    el.categoriesList.innerHTML = '';
    for(let i=0;i<4;i++){
      const sk = document.createElement('span');
      sk.className = 'skeleton skeleton-chip';
      el.categoriesList.appendChild(sk);
    }
    // products
    el.productsGrid.innerHTML = '';
    for(let i=0;i<6;i++){
      const card = document.createElement('article');
      card.className = 'card skeleton-card';
      const m = document.createElement('div'); m.className = 'skeleton skeleton-img';
      const b = document.createElement('div'); b.className = 'card-body';
      const t1 = document.createElement('div'); t1.className = 'skeleton skeleton-text'; t1.style.width = '70%';
      const t2 = document.createElement('div'); t2.className = 'skeleton skeleton-text'; t2.style.width = '90%';
      const t3 = document.createElement('div'); t3.className = 'skeleton skeleton-text'; t3.style.width = '50%';
      b.appendChild(t1); b.appendChild(t2); b.appendChild(t3);
      card.appendChild(m); card.appendChild(b);
      el.productsGrid.appendChild(card);
    }
  }

  function addToCart(product){
    const cart = getCartState().slice();
    const idx = cart.findIndex(i => i.id === product.id);
    if(idx > -1){
      cart[idx].qty += 1;
    } else {
      const price = getDiscountedPrice(product.id, product.price) ?? product.price;
      cart.push({ id: product.id, name: product.name, price, qty: 1, image: product.image_path, options: null });
    }
    setCartState(cart);
    // Simple feedback
    toast('تمت الإضافة للسلة');
    updateCartUI();
  }

  function buyNow(product){
    // For now, add to cart and simulate checkout redirect
    addToCart(product);
    toast('الانتقال لعملية الشراء...');
    openCart();
  }

  function getDiscountedPrice(productId, basePrice){
    const info = state.offersMap.get(productId);
    if(!info) return null;
    const price = Number(basePrice || 0);
    if(info.discount_kind === 'percent'){
      const v = Math.max(0, Math.min(100, info.discount_value));
      return +(price * (1 - v/100)).toFixed(2);
    } else if(info.discount_kind === 'amount'){
      return Math.max(0, +(price - info.discount_value).toFixed(2));
    }
    return null;
  }

  // Components (variable) configurator
  async function maybeConfigureProduct(product, opts={}){
    try {
      const { data, error } = await supabase
        .from('product_components')
        .select('id, name, is_variable, variable_kind, choices, default_choice')
        .eq('product_id', product.id)
        .eq('is_variable', true);
      if(error) throw error;
      const vars = data || [];
      if(vars.length === 0){
        if(opts.sourceEl) flyToCartFrom(opts.sourceEl, product);
        if(opts.buyNow){
          buyNow(product);
        } else {
          addToCart(product);
          // Close product modal if open (Add-to-Cart only)
          closeProductModal();
        }
        return;
      }
      // open modal
      state.pendingConfig = { product, opts, vars, selected: new Map() };
      openComponents(vars, product.name);
    } catch(e){
      console.error('Components error', e);
      if(opts.buyNow){ buyNow(product); } else { addToCart(product); }
    }
  }

  function openComponents(components, title){
    if(el.compDialog && el.compOverlay){
      el.compList.innerHTML = '';
      components.forEach(c => {
        if(c.variable_kind === 'single'){
          // Draggable slider with snapping to choices
          const list = Array.isArray(c.choices) ? c.choices : [];
          if(list.length === 0) return;
          const def = c.default_choice && list.includes(c.default_choice) ? c.default_choice : list[0];

          const box = document.createElement('div');
          box.className = 'choice-slider';
          const rtl = document.documentElement.getAttribute('dir') === 'rtl';
          if(rtl) box.classList.add('rtl');

          const title = document.createElement('p');
          title.className = 'choice-title';
          title.textContent = c.name;
          box.appendChild(title);

          const track = document.createElement('div');
          track.className = 'choice-track';
          const fill = document.createElement('div');
          fill.className = 'choice-fill';
          const thumb = document.createElement('div');
          thumb.className = 'choice-thumb';
          thumb.setAttribute('role', 'slider');
          thumb.setAttribute('aria-label', c.name);
          thumb.tabIndex = 0;
          track.appendChild(fill);
          track.appendChild(thumb);
          box.appendChild(track);

          const marks = document.createElement('div');
          marks.className = 'choice-marks';
          const markEls = [];
          list.forEach((label, idx) => {
            const m = document.createElement('div');
            m.className = 'choice-mark';
            const dot = document.createElement('div'); dot.className = 'choice-dot';
            const cap = document.createElement('div'); cap.className = 'choice-label'; cap.textContent = label;
            m.appendChild(dot); m.appendChild(cap);
            m.addEventListener('click', () => setIndex(idx));
            marks.appendChild(m);
            markEls.push(m);
          });
          box.appendChild(marks);

          let current = Math.max(0, list.indexOf(def));

          const bubble = document.createElement('div');
          bubble.className = 'choice-bubble';
          box.appendChild(bubble);

          function setIndex(i){
            current = Math.max(0, Math.min(list.length - 1, i));
            const basePct = list.length === 1 ? 0 : (current / (list.length - 1)) * 100;
            const pct = rtl ? (100 - basePct) : basePct;
            fill.style.width = (rtl ? (100 - pct) : pct) + '%';
            thumb.style.left = pct + '%';
            bubble.style.left = pct + '%';
            bubble.textContent = list[current];
            markEls.forEach((el, k) => el.classList.toggle('active', k === current));
            if(state.pendingConfig){
              state.pendingConfig.selected.set(c.name, list[current]);
            }
            thumb.setAttribute('aria-valuemin', '0');
            thumb.setAttribute('aria-valuemax', String(list.length - 1));
            thumb.setAttribute('aria-valuenow', String(current));
          }

          // Drag handling
          let dragging = false;
          function onMove(clientX){
            const rect = track.getBoundingClientRect();
            const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
            let ratio = rect.width ? x / rect.width : 0;
            if(rtl) ratio = 1 - ratio;
            const i = Math.round(ratio * (list.length - 1));
            setIndex(i);
          }
          thumb.addEventListener('mousedown', (e) => { dragging = true; document.body.classList.add('dragging'); e.preventDefault(); });
          window.addEventListener('mousemove', (e) => { if(dragging) onMove(e.clientX); });
          window.addEventListener('mouseup', () => { dragging = false; document.body.classList.remove('dragging'); });
          // Touch
          thumb.addEventListener('touchstart', (e) => { dragging = true; document.body.classList.add('dragging'); });
          window.addEventListener('touchmove', (e) => { if(dragging && e.touches[0]) onMove(e.touches[0].clientX); }, { passive: false });
          window.addEventListener('touchend', () => { dragging = false; document.body.classList.remove('dragging'); });
          // Clicking the track moves as well
          track.addEventListener('click', (e) => onMove(e.clientX));

          // Keyboard support
          thumb.addEventListener('keydown', (e) => {
            if(e.key === 'ArrowLeft'){ setIndex(current - 1); e.preventDefault(); }
            else if(e.key === 'ArrowRight'){ setIndex(current + 1); e.preventDefault(); }
          });

          // Initialize to default
          setIndex(current);
          el.compList.appendChild(box);
        } else if(c.variable_kind === 'toggle'){
          // On/Off checkbox
          const row = document.createElement('label');
          row.className = 'comp-item';
          const cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.onchange = () => {
            if(!state.pendingConfig) return;
            if(cb.checked) state.pendingConfig.selected.set(c.name, 'نعم');
            else state.pendingConfig.selected.delete(c.name);
          };
          const span = document.createElement('span');
          span.textContent = c.name;
          row.appendChild(cb);
          row.appendChild(span);
          el.compList.appendChild(row);
        } else {
          // Fallback: simple checkbox
          const row = document.createElement('label');
          row.className = 'comp-item';
          const cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.onchange = () => {
            if(!state.pendingConfig) return;
            if(cb.checked) state.pendingConfig.selected.set(c.name, 'نعم');
            else state.pendingConfig.selected.delete(c.name);
          };
          const span = document.createElement('span'); span.textContent = c.name;
          row.appendChild(cb); row.appendChild(span);
          el.compList.appendChild(row);
        }
      });
      el.compDialog.hidden = false;
      el.compOverlay.hidden = false;
    }
  }

  function closeComponents(){
    if(el.compDialog && el.compOverlay){
      el.compDialog.hidden = true;
      el.compOverlay.hidden = true;
      state.pendingConfig = null;
    }
  }

  function confirmComponents(){
    if(!state.pendingConfig) return;
    const { product, opts, selected } = state.pendingConfig;
    const selectedArr = [];
    // selected is Map(name -> value) where value can be 'نعم' (toggle) or specific choice
    selected.forEach((val, key) => {
      if(val === 'نعم'){ selectedArr.push(key + ': نعم'); }
      else if(val){ selectedArr.push(key + ': ' + val); }
    });
    const cart = getCartState().slice();
    const price = getDiscountedPrice(product.id, product.price) ?? product.price;
    if(state.editingCartIndex !== null && state.editingCartIndex >= 0){
      // Update existing cart item options, keep qty and price
      const i = state.editingCartIndex;
      if(cart[i]){ cart[i] = { ...cart[i], options: selectedArr }; }
      state.editingCartIndex = null;
    } else {
      // Add as new item
      const key = product.id + '|' + selectedArr.sort().join(',');
      const idx = cart.findIndex(i => (i.id + '|' + (i.options?.sort().join(',')||'')) === key);
      if(idx > -1){
        cart[idx].qty += 1;
      } else {
        cart.push({ id: product.id, name: product.name, price, qty: 1, image: product.image_path, options: selectedArr });
      }
    }
    // Fly animation if sourceEl available
    if(opts && opts.sourceEl){ try{ flyToCartFrom(opts.sourceEl, product); }catch(_){ } }
    setCartState(cart);
    updateCartUI();
    closeComponents();
    // Close product modal if open (Add-to-Cart only)
    if(!opts.buyNow){ closeProductModal(); }
    if(opts.buyNow){ openCart(); }
    toast('تمت إضافة المنتج');
  }

  function flyToCartFrom(sourceEl, product){
    try{
      const srcRect = sourceEl?.getBoundingClientRect?.();
      const cartBtn = document.getElementById('cart-bar-button');
      if(!srcRect || !cartBtn) return;
      const dstRect = cartBtn.getBoundingClientRect();
      const imgUrl = (sourceEl && sourceEl.tagName === 'IMG' && sourceEl.src) ? sourceEl.src : (product?.image_path || '');
      const ghost = document.createElement('img');
      ghost.className = 'fly-img';
      if(imgUrl) ghost.src = imgUrl; else ghost.style.background = 'var(--surface-2)';
      const w = Math.min(120, srcRect.width || 80);
      const h = w; // square
      ghost.style.width = w + 'px';
      ghost.style.height = h + 'px';
      ghost.style.left = (srcRect.left + (srcRect.width - w)/2) + 'px';
      ghost.style.top = (srcRect.top + (srcRect.height - h)/2) + 'px';
      ghost.style.opacity = '1';
      document.body.appendChild(ghost);
      const dx = (dstRect.left + dstRect.width/2) - (srcRect.left + srcRect.width/2);
      const dy = (dstRect.top + dstRect.height/2) - (srcRect.top + srcRect.height/2);
      requestAnimationFrame(() => {
        ghost.style.transform = `translate(${dx}px, ${dy}px) scale(0.2)`;
        ghost.style.opacity = '0.2';
      });
      setTimeout(() => { ghost.remove(); }, 650);
    }catch(_){ }
  }

  function toggleTheme(){
    const root = document.documentElement;
    const isDark = root.classList.toggle('theme-dark');
    try{ localStorage.setItem('theme', isDark ? 'dark' : 'light'); }catch(_){ }
    if(el.themeToggle){
      el.themeToggle.innerHTML = isDark
        ? '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M6.76 4.84l-1.8-1.79L3.5 4.5l1.79 1.8 1.47-1.46zM1 13h3v-2H1v2zm10 10h2v-3h-2v3zM4.22 19.78l1.79-1.79-1.41-1.41-1.8 1.79 1.42 1.41zM13 1h-2v3h2V1zm7.5 3.5l-1.41-1.41-1.79 1.8 1.41 1.41 1.79-1.8zM20 11v2h3v-2h-3zm-9 3a5 5 0 110-10 5 5 0 010 10zm4.24 5.76l1.79 1.79 1.41-1.41-1.79-1.79-1.41 1.41z"/></svg>'
        : '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"></path></svg>';
    }
    // Smooth transition
    root.classList.add('theme-transition');
    setTimeout(()=> root.classList.remove('theme-transition'), 260);
  }

  function applySavedTheme(initial=false){
    try{
      const t = localStorage.getItem('theme');
      if(t === 'dark'){
        document.documentElement.classList.add('theme-dark');
        if(el.themeToggle) el.themeToggle.innerHTML = '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M6.76 4.84l-1.8-1.79L3.5 4.5l1.79 1.8 1.41 1.41 1.79-1.8zM20 11v2h3v-2h-3zm-9 3a5 5 0 110-10 5 5 0 010 10z"/></svg>';
      } else {
        document.documentElement.classList.remove('theme-dark');
        if(el.themeToggle) el.themeToggle.innerHTML = '<svg class="icon" viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"></path></svg>';
      }
      if(!initial){
        const root = document.documentElement;
        root.classList.add('theme-transition');
        setTimeout(()=> root.classList.remove('theme-transition'), 260);
      }
    }catch(_){ }
  }

  function toast(message){
    const t = document.createElement('div');
    t.textContent = message;
    t.style.position = 'fixed';
    t.style.insetInlineEnd = '16px';
    t.style.insetBlockEnd = '16px';
    t.style.background = '#111827';
    t.style.color = '#fff';
    t.style.padding = '10px 14px';
    t.style.borderRadius = '10px';
    t.style.boxShadow = '0 6px 20px rgba(0,0,0,.15)';
    t.style.zIndex = '1000';
    document.body.appendChild(t);
    setTimeout(() => { t.remove(); }, 1600);
  }

  init();

  // -------------------------
  // Cart UI helpers
  // -------------------------
  function openCart(){
  const d = document.getElementById('cart-drawer');
  const o = document.getElementById('cart-overlay');
  if(!d || !o) return;
  d.hidden = false; o.hidden = false;
  requestAnimationFrame(() => d.classList.add('open'));
  }

  function closeCart(){
  const d = document.getElementById('cart-drawer');
  const o = document.getElementById('cart-overlay');
  if(!d || !o) return;
  d.classList.remove('open');
  setTimeout(() => { d.hidden = true; o.hidden = true; }, 200);
  }

  function checkout(){
    // Close the cart drawer first to avoid layering/animation conflicts, then open the name prompt
    try { closeCart(); } catch(_) {}
    setTimeout(() => openNamePrompt(), 220);
  }

  function updateCartUI(){
  const bar = document.getElementById('cart-bar');
  const barCount = document.getElementById('cart-bar-count');
  const barTotal = document.getElementById('cart-bar-total');
  const itemsWrap = document.getElementById('cart-items');
  const totalEl = document.getElementById('cart-total');
  const currentCart = getCartState();

  const { count, total } = calcCartTotals(currentCart);
  if(count > 0){
    bar?.removeAttribute('hidden');
    if(barCount) barCount.textContent = String(count);
    if(barTotal) barTotal.textContent = formatPrice(total);
  } else {
    bar?.setAttribute('hidden', '');
  }

  // Drawer items
  if(itemsWrap){
    itemsWrap.innerHTML = '';
    currentCart.forEach((item, idx) => {
      const row = document.createElement('div');
      row.className = 'cart-row';
      const img = document.createElement('img');
      img.className = 'cart-thumb';
      if(item.image){ img.src = item.image; img.alt = item.name; } else { img.alt = 'no image'; }
      const info = document.createElement('div');
      info.className = 'cart-info';
      const title = document.createElement('p'); title.className = 'cart-title'; title.textContent = item.name;
      const price = document.createElement('p'); price.className = 'cart-price'; price.textContent = formatPrice(item.price);
      info.appendChild(title); info.appendChild(price);
      if(Array.isArray(item.options) && item.options.length){
        const opts = document.createElement('p');
        opts.className = 'cart-price';
        opts.textContent = 'المكونات: ' + item.options.join(', ');
        info.appendChild(opts);
      }

      const qty = document.createElement('div');
      qty.className = 'cart-qty';
      const minus = document.createElement('button'); minus.className = 'qty-btn'; minus.textContent = '−';
      minus.onclick = () => changeQtyAt(idx, -1);
      const val = document.createElement('span'); val.className = 'qty-value'; val.textContent = String(item.qty);
      const plus = document.createElement('button'); plus.className = 'qty-btn'; plus.textContent = '+';
      plus.onclick = () => changeQtyAt(idx, +1);
      qty.appendChild(minus); qty.appendChild(val); qty.appendChild(plus);

      const tools = document.createElement('div');
      tools.className = 'cart-tools';
      const editBtn = document.createElement('button'); editBtn.className = 'cart-action'; editBtn.textContent = 'تعديل';
      editBtn.onclick = () => editCartItem(idx);
      const delBtn = document.createElement('button'); delBtn.className = 'cart-action danger'; delBtn.textContent = 'حذف';
      delBtn.onclick = () => removeCartItem(idx);
      tools.appendChild(editBtn); tools.appendChild(delBtn);

      row.appendChild(img); row.appendChild(info); row.appendChild(qty); row.appendChild(tools);
      itemsWrap.appendChild(row);
    });
  }

  if(totalEl){ totalEl.textContent = formatPrice(total); }
  }

  function openNamePrompt(){
  if(!el.nameDialog || !el.nameOverlay) return;
  el.nameDialog.hidden = false; el.nameOverlay.hidden = false;
  try{
    const saved = localStorage.getItem('customer_name') || '';
    if(el.nameInput){ el.nameInput.value = saved; setTimeout(()=> el.nameInput.focus(), 0); }
  }catch(_){ if(el.nameInput){ setTimeout(()=> el.nameInput.focus(), 0); } }
  }

  function closeNamePrompt(){
  if(!el.nameDialog || !el.nameOverlay) return;
  el.nameDialog.hidden = true; el.nameOverlay.hidden = true;
  }

  function confirmNamePrompt(){
  const input = el.nameInput;
  if(!input){ closeNamePrompt(); return; }
  const name = (input.value || '').trim();
  if(!name){ input.focus(); toast('يرجى إدخال الاسم'); return; }
  try{ localStorage.setItem('customer_name', name); }catch(_){ }
  closeNamePrompt();
  // Proceed to create order in Supabase
  createOrder(name).catch((e)=>{ console.error(e); toast('تعذر إنشاء الطلب'); });
  }

  async function createOrder(customerName){
    const cart = getCartState();
    if(!Array.isArray(cart) || cart.length === 0){ toast('السلة فارغة'); return; }
    let tableNum = state.tableNumber ?? resolveTableNumber();
    if(!(typeof tableNum === 'number' && tableNum > 0)){
      const ans = window.prompt('رقم الطاولة؟');
      const n = ans ? parseInt(ans, 10) : NaN;
      if(!Number.isNaN(n) && n > 0){ tableNum = n; state.tableNumber = n; try{ localStorage.setItem('table_number', String(n)); }catch(_){ } }
    }
    if(!(typeof tableNum === 'number' && tableNum > 0)){ toast('رقم الطاولة غير محدد'); return; }
    // Insert order
    const { data: order, error } = await supabase
      .from('orders')
      .insert({ table_number: tableNum, customer_name: customerName, device_token: state.deviceToken, status: 'preparing' })
      .select('*')
      .single();
    if(error || !order){ throw error || new Error('Order insert failed'); }
    const items = cart.map(i => ({
      order_id: order.id,
      product_id: i.id,
      product_name: i.name,
      quantity: i.qty,
      unit_price: i.price,
      options: Array.isArray(i.options) ? i.options : null,
    }));
    const { error: e2 } = await supabase.from('order_items').insert(items);
    if(e2){ throw e2; }
    // Clear cart and update UI
    setCartState([]);
    updateCartUI();
    toast('تم إنشاء الطلب بنجاح');
  }

  function getCartState(){
  // store the cart on a known element to access from helper functions
  const grid = document.getElementById('products-grid');
  if(!grid) return [];
  if(!grid._menu_cart){
    try{
      const raw = localStorage.getItem('cart_v1');
      const parsed = raw ? JSON.parse(raw) : [];
      if(Array.isArray(parsed)) grid._menu_cart = parsed; else grid._menu_cart = [];
    }catch(_){ grid._menu_cart = []; }
  }
  return grid._menu_cart;
  }

  function setCartState(next){
  const grid = document.getElementById('products-grid');
  if(!grid) return;
  grid._menu_cart = next;
  try{ localStorage.setItem('cart_v1', JSON.stringify(next)); }catch(_){ }
  }

  function calcCartTotals(cart){
  let count = 0; let total = 0;
  for(const i of cart){ count += i.qty; total += (Number(i.price)||0) * i.qty; }
  return { count, total };
  }

  function changeQty(id, delta){
  const cart = getCartState().slice();
  const idx = cart.findIndex(i => i.id === id);
  if(idx === -1) return;
  cart[idx].qty += delta;
  if(cart[idx].qty <= 0){ cart.splice(idx, 1); }
  setCartState(cart);
  updateCartUI();
  }

  function changeQtyAt(index, delta){
  const cart = getCartState().slice();
  if(index < 0 || index >= cart.length) return;
  cart[index].qty += delta;
  if(cart[index].qty <= 0){ cart.splice(index, 1); }
  setCartState(cart);
  updateCartUI();
  }

  function removeCartItem(index){
  const cart = getCartState().slice();
  if(index < 0 || index >= cart.length) return;
  cart.splice(index, 1);
  setCartState(cart);
  updateCartUI();
  }

  async function editCartItem(index){
  const cart = getCartState();
  const item = cart[index];
  if(!item) return;
  // Fetch variable components for this product, if any
  try{
    const { data, error } = await supabase
      .from('product_components')
      .select('id, name, is_variable, variable_kind, choices, default_choice')
      .eq('product_id', item.id)
      .eq('is_variable', true);
    if(error) throw error;
    const vars = data || [];
    if(vars.length === 0){ toast('لا توجد مكونات قابلة للتعديل'); return; }
    state.pendingConfig = { product: { id: item.id, name: item.name, price: item.price, image_path: item.image }, opts: {}, vars, selected: new Map() };
    // Prefill selections from item.options (array of "name: value")
    if(Array.isArray(item.options)){
      item.options.forEach(s => {
        const parts = String(s).split(':');
        if(parts.length >= 2){
          const key = parts[0].trim();
          const val = parts.slice(1).join(':').trim();
          state.pendingConfig.selected.set(key, val);
        }
      });
    }
    openComponents(vars, item.name);
    state.editingCartIndex = index;
  }catch(e){ console.error(e); toast('تعذر فتح التعديل'); }
  }

})();
