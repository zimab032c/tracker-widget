(() => {
  'use strict';

  const PRESET_COLORS = ['#719e88', '#b88eab', '#829acb', '#d19c70', '#9a9c9b'];
  const $ = (id) => document.getElementById(id);
  const conf = window.WIDGET_CONFIG || {};
  const isConfigured = /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(conf.supabaseUrl || '')
    && !!conf.supabasePublishableKey && !conf.supabasePublishableKey.includes('PASTE_');
  const db = isConfigured && window.supabase
    ? window.supabase.createClient(conf.supabaseUrl, conf.supabasePublishableKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      })
    : null;

  let user = null;
  let demo = !isConfigured;
  let pendingEmail = '';
  let dates = new Set();
  let lockedDates = new Set();
  let active = new Date();
  let displayedYear = active.getFullYear();
  let displayedMonth = active.getMonth();
  let accent = '#719e88';
  let theme = 'auto';
  let monthRequest = 0;
  let prefRequest = 0;

  function localDate(day) {
    const y = day.getFullYear();
    const m = String(day.getMonth() + 1).padStart(2, '0');
    const d = String(day.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  function monthDate(day) { return `${displayedYear}-${String(displayedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`; }
  function daysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }
  function sameMonth(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth(); }
  function contrast(hex) {
    const rgb = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
    const lum = rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
    return lum > .29 ? '#17231e' : '#ffffff';
  }
  function notify(message, error = false) {
    const el = demo || user ? $('tracker-message') : $('login-message');
    el.textContent = message;
    el.classList.toggle('error', !!error);
  }
  function displayCalendar() {
    $('login').hidden = true;
    $('tracker').hidden = false;
    $('sync-label').textContent = demo ? 'Preview · not synced' : 'Exercise habit';
    $('account-row').hidden = demo;
    $('account-email').textContent = user?.email || '';
    drawSwatches();
    drawTheme();
    applyAccent();
    renderMonth();
    if (demo) notify('Preview mode · connect Supabase to save and sync your exercise days.');
    else notify('');
  }
  function displayLogin() {
    demo = false;
    user = null;
    dates = new Set();
    $('tracker').hidden = true;
    $('login').hidden = false;
    $('email-form').hidden = false;
    $('code-form').hidden = true;
    $('login-message').textContent = '';
  }
  function applyAccent() {
    $('widget').style.setProperty('--accent', accent);
    $('widget').style.setProperty('--accent-text', contrast(accent));
    $('custom-color').value = accent;
    $('widget').classList.remove('theme-auto', 'theme-light', 'theme-dark');
    $('widget').classList.add(`theme-${theme}`);
  }
  function drawSwatches() {
    const parent = $('swatches');
    parent.replaceChildren();
    for (const hex of PRESET_COLORS) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `swatch${accent.toLowerCase() === hex ? ' selected' : ''}`;
      button.style.backgroundColor = hex;
      button.title = `Select ${hex}`;
      button.setAttribute('aria-label', `Use accent ${hex}`);
      button.setAttribute('aria-pressed', accent.toLowerCase() === hex ? 'true' : 'false');
      button.addEventListener('click', () => setAccent(hex));
      parent.append(button);
    }
  }
  function drawTheme() {
    document.querySelectorAll('[data-theme]').forEach(el => {
      el.classList.toggle('selected', el.dataset.theme === theme);
      el.setAttribute('aria-pressed', String(el.dataset.theme === theme));
    });
  }
  function renderMonth() {
    const today = new Date();
    const maxDate = localDate(today);
    const totalDays = daysInMonth(displayedYear, displayedMonth);
    const emptyLeading = (new Date(displayedYear, displayedMonth, 1).getDay() + 6) % 7;
    const calendar = $('calendar');
    calendar.replaceChildren();
    $('month-label').textContent = new Date(displayedYear, displayedMonth, 1)
      .toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    for (let i = 0; i < emptyLeading; i++) {
      const empty = document.createElement('div');
      empty.className = 'day-container';
      empty.setAttribute('aria-hidden', 'true');
      calendar.append(empty);
    }
    for (let d = 1; d <= totalDays; d++) {
      const date = monthDate(d);
      const isFuture = date > maxDate;
      const done = dates.has(date);
      const container = document.createElement('div');
      container.className = 'day-container';
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = String(d);
      button.className = `day${done ? ' complete' : ''}${date === maxDate ? ' today' : ''}${isFuture ? ' future' : ''}${lockedDates.has(date) ? ' saving' : ''}`;
      button.disabled = isFuture || lockedDates.has(date);
      button.setAttribute('aria-pressed', String(done));
      button.setAttribute('aria-label', `${new Date(displayedYear, displayedMonth, d).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}: ${done ? 'exercised' : isFuture ? 'upcoming day' : 'not marked'}`);
      if (!isFuture) button.addEventListener('click', () => toggleDate(date));
      container.append(button);
      calendar.append(container);
    }
    const currentMonth = sameMonth(new Date(displayedYear, displayedMonth, 1), today);
    $('next-month').disabled = displayedYear > today.getFullYear() || (displayedYear === today.getFullYear() && displayedMonth >= today.getMonth());
    $('current-month').hidden = currentMonth;
    const elapsed = currentMonth ? today.getDate() : (new Date(displayedYear, displayedMonth, 1) < new Date(today.getFullYear(), today.getMonth(), 1) ? totalDays : 0);
    const completed = [...dates].filter(date => date.startsWith(`${displayedYear}-${String(displayedMonth + 1).padStart(2, '0')}-`) && date <= maxDate).length;
    $('completed-count').textContent = completed;
    $('possible-count').textContent = elapsed;
    const percentage = elapsed ? Math.round(completed / elapsed * 100) : 0;
    $('progress-fill').style.width = `${percentage}%`;
    $('progress').setAttribute('aria-valuenow', percentage);
    $('progress').setAttribute('aria-label', `${completed} of ${elapsed} elapsed days marked`);
    $('month-subtitle').textContent = 'Tap a circle to mark an exercise day';
  }
  async function loadMonth() {
    if (!db || !user) return;
    const request = ++monthRequest;
    const start = monthDate(1);
    const end = monthDate(daysInMonth(displayedYear, displayedMonth));
    const { data, error } = await db.from('exercise_days').select('day').eq('user_id', user.id)
      .gte('day', start).lte('day', end);
    if (request !== monthRequest || !user) return;
    if (error) { notify(`Couldn't load your history: ${error.message}`, true); return; }
    // Keep entries from other months, replace only this month.
    for (const saved of dates) if (saved >= start && saved <= end && !lockedDates.has(saved)) dates.delete(saved);
    for (const entry of data || []) if (!lockedDates.has(entry.day)) dates.add(entry.day);
    renderMonth();
  }
  async function loadPrefs() {
    if (!db || !user) return;
    const { data, error } = await db.from('exercise_preferences').select('accent,theme')
      .eq('user_id', user.id).maybeSingle();
    if (error) { notify(`Couldn't load appearance settings: ${error.message}`, true); return; }
    if (data) {
      if (/^#[0-9a-fA-F]{6}$/.test(data.accent || '')) accent = data.accent;
      if (['light','dark','auto'].includes(data.theme)) theme = data.theme;
      applyAccent(); drawSwatches(); drawTheme(); renderMonth();
    }
  }
  async function toggleDate(date) {
    if (lockedDates.has(date) || date > localDate(new Date())) return;
    const previouslyDone = dates.has(date);
    if (previouslyDone) dates.delete(date); else dates.add(date);
    lockedDates.add(date);
    renderMonth();
    if (demo) { lockedDates.delete(date); renderMonth(); return; }
    try {
      const request = previouslyDone
        ? db.from('exercise_days').delete().eq('user_id', user.id).eq('day', date)
        : db.from('exercise_days').upsert({ user_id: user.id, day: date, completed: true, updated_at: new Date().toISOString() }, { onConflict: 'user_id,day' });
      const { error } = await request;
      if (error) throw error;
      notify('Saved to cloud ✓');
    } catch (err) {
      if (previouslyDone) dates.add(date); else dates.delete(date);
      notify(`Could not sync your change: ${err.message || err}`, true);
    } finally {
      lockedDates.delete(date);
      renderMonth();
    }
  }
  async function savePrefs() {
    if (demo || !user) return;
    const request = ++prefRequest;
    const { error } = await db.from('exercise_preferences')
      .upsert({ user_id: user.id, accent, theme }, { onConflict: 'user_id' });
    if (error && request === prefRequest) notify(`Appearance wasn't saved: ${error.message}`, true);
  }
  function setAccent(next) {
    if (!/^#[0-9a-fA-F]{6}$/.test(next)) return;
    accent = next.toLowerCase();
    applyAccent(); drawSwatches();
    savePrefs();
  }
  function changeMonth(offset) {
    const date = new Date(displayedYear, displayedMonth + offset, 1);
    displayedYear = date.getFullYear();
    displayedMonth = date.getMonth();
    notify('');
    renderMonth();
    loadMonth();
  }
  async function showLoggedIn(sessionUser) {
    demo = false;
    user = sessionUser;
    dates = new Set();
    displayCalendar();
    await Promise.all([loadMonth(), loadPrefs()]);
  }
  async function init() {
    $('settings-toggle').addEventListener('click', () => { $('settings').hidden = !$('settings').hidden; });
    $('prev-month').addEventListener('click', () => changeMonth(-1));
    $('next-month').addEventListener('click', () => changeMonth(1));
    $('current-month').addEventListener('click', () => { const d = new Date(); displayedYear = d.getFullYear(); displayedMonth = d.getMonth(); renderMonth(); loadMonth(); });
    $('custom-color').addEventListener('input', event => setAccent(event.target.value));
    document.querySelectorAll('[data-theme]').forEach(button => button.addEventListener('click', () => {
      theme = button.dataset.theme;
      applyAccent(); drawTheme(); savePrefs();
    }));
    $('logout').addEventListener('click', async () => {
      if (!db) return;
      const { error } = await db.auth.signOut();
      if (error) { notify(error.message, true); return; }
      monthRequest++;
      displayLogin();
    });
    $('change-email').addEventListener('click', () => {
      pendingEmail = ''; $('email-form').hidden = false; $('code-form').hidden = true; notify('');
    });
    $('email-form').addEventListener('submit', async event => {
      event.preventDefault();
      if (!db) return;
      pendingEmail = $('email').value.trim().toLowerCase();
      const button = $('send-code'); button.disabled = true; button.textContent = 'Sending…';
      // Default Supabase free-tier templates send a magic link, not a numeric code.
      // Redirect back to the hosted widget once the email link is clicked.
      const redirectUrl = window.location.origin + window.location.pathname;
      const { error } = await db.auth.signInWithOtp({
        email: pendingEmail,
        options: { shouldCreateUser: true, emailRedirectTo: redirectUrl }
      });
      button.disabled = false; button.textContent = 'Send sign-in link';
      if (error) { notify(error.message, true); return; }
      notify(`Check ${pendingEmail} for your sign-in link. Open it in this browser to finish signing in.`);
    });
    document.addEventListener('visibilitychange', async () => {
      if (document.visibilityState !== 'visible' || demo || !db) return;
      const { data: { session } } = await db.auth.getSession();
      if (session?.user) {
        if (session.user.id !== user?.id) await showLoggedIn(session.user);
        else if (!lockedDates.size) { renderMonth(); await loadMonth(); }
      } else displayLogin();
    });
    if (!isConfigured) { displayCalendar(); return; }
    if (!db) {
      $('login').hidden = false;
      $('login-message').textContent = 'Supabase library failed to load. Check your internet connection, then reload.';
      return;
    }
    const { data: { session }, error } = await db.auth.getSession();
    if (error) { displayLogin(); notify(`Session unavailable: ${error.message}`, true); return; }
    if (session?.user) await showLoggedIn(session.user);
    else displayLogin();
  }
  init().catch(err => { console.error(err); $('login').hidden = false; $('login-message').textContent = `Unexpected error: ${err.message}`; });
})();
