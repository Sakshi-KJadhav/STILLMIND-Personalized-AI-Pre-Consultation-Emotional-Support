/* StillMind — Frontend Client Connected to Python Backend */
(() => {
  'use strict';

  // =========================================================================
  // Constants & Session Keys
  // =========================================================================
  const STORAGE_KEYS = {
    TOKEN: 'stillmind_session_token_v2',
    GUEST_ID: 'stillmind_guest_id_v2',
    MODEL: 'stillmind_gemini_model',
  };

  const DEFAULT_MODEL = 'gemini-4-hydrogen';

  const CRISIS_PATTERNS = [
    // English
    /\bsuicid(e|al)\b/i,
    /\bkill\s+myself\b/i,
    /\bend\s+(my\s+life|it\s+all)\b/i,
    /\bwant\s+to\s+die\b/i,
    /\bwanna\s+die\b/i,
    /\bdon'?t\s+want\s+to\s+live\b/i,
    /\bno\s+reason\s+to\s+live\b/i,
    /\bbetter\s+off\s+dead\b/i,
    /\bself[-\s]?harm\b/i,
    /\bhurt\s+myself\b/i,
    /\bcut\s+myself\b/i,
    /\bhang\s+myself\b/i,
    /\boverdose\b/i,
    /\btake\s+my\s+own\s+life\b/i,
    // Hindi (Devanagari & Romanized)
    /आत्महत्या/,
    /खुद\s*को\s*मार/,
    /मरना\s*चाहता/,
    /मरना\s*चाहती/,
    /जीना\s*नहीं\s*चाहता/,
    /जीना\s*नहीं\s*चाहती/,
    /जान\s*दे\s*दूंगा/,
    /जान\s*दे\s*दूंगी/,
    /खुद\s*को\s*नुकसान/,
    /\baatmahatya\b/i,
    /\bkhud\s+ko\s+mar/i,
    /\bmarna\s+chaht[ai]\b/i,
    /\bjeena\s+nahi\b/i,
    /\bjaan\s+de\s+dung[ai]\b/i,
    /\bmar\s+jaun\b/i,
    // Marathi (Devanagari & Romanized)
    /स्वतःला\s*मार/,
    /जगायचं\s*नाही/,
    /मरायचं\s*आहे/,
    /जीव\s*द्यावा/,
    /स्वतःला\s*इजा/,
    /\bswatala\s+mar/i,
    /\bjagaych[ae]\s+nahi\b/i,
    /\bmaraych[ae]\s+aahe\b/i,
    /\bjeev\s+dyava\b/i,
  ];

  // =========================================================================
  // Application State
  // =========================================================================
  const state = {
    token: '',
    user: null, // { id, email, isGuest, preferredModel }
    model: DEFAULT_MODEL,
    chats: [],
    activeChatId: null,
    stressLogs: [],
    stressAverage: null,
    consultants: [],
    activeTab: 'chat',
    isSending: false,
    currentIntakeDraft: {
      mood: 'Anxious',
      concern: 'Academics',
      language: 'English',
      style: 'Empathetic Listener',
    },
    noteData: null,
    breathing: {
      running: false,
      phaseIndex: 0,
      secondsLeft: 4,
      cycles: 0,
      intervalId: null,
    },
    bubbles: {
      score: 0,
      soundOn: false,
      audioCtx: null,
      items: [],
      ripples: [],
      rafId: null,
      initialized: false,
    },
    video: {
      consultant: null,
      appointmentId: null,
      micOn: true,
      camOn: false,
      connected: false,
      seconds: 0,
      timerId: null,
    },
  };

  // =========================================================================
  // DOM Element References
  // =========================================================================
  const els = {
    appShell: document.getElementById('app-shell'),
    sidebar: document.getElementById('sidebar'),
    sidebarBackdrop: document.getElementById('sidebar-backdrop'),
    openSidebarBtn: document.getElementById('open-sidebar-btn'),
    collapseSidebarBtn: document.getElementById('collapse-sidebar-btn'),
    toastContainer: document.getElementById('toast-container'),

    // Auth Modal
    authModal: document.getElementById('auth-modal'),
    closeAuthModalBtn: document.getElementById('close-auth-modal-btn'),
    geminiModelSelect: document.getElementById('gemini-model-select'),
    loginForm: document.getElementById('login-form'),
    authEmail: document.getElementById('auth-email'),
    authPassword: document.getElementById('auth-password'),
    authError: document.getElementById('auth-error'),
    guestLoginBtn: document.getElementById('guest-login-btn'),

    // Sidebar Controls
    newChatBtn: document.getElementById('new-chat-btn'),
    chatHistoryList: document.getElementById('chat-history-list'),
    chatCountLabel: document.getElementById('chat-count-label'),
    userIdentityLabel: document.getElementById('user-identity-label'),
    modelStatusLabel: document.getElementById('model-status-label'),
    openSettingsBtn: document.getElementById('open-settings-btn'),
    signOutBtn: document.getElementById('sign-out-btn'),

    // Stress Tracker
    stressSlider: document.getElementById('stress-slider'),
    stressValueDisplay: document.getElementById('stress-value-display'),
    stressEmoji: document.getElementById('stress-emoji'),
    stressStateLabel: document.getElementById('stress-state-label'),
    logStressBtn: document.getElementById('log-stress-btn'),
    stressBarHistory: document.getElementById('stress-bar-history'),
    stressAvgLabel: document.getElementById('stress-avg-label'),

    // Top Navigation & Tabs
    tabButtons: Array.from(document.querySelectorAll('.tab-btn')),
    tabPanels: Array.from(document.querySelectorAll('.tab-panel')),
    topHelplineBtn: document.getElementById('top-helpline-btn'),

    // Chat & Intake
    intakeView: document.getElementById('intake-view'),
    intakeForm: document.getElementById('intake-form'),
    chatView: document.getElementById('chat-view'),
    chatIntakeSummary: document.getElementById('chat-intake-summary'),
    editIntakeBtn: document.getElementById('edit-intake-btn'),
    quickGenerateNoteBtn: document.getElementById('quick-generate-note-btn'),
    crisisBanner: document.getElementById('crisis-banner'),
    connectCounselorNowBtn: document.getElementById('connect-counselor-now-btn'),
    unlockChatBtn: document.getElementById('unlock-chat-btn'),
    chatMessages: document.getElementById('chat-messages'),
    starterPrompts: document.getElementById('starter-prompts'),
    chatForm: document.getElementById('chat-form'),
    chatInput: document.getElementById('chat-input'),
    sendBtn: document.getElementById('send-btn'),

    // Relief Mini-Games
    breathingCircle: document.getElementById('breathing-circle'),
    breathingPhase: document.getElementById('breathing-phase'),
    breathingTimer: document.getElementById('breathing-timer'),
    breathingInstruction: document.getElementById('breathing-instruction'),
    breathingCyclesLabel: document.getElementById('breathing-cycles-label'),
    breathingStartBtn: document.getElementById('breathing-start-btn'),
    breathingStopBtn: document.getElementById('breathing-stop-btn'),
    breathingResetBtn: document.getElementById('breathing-reset-btn'),

    bubbleCanvas: document.getElementById('bubble-canvas'),
    bubbleScore: document.getElementById('bubble-score'),
    bubbleSoundBtn: document.getElementById('bubble-sound-btn'),
    bubbleResetBtn: document.getElementById('bubble-reset-btn'),

    // Pre-Consultation Note
    generateNoteBtn: document.getElementById('generate-note-btn'),
    emptyGenerateNoteBtn: document.getElementById('empty-generate-note-btn'),
    copyNoteBtn: document.getElementById('copy-note-btn'),
    downloadNoteBtn: document.getElementById('download-note-btn'),
    noteStatusBar: document.getElementById('note-status-bar'),
    noteSourceLabel: document.getElementById('note-source-label'),
    noteTimestampLabel: document.getElementById('note-timestamp-label'),
    noteLoadingState: document.getElementById('note-loading-state'),
    noteEmptyState: document.getElementById('note-empty-state'),
    noteOutputContainer: document.getElementById('note-output-container'),
    notePatientMeta: document.getElementById('note-patient-meta'),
    noteSectionsGrid: document.getElementById('note-sections-grid'),

    // Consultants
    cityFilter: document.getElementById('city-filter'),
    availabilityFilter: document.getElementById('availability-filter'),
    consultantsGrid: document.getElementById('consultants-grid'),

    // Video Modal
    videoModal: document.getElementById('video-modal'),
    closeVideoModalBtn: document.getElementById('close-video-modal-btn'),
    videoCounselorInitials: document.getElementById('video-counselor-initials'),
    videoCounselorName: document.getElementById('video-counselor-name'),
    videoCounselorMeta: document.getElementById('video-counselor-meta'),
    videoCallState: document.getElementById('video-call-state'),
    videoCallTimer: document.getElementById('video-call-timer'),
    audioWave: document.getElementById('audio-wave'),
    pipCameraOffView: document.getElementById('pip-camera-off-view'),
    pipCameraOnView: document.getElementById('pip-camera-on-view'),
    shareNoteToggle: document.getElementById('share-note-toggle'),
    videoNoteStatus: document.getElementById('video-note-status'),
    toggleMicBtn: document.getElementById('toggle-mic-btn'),
    toggleCamBtn: document.getElementById('toggle-cam-btn'),
    toggleJoinCallBtn: document.getElementById('toggle-join-call-btn'),
    endCallBtn: document.getElementById('end-call-btn'),

    // Helpline Modal
    helplineModal: document.getElementById('helpline-modal'),
    closeHelplineModalBtn: document.getElementById('close-helpline-modal-btn'),
    helplineToConsultantsBtn: document.getElementById('helpline-to-consultants-btn'),
  };

  // =========================================================================
  // Utility & API Helpers
  // =========================================================================
  function safeJsonParse(raw, fallback) {
    try {
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function formatTime(isoString) {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function formatShortDate(isoString) {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  function showToast(message, isError = false) {
    const toast = document.createElement('div');
    toast.className = `toast${isError ? ' toast-error' : ''}`;
    toast.textContent = message;
    els.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 3200);
  }

  async function apiFetch(path, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (state.token) {
      headers.Authorization = `Bearer ${state.token}`;
    }
    if (options.body && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(path, {
      ...options,
      headers,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 401 && !path.startsWith('/api/auth/login')) {
        clearClientSession();
        openAuthModal(false);
      }
      const err = new Error(data.error || `Request failed (${res.status})`);
      err.status = res.status;
      err.code = data.code || 'API_ERROR';
      throw err;
    }
    return data;
  }

  function renderFormattedMarkdown(rawText) {
    const escaped = escapeHtml(rawText || '');
    const lines = escaped.split(/\r?\n/);
    const htmlParts = [];
    let inList = null;

    const applyInline = (line) =>
      line
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code>$1</code>');

    lines.forEach((rawLine) => {
      const line = rawLine.trim();
      const bulletMatch = line.match(/^[-*]\s+(.+)$/);
      const numMatch = line.match(/^\d+\.\s+(.+)$/);

      if (bulletMatch) {
        if (inList !== 'ul') {
          if (inList) htmlParts.push(`</${inList}>`);
          htmlParts.push('<ul>');
          inList = 'ul';
        }
        htmlParts.push(`<li>${applyInline(bulletMatch[1])}</li>`);
      } else if (numMatch) {
        if (inList !== 'ol') {
          if (inList) htmlParts.push(`</${inList}>`);
          htmlParts.push('<ol>');
          inList = 'ol';
        }
        htmlParts.push(`<li>${applyInline(numMatch[1])}</li>`);
      } else {
        if (inList) {
          htmlParts.push(`</${inList}>`);
          inList = null;
        }
        if (line.length > 0) {
          htmlParts.push(`<p>${applyInline(line)}</p>`);
        }
      }
    });

    if (inList) {
      htmlParts.push(`</${inList}>`);
    }

    return htmlParts.join('') || '<p></p>';
  }

  // =========================================================================
  // Session & Account Modal Logic (Python Backend)
  // =========================================================================
  function updateModelIndicators() {
    if (els.modelStatusLabel) {
      els.modelStatusLabel.textContent = `Model: ${state.model}`;
    }
    if (els.geminiModelSelect) {
      els.geminiModelSelect.value = state.model;
    }
  }

  function clearClientSession() {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    state.token = '';
    state.user = null;
    state.chats = [];
    state.activeChatId = null;
    state.stressLogs = [];
    state.stressAverage = null;
    state.noteData = null;
  }

  function openAuthModal(allowClose = true) {
    els.authError.textContent = '';
    els.geminiModelSelect.value = state.model;
    els.closeAuthModalBtn.classList.toggle('hidden', !allowClose);
    els.authModal.classList.remove('hidden');
  }

  function closeAuthModal() {
    if (!state.user) return;
    els.authModal.classList.add('hidden');
  }

  async function hydrateWorkspaceFromBackend() {
    if (!state.user) return;

    els.userIdentityLabel.textContent = state.user.isGuest
      ? `Anonymous Guest (${state.user.id.slice(-4).toUpperCase()})`
      : state.user.email;

    if (state.user.preferredModel) {
      state.model = state.user.preferredModel;
      localStorage.setItem(STORAGE_KEYS.MODEL, state.model);
    }
    updateModelIndicators();

    try {
      const [chatsData, stressData, consultantsData] = await Promise.all([
        apiFetch('/api/chats'),
        apiFetch('/api/stress'),
        loadConsultantsFromServer(),
      ]);

      state.chats = chatsData.chats || [];
      state.activeChatId = state.chats.length > 0 ? state.chats[0].id : null;
      state.stressLogs = stressData.logs || [];
      state.stressAverage = stressData.average ?? null;
      if (consultantsData) {
        state.consultants = consultantsData;
      }

      if (state.activeChatId) {
        const noteRes = await apiFetch(
          `/api/notes/latest?chatId=${encodeURIComponent(state.activeChatId)}`
        ).catch(() => ({ note: null }));
        state.noteData = noteRes.note || null;
      } else {
        state.noteData = null;
      }

      renderChatHistory();
      renderStressHistory();
      renderActiveChatPanel();
      renderClinicalNote();
    } catch (err) {
      showToast(err.message || 'Unable to load workspace from Python server', true);
    }
  }

  async function handlePseudonymousLogin(e) {
    e.preventDefault();
    els.authError.textContent = '';

    const email = els.authEmail.value.trim().toLowerCase();
    const password = els.authPassword.value;

    if (!email || !email.includes('@')) {
      els.authError.textContent = 'Please enter a valid pseudonymous email address.';
      return;
    }
    if (!password || password.length < 4) {
      els.authError.textContent = 'Password must be at least 4 characters.';
      return;
    }

    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, model: state.model }),
      });
      state.token = res.token;
      state.user = res.user;
      localStorage.setItem(STORAGE_KEYS.TOKEN, res.token);
      els.authModal.classList.add('hidden');
      els.authPassword.value = '';
      showToast(res.created ? 'Created private account on server' : 'Signed in to private account');
      await hydrateWorkspaceFromBackend();
    } catch (err) {
      els.authError.textContent = err.message || 'Unable to sign in.';
    }
  }

  async function handleGuestLogin() {
    els.authError.textContent = '';
    const existingGuestId = localStorage.getItem(STORAGE_KEYS.GUEST_ID) || '';
    try {
      const res = await apiFetch('/api/auth/guest', {
        method: 'POST',
        body: JSON.stringify({ guestId: existingGuestId, model: state.model }),
      });
      state.token = res.token;
      state.user = res.user;
      localStorage.setItem(STORAGE_KEYS.TOKEN, res.token);
      localStorage.setItem(STORAGE_KEYS.GUEST_ID, res.user.id);
      els.authModal.classList.add('hidden');
      showToast('Entered as Anonymous Guest');
      await hydrateWorkspaceFromBackend();
    } catch (err) {
      els.authError.textContent = err.message || 'Unable to start guest session.';
    }
  }

  async function handleSignOut() {
    try {
      if (state.token) {
        await apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
      }
    } finally {
      clearClientSession();
      els.authPassword.value = '';
      renderChatHistory();
      renderStressHistory();
      renderActiveChatPanel();
      renderClinicalNote();
      openAuthModal(false);
    }
  }

  // =========================================================================
  // Pre-Screening Intake & Chat Management (Python SQLite Backend)
  // =========================================================================
  function getActiveChat() {
    return state.chats.find((c) => c.id === state.activeChatId) || null;
  }

  function startNewChatFlow() {
    state.activeChatId = null;
    state.noteData = null;
    switchTab('chat');
    renderChatHistory();
    renderActiveChatPanel();
    renderClinicalNote();
    closeMobileSidebar();
  }

  function getStarterPrompts(intake) {
    if (intake.language === 'Hindi') {
      return [
        `मुझे ${intake.concern} के कारण बहुत तनाव महसूस हो रहा है।`,
        'मेरा मन शांत नहीं हो रहा, मुझे एक छोटा ग्राउंडिंग अभ्यास बताएं।',
        'मैं अपने विचार काउंसलर के सामने कैसे रखूं?',
      ];
    }
    if (intake.language === 'Marathi') {
      return [
        `मला ${intake.concern} मुळे खूप ताण जाणवत आहे.`,
        'मन शांत करण्यासाठी मला एक सोपा श्वसनाचा किंवा ग्राउंडिंगचा सराव सुचवा.',
        'समुपदेशकाशी बोलण्यापूर्वी माझे विचार मांडायला मदत करा.',
      ];
    }
    return [
      `I've been feeling ${intake.mood.toLowerCase()} about ${intake.concern.toLowerCase()} lately.`,
      'Can you guide me through a quick 2-minute grounding exercise?',
      'Help me organize my thoughts before speaking to a counselor.',
    ];
  }

  function syncIntakeButtonsUI(intake) {
    const groups = els.intakeForm.querySelectorAll('.option-grid');
    groups.forEach((group) => {
      const q = group.dataset.question;
      const val = intake[q];
      group.querySelectorAll('.option-btn').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.value === val);
      });
    });
  }

  async function handleIntakeSubmit(e) {
    e.preventDefault();
    const intake = { ...state.currentIntakeDraft };
    const existing = getActiveChat();

    try {
      if (existing) {
        const res = await apiFetch(`/api/chats/${encodeURIComponent(existing.id)}`, {
          method: 'PATCH',
          body: JSON.stringify(intake),
        });
        const idx = state.chats.findIndex((c) => c.id === existing.id);
        if (idx !== -1) state.chats[idx] = res.chat;
        renderChatHistory();
        renderActiveChatPanel();
        showToast('Check-in preferences updated');
        return;
      }

      const res = await apiFetch('/api/chats', {
        method: 'POST',
        body: JSON.stringify(intake),
      });
      state.chats.unshift(res.chat);
      state.activeChatId = res.chat.id;
      state.noteData = null;
      renderChatHistory();
      renderActiveChatPanel();
      renderClinicalNote();
    } catch (err) {
      showToast(err.message || 'Could not save check-in', true);
    }
  }

  async function selectChat(chatId) {
    state.activeChatId = chatId;
    switchTab('chat');
    renderChatHistory();
    renderActiveChatPanel();
    closeMobileSidebar();

    try {
      const noteRes = await apiFetch(
        `/api/notes/latest?chatId=${encodeURIComponent(chatId)}`
      );
      state.noteData = noteRes.note || null;
      renderClinicalNote();
    } catch {
      state.noteData = null;
      renderClinicalNote();
    }
  }

  async function deleteChat(chatId) {
    try {
      await apiFetch(`/api/chats/${encodeURIComponent(chatId)}`, { method: 'DELETE' });
      state.chats = state.chats.filter((c) => c.id !== chatId);
      if (state.activeChatId === chatId) {
        state.activeChatId = state.chats.length > 0 ? state.chats[0].id : null;
        state.noteData = null;
      }
      renderChatHistory();
      renderActiveChatPanel();
      renderClinicalNote();
      showToast('Conversation deleted');
    } catch (err) {
      showToast(err.message || 'Could not delete conversation', true);
    }
  }

  function renderChatHistory() {
    els.chatCountLabel.textContent = String(state.chats.length);
    els.chatHistoryList.innerHTML = '';

    if (state.chats.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'history-empty';
      empty.textContent = 'No saved conversations yet.';
      els.chatHistoryList.appendChild(empty);
      return;
    }

    state.chats.forEach((chat) => {
      const li = document.createElement('li');
      li.className = `history-item${chat.id === state.activeChatId ? ' active' : ''}`;

      const selectBtn = document.createElement('button');
      selectBtn.type = 'button';
      selectBtn.className = 'history-select-btn';
      selectBtn.addEventListener('click', () => selectChat(chat.id));

      const titleSpan = document.createElement('span');
      titleSpan.className = 'history-title';
      titleSpan.textContent = chat.title || 'New Check-In';

      const metaSpan = document.createElement('span');
      metaSpan.className = 'history-meta';
      metaSpan.textContent = `${chat.intake.language} · ${formatShortDate(chat.updatedAt)}`;

      selectBtn.appendChild(titleSpan);
      selectBtn.appendChild(metaSpan);

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'history-delete-btn';
      delBtn.setAttribute('aria-label', `Delete conversation ${chat.title}`);
      delBtn.title = 'Delete conversation';
      delBtn.innerHTML =
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path></svg>';
      delBtn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        deleteChat(chat.id);
      });

      li.appendChild(selectBtn);
      li.appendChild(delBtn);
      els.chatHistoryList.appendChild(li);
    });
  }

  function renderActiveChatPanel() {
    const chat = getActiveChat();
    if (!chat) {
      els.intakeView.classList.remove('hidden');
      els.chatView.classList.add('hidden');
      syncIntakeButtonsUI(state.currentIntakeDraft);
      return;
    }

    els.intakeView.classList.add('hidden');
    els.chatView.classList.remove('hidden');

    const { mood, concern, language, style } = chat.intake;
    els.chatIntakeSummary.textContent = `Mood: ${mood} · Concern: ${concern} · Language: ${language} · Style: ${style}`;

    const isLocked = Boolean(chat.crisisLocked);
    els.crisisBanner.classList.toggle('hidden', !isLocked);
    els.chatInput.disabled = isLocked;
    els.sendBtn.disabled = isLocked || state.isSending;
    els.chatInput.placeholder = isLocked
      ? 'Chat paused for your safety. Please reach out to a helpline or counselor above.'
      : `Message StillMind in ${language}...`;

    renderMessages(chat);
    renderStarterPrompts(chat);
  }

  function renderMessages(chat) {
    els.chatMessages.innerHTML = '';

    chat.messages.forEach((msg) => {
      const row = document.createElement('div');
      row.className = `message-row ${msg.role}`;

      const meta = document.createElement('div');
      meta.className = 'message-meta';
      const senderName =
        msg.role === 'user' ? 'You' : msg.role === 'system-error' ? 'Notice' : 'StillMind';
      meta.textContent = `${senderName} · ${formatTime(msg.timestamp)}`;

      const bubble = document.createElement('div');
      bubble.className = 'message-bubble';
      bubble.innerHTML = renderFormattedMarkdown(msg.text);

      row.appendChild(meta);
      row.appendChild(bubble);
      els.chatMessages.appendChild(row);
    });

    if (state.isSending) {
      const loadingRow = document.createElement('div');
      loadingRow.className = 'message-row assistant';
      loadingRow.innerHTML = `
        <div class="message-meta">StillMind</div>
        <div class="message-bubble">
          <div class="typing-indicator">
            <span class="typing-dots" aria-hidden="true"><span></span><span></span><span></span></span>
            <span>Reflecting...</span>
          </div>
        </div>`;
      els.chatMessages.appendChild(loadingRow);
    }

    els.chatMessages.scrollTop = els.chatMessages.scrollHeight;
  }

  function renderStarterPrompts(chat) {
    const hasUserMessage = chat.messages.some((m) => m.role === 'user');
    if (hasUserMessage || chat.crisisLocked) {
      els.starterPrompts.classList.add('hidden');
      els.starterPrompts.innerHTML = '';
      return;
    }

    els.starterPrompts.classList.remove('hidden');
    els.starterPrompts.innerHTML = '';
    const prompts = getStarterPrompts(chat.intake);
    prompts.forEach((promptText) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'starter-prompt-btn';
      btn.textContent = promptText;
      btn.addEventListener('click', () => {
        submitChatMessage(promptText);
      });
      els.starterPrompts.appendChild(btn);
    });
  }

  // =========================================================================
  // Crisis Guardrail & Python Streaming Chat Integration
  // =========================================================================
  function detectCrisisKeywords(text) {
    if (!text) return false;
    return CRISIS_PATTERNS.some((pattern) => pattern.test(text));
  }

  async function submitChatMessage(rawText) {
    const chat = getActiveChat();
    if (!chat || state.isSending || chat.crisisLocked) return;

    const text = rawText.trim();
    if (!text) return;

    const isImmediateCrisis = detectCrisisKeywords(text);
    const tempUserMsg = {
      id: `temp_${Date.now()}`,
      role: 'user',
      text,
      timestamp: new Date().toISOString(),
    };
    const hadUserMsgs = chat.messages.some((m) => m.role === 'user');
    chat.messages.push(tempUserMsg);
    if (!hadUserMsgs) {
      chat.title = text.length > 38 ? `${text.slice(0, 38).trim()}...` : text;
    }
    chat.updatedAt = new Date().toISOString();

    els.chatInput.value = '';
    els.chatInput.style.height = 'auto';

    state.isSending = !isImmediateCrisis;
    renderChatHistory();
    renderActiveChatPanel();

    let streamingMsg = null;

    try {
      const response = await fetch(
        `/api/chats/${encodeURIComponent(chat.id)}/messages/stream`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
          },
          body: JSON.stringify({ text, model: state.model }),
        }
      );

      if (!response.ok || !response.body) {
        const errPayload = await response.json().catch(() => ({}));
        throw new Error(errPayload.error || `Server error (HTTP ${response.status})`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const evt of events) {
          const line = evt.split('\n').find((l) => l.startsWith('data: '));
          if (!line) continue;
          const payload = safeJsonParse(line.slice(6), null);
          if (!payload) continue;

          if (payload.meta) {
            if (payload.chatTitle) chat.title = payload.chatTitle;
            if (payload.userMessage) {
              const idx = chat.messages.findIndex((m) => m.id === tempUserMsg.id);
              if (idx !== -1) chat.messages[idx] = payload.userMessage;
            }
          }

          if (payload.crisisLocked) {
            chat.crisisLocked = true;
            if (payload.chatTitle) chat.title = payload.chatTitle;
            if (payload.userMessage) {
              const idx = chat.messages.findIndex((m) => m.id === tempUserMsg.id);
              if (idx !== -1) chat.messages[idx] = payload.userMessage;
            }
            if (payload.assistantMessage) {
              chat.messages.push(payload.assistantMessage);
            }
            state.isSending = false;
            renderChatHistory();
            renderActiveChatPanel();
            return;
          }

          if (payload.error) {
            if (streamingMsg && !streamingMsg.text.trim()) {
              chat.messages = chat.messages.filter((m) => m.id !== streamingMsg.id);
            }
            chat.messages.push({
              id: payload.errorId || `err_${Date.now()}`,
              role: 'system-error',
              text: payload.error,
              timestamp: payload.timestamp || new Date().toISOString(),
            });
            state.isSending = false;
            renderActiveChatPanel();
            return;
          }

          if (payload.chunk) {
            accumulated += payload.chunk;
            if (!streamingMsg) {
              streamingMsg = {
                id: `stream_${Date.now()}`,
                role: 'assistant',
                text: accumulated,
                timestamp: new Date().toISOString(),
              };
              chat.messages.push(streamingMsg);
              state.isSending = false;
            } else {
              streamingMsg.text = accumulated;
            }
            renderMessages(chat);
          }

          if (payload.done && payload.assistantMessage) {
            if (streamingMsg) {
              const idx = chat.messages.findIndex((m) => m.id === streamingMsg.id);
              if (idx !== -1) chat.messages[idx] = payload.assistantMessage;
            } else {
              chat.messages.push(payload.assistantMessage);
            }
            chat.updatedAt = payload.assistantMessage.timestamp;
          }
        }
      }
    } catch (err) {
      chat.messages.push({
        id: `err_${Date.now()}`,
        role: 'system-error',
        text: err.message || 'Unable to generate a response right now. Please try again shortly.',
        timestamp: new Date().toISOString(),
      });
    } finally {
      state.isSending = false;
      renderChatHistory();
      renderActiveChatPanel();
    }
  }

  // =========================================================================
  // Stress-Level Tracker (Python SQLite Persistence)
  // =========================================================================
  function getStressDescriptor(score) {
    if (score <= 3) return { emoji: '😌', label: 'Calm / Low Stress', color: '#2E6F65' };
    if (score <= 6) return { emoji: '😐', label: 'Moderate Tension', color: '#B45309' };
    if (score <= 8) return { emoji: '😟', label: 'Elevated Stress', color: '#C2410C' };
    return { emoji: '😣', label: 'High Distress', color: '#B91C1C' };
  }

  function updateStressSliderPreview() {
    const val = Number(els.stressSlider.value);
    const info = getStressDescriptor(val);
    els.stressValueDisplay.textContent = String(val);
    els.stressValueDisplay.style.color = info.color;
    els.stressEmoji.textContent = info.emoji;
    els.stressStateLabel.textContent = info.label;
    els.stressStateLabel.style.color = info.color;
  }

  async function handleLogStress() {
    const score = Number(els.stressSlider.value);
    try {
      const res = await apiFetch('/api/stress', {
        method: 'POST',
        body: JSON.stringify({ score }),
      });
      state.stressLogs = res.logs || [];
      state.stressAverage = res.average ?? null;
      renderStressHistory();
      showToast(`Logged stress check-in: ${score}/10`);
    } catch (err) {
      showToast(err.message || 'Unable to log stress check-in', true);
    }
  }

  function renderStressHistory() {
    els.stressBarHistory.innerHTML = '';

    if (state.stressLogs.length === 0) {
      els.stressAvgLabel.textContent = '';
      const empty = document.createElement('div');
      empty.className = 'stress-bar-empty';
      empty.textContent = 'Log your first check-in';
      els.stressBarHistory.appendChild(empty);
      return;
    }

    const recent = state.stressLogs.slice(0, 8).reverse();
    const avg =
      state.stressAverage !== null
        ? Number(state.stressAverage).toFixed(1)
        : (
            state.stressLogs.reduce((acc, item) => acc + item.score, 0) / state.stressLogs.length
          ).toFixed(1);
    els.stressAvgLabel.textContent = `Avg ${avg}/10`;

    recent.forEach((entry) => {
      const col = document.createElement('div');
      col.className = 'stress-bar-col';
      col.title = `${entry.score}/10 · ${formatShortDate(entry.timestamp)} ${formatTime(
        entry.timestamp
      )}`;

      const fill = document.createElement('div');
      fill.className = 'stress-bar-fill';
      fill.style.height = `${Math.max(12, entry.score * 10)}%`;
      fill.style.backgroundColor = getStressDescriptor(entry.score).color;

      col.appendChild(fill);
      els.stressBarHistory.appendChild(col);
    });
  }

  // =========================================================================
  // Tab Navigation
  // =========================================================================
  function switchTab(tabName) {
    state.activeTab = tabName;
    els.tabButtons.forEach((btn) => {
      const isMatch = btn.dataset.tab === tabName;
      btn.classList.toggle('active', isMatch);
      btn.setAttribute('aria-selected', String(isMatch));
    });

    els.tabPanels.forEach((panel) => {
      panel.classList.toggle('active', panel.id === `tab-${tabName}`);
    });

    if (tabName === 'relief') {
      initBubbleCanvas();
    }
  }

  // =========================================================================
  // Relief Mini-Game A: 4-7-8 Guided Breathing Visualizer
  // =========================================================================
  const BREATH_PHASES = [
    {
      name: 'Inhale',
      duration: 4,
      cssClass: 'phase-inhale',
      instruction: 'Breathe in quietly through your nose for 4 seconds.',
    },
    {
      name: 'Hold',
      duration: 7,
      cssClass: 'phase-hold',
      instruction: 'Hold your breath gently for 7 seconds.',
    },
    {
      name: 'Exhale',
      duration: 8,
      cssClass: 'phase-exhale',
      instruction: 'Exhale slowly through your mouth for 8 seconds.',
    },
  ];

  function renderBreathingUI() {
    const b = state.breathing;
    const phase = BREATH_PHASES[b.phaseIndex];
    els.breathingCyclesLabel.textContent = `Cycles: ${b.cycles}`;

    els.breathingCircle.classList.remove('phase-inhale', 'phase-hold', 'phase-exhale');
    if (b.running) {
      els.breathingCircle.classList.add(phase.cssClass);
      els.breathingPhase.textContent = phase.name;
      els.breathingTimer.textContent = String(b.secondsLeft);
      els.breathingInstruction.textContent = phase.instruction;
    } else {
      els.breathingPhase.textContent = 'Ready';
      els.breathingTimer.textContent = '4';
      els.breathingInstruction.textContent =
        'Press Start to begin a calming 4-7-8 breathing cycle.';
    }

    els.breathingStartBtn.disabled = b.running;
    els.breathingStopBtn.disabled = !b.running;
  }

  function startBreathing() {
    if (state.breathing.running) return;
    state.breathing.running = true;
    state.breathing.phaseIndex = 0;
    state.breathing.secondsLeft = BREATH_PHASES[0].duration;
    renderBreathingUI();

    state.breathing.intervalId = setInterval(() => {
      const b = state.breathing;
      if (b.secondsLeft > 1) {
        b.secondsLeft -= 1;
      } else {
        b.phaseIndex = (b.phaseIndex + 1) % BREATH_PHASES.length;
        if (b.phaseIndex === 0) {
          b.cycles += 1;
        }
        b.secondsLeft = BREATH_PHASES[b.phaseIndex].duration;
      }
      renderBreathingUI();
    }, 1000);
  }

  function stopBreathing() {
    if (state.breathing.intervalId) {
      clearInterval(state.breathing.intervalId);
      state.breathing.intervalId = null;
    }
    state.breathing.running = false;
    renderBreathingUI();
  }

  function resetBreathing() {
    stopBreathing();
    state.breathing.cycles = 0;
    state.breathing.phaseIndex = 0;
    state.breathing.secondsLeft = 4;
    renderBreathingUI();
  }

  // =========================================================================
  // Relief Mini-Game B: Zen Bubble Pop (HTML5 Canvas)
  // =========================================================================
  const BUBBLE_COLORS = [
    { fill: 'rgba(46, 111, 101, 0.24)', stroke: 'rgba(46, 111, 101, 0.55)' },
    { fill: 'rgba(116, 178, 168, 0.28)', stroke: 'rgba(46, 111, 101, 0.45)' },
    { fill: 'rgba(167, 196, 188, 0.36)', stroke: 'rgba(62, 132, 121, 0.5)' },
    { fill: 'rgba(182, 198, 214, 0.34)', stroke: 'rgba(100, 116, 139, 0.4)' },
  ];

  function playSoftChime() {
    if (!state.bubbles.soundOn) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!state.bubbles.audioCtx) {
        state.bubbles.audioCtx = new AudioCtx();
      }
      const ctx = state.bubbles.audioCtx;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const notes = [392.0, 440.0, 523.25, 587.33, 659.25];
      const freq = notes[Math.floor(Math.random() * notes.length)];
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.46);
    } catch {
      // Ignore audio errors gracefully
    }
  }

  function createBubble(width, height, startAtBottom = false) {
    const r = 18 + Math.random() * 20;
    const palette = BUBBLE_COLORS[Math.floor(Math.random() * BUBBLE_COLORS.length)];
    return {
      x: r + Math.random() * Math.max(40, width - r * 2),
      y: startAtBottom
        ? height + r + Math.random() * 30
        : r + Math.random() * Math.max(40, height - r * 2),
      r,
      vy: -(0.35 + Math.random() * 0.45),
      vx: (Math.random() - 0.5) * 0.25,
      wobblePhase: Math.random() * Math.PI * 2,
      color: palette,
    };
  }

  function resizeBubbleCanvas() {
    const canvas = els.bubbleCanvas;
    if (!canvas) return { width: 400, height: 300 };
    const rect = canvas.parentElement.getBoundingClientRect();
    const width = Math.max(280, Math.floor(rect.width));
    const height = Math.max(260, Math.floor(rect.height));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { width, height };
  }

  function populateBubbles() {
    const { width, height } = resizeBubbleCanvas();
    state.bubbles.items = [];
    state.bubbles.ripples = [];
    for (let i = 0; i < 15; i += 1) {
      state.bubbles.items.push(createBubble(width, height, false));
    }
  }

  function initBubbleCanvas() {
    resizeBubbleCanvas();
    if (!state.bubbles.initialized) {
      state.bubbles.initialized = true;
      populateBubbles();
      animateBubbles();
    }
  }

  function animateBubbles() {
    const canvas = els.bubbleCanvas;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const width = rect.width || 400;
    const height = rect.height || 300;

    ctx.clearRect(0, 0, width, height);

    state.bubbles.items.forEach((b, idx) => {
      b.wobblePhase += 0.025;
      b.y += b.vy;
      b.x += b.vx + Math.sin(b.wobblePhase) * 0.25;

      if (b.y < -b.r - 10) {
        state.bubbles.items[idx] = createBubble(width, height, true);
      }
      if (b.x < b.r) b.x = b.r;
      if (b.x > width - b.r) b.x = width - b.r;

      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fillStyle = b.color.fill;
      ctx.fill();
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = b.color.stroke;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.22, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.fill();
    });

    for (let i = state.bubbles.ripples.length - 1; i >= 0; i -= 1) {
      const rp = state.bubbles.ripples[i];
      rp.radius += 1.6;
      rp.alpha -= 0.025;
      if (rp.alpha <= 0) {
        state.bubbles.ripples.splice(i, 1);
        continue;
      }
      ctx.beginPath();
      ctx.arc(rp.x, rp.y, rp.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(46, 111, 101, ${rp.alpha.toFixed(2)})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    state.bubbles.rafId = requestAnimationFrame(animateBubbles);
  }

  function handleBubbleCanvasClick(e) {
    const rect = els.bubbleCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    for (let i = state.bubbles.items.length - 1; i >= 0; i -= 1) {
      const b = state.bubbles.items[i];
      const dist = Math.hypot(x - b.x, y - b.y);
      if (dist <= b.r + 6) {
        state.bubbles.ripples.push({ x: b.x, y: b.y, radius: b.r * 0.5, alpha: 0.75 });
        state.bubbles.items.splice(i, 1);
        state.bubbles.items.push(createBubble(rect.width, rect.height, true));
        state.bubbles.score += 1;
        els.bubbleScore.textContent = String(state.bubbles.score);
        playSoftChime();
        break;
      }
    }
  }

  // =========================================================================
  // Pre-Consultation Note Generator (Python Backend)
  // =========================================================================
  async function handleGenerateNote() {
    switchTab('note');
    els.noteEmptyState.classList.add('hidden');
    els.noteOutputContainer.classList.add('hidden');
    els.noteStatusBar.classList.add('hidden');
    els.noteLoadingState.classList.remove('hidden');

    try {
      const res = await apiFetch('/api/notes/generate', {
        method: 'POST',
        body: JSON.stringify({
          chatId: state.activeChatId,
          model: state.model,
          ...state.currentIntakeDraft,
        }),
      });
      state.noteData = res.note;
      renderClinicalNote();
    } catch (err) {
      els.noteLoadingState.classList.add('hidden');
      els.noteEmptyState.classList.remove('hidden');
      showToast(err.message || 'Unable to generate clinical note', true);
    }
  }

  function renderClinicalNote() {
    const note = state.noteData;
    els.noteLoadingState.classList.add('hidden');

    if (!note) {
      els.noteEmptyState.classList.remove('hidden');
      els.noteOutputContainer.classList.add('hidden');
      els.noteStatusBar.classList.add('hidden');
      els.copyNoteBtn.disabled = true;
      els.downloadNoteBtn.disabled = true;
      return;
    }

    els.noteEmptyState.classList.add('hidden');
    els.noteStatusBar.classList.remove('hidden');
    els.noteOutputContainer.classList.remove('hidden');
    els.copyNoteBtn.disabled = false;
    els.downloadNoteBtn.disabled = false;

    els.noteSourceLabel.textContent = `Source: ${note.source}`;
    els.noteTimestampLabel.textContent = `Generated ${formatShortDate(note.generatedAt)} · ${formatTime(
      note.generatedAt
    )}`;
    els.notePatientMeta.textContent = `Language: ${note.intake.language} · Support Style: ${note.intake.style}`;

    const triggerItems = note.keyTriggers
      .map((item) => `<li>${escapeHtml(item)}</li>`)
      .join('');
    const focusItems = note.suggestedFocusAreas
      .map((item) => `<li>${escapeHtml(item)}</li>`)
      .join('');

    els.noteSectionsGrid.innerHTML = `
      <div class="note-section-block full-span">
        <h3>Chief Concerns</h3>
        <p>${escapeHtml(note.chiefConcerns)}</p>
      </div>
      <div class="note-section-block">
        <h3>Emotional State</h3>
        <p>${escapeHtml(note.emotionalState)}</p>
      </div>
      <div class="note-section-block">
        <h3>Stress Score</h3>
        <p>${escapeHtml(note.stressScore)}</p>
      </div>
      <div class="note-section-block">
        <h3>Key Triggers</h3>
        <ul>${triggerItems || '<li>None explicitly identified yet.</li>'}</ul>
      </div>
      <div class="note-section-block">
        <h3>Suggested Focus Areas</h3>
        <ul>${focusItems || '<li>Initial rapport building and check-in.</li>'}</ul>
      </div>
    `;
  }

  function formatNoteAsPlainText(note) {
    return [
      'STILLMIND — PRE-CONSULTATION SUMMARY NOTE',
      `Generated: ${new Date(note.generatedAt).toLocaleString()}`,
      `Source: ${note.source}`,
      `Preferred Language: ${note.intake.language} | Support Style: ${note.intake.style}`,
      '------------------------------------------------------------',
      '',
      '1. CHIEF CONCERNS',
      note.chiefConcerns,
      '',
      '2. EMOTIONAL STATE',
      note.emotionalState,
      '',
      '3. STRESS SCORE',
      note.stressScore,
      '',
      '4. KEY TRIGGERS',
      ...note.keyTriggers.map((t) => `- ${t}`),
      '',
      '5. SUGGESTED FOCUS AREAS',
      ...note.suggestedFocusAreas.map((f) => `- ${f}`),
      '',
      '------------------------------------------------------------',
      'Disclaimer: Prepared for counselor pre-consultation review. Not a medical diagnosis.',
    ].join('\n');
  }

  async function handleCopyNote() {
    if (!state.noteData) return;
    const text = formatNoteAsPlainText(state.noteData);
    try {
      await navigator.clipboard.writeText(text);
      showToast('Pre-consultation note copied to clipboard');
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      showToast('Pre-consultation note copied to clipboard');
    }
  }

  async function handleDownloadNote() {
    if (!state.noteData) return;
    try {
      const res = await fetch(
        `/api/notes/${encodeURIComponent(state.noteData.id)}/export`,
        {
          headers: state.token ? { Authorization: `Bearer ${state.token}` } : {},
        }
      );
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStamp = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `StillMind_PreConsultation_Note_${dateStamp}.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast('Downloaded Pre-Consultation Note (.TXT)');
    } catch {
      const text = formatNoteAsPlainText(state.noteData);
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStamp = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `StillMind_PreConsultation_Note_${dateStamp}.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast('Downloaded Pre-Consultation Note (.TXT)');
    }
  }

  // =========================================================================
  // Maharashtra Consultant Directory & Video Preview Modal (Python Backend)
  // =========================================================================
  async function loadConsultantsFromServer() {
    const cityVal = els.cityFilter.value || 'All';
    const availVal = els.availabilityFilter.value || 'All';
    const params = new URLSearchParams({ city: cityVal, availability: availVal });
    const res = await fetch(`/api/consultants?${params.toString()}`);
    if (!res.ok) return [];
    const data = await res.json().catch(() => ({}));
    return data.consultants || [];
  }

  async function refreshAndRenderConsultants() {
    state.consultants = await loadConsultantsFromServer();
    renderConsultants();
  }

  function renderConsultants() {
    const list = state.consultants;
    els.consultantsGrid.innerHTML = '';

    if (list.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'surface-card';
      empty.innerHTML =
        '<p class="section-desc">No counselors match this city and availability filter. Try selecting All Cities.</p>';
      els.consultantsGrid.appendChild(empty);
      return;
    }

    list.forEach((c) => {
      const card = document.createElement('article');
      card.className = 'consultant-card';

      card.innerHTML = `
        <div>
          <div class="consultant-top">
            <div class="consultant-avatar" aria-hidden="true">${escapeHtml(c.initials)}</div>
            <div>
              <h2 class="consultant-name">${escapeHtml(c.name)}</h2>
              <p class="consultant-cred">${escapeHtml(c.credentials)}</p>
              <p class="consultant-meta-line">${escapeHtml(c.area)} · ${escapeHtml(
        c.languages
      )} · ${escapeHtml(c.experience)}</p>
            </div>
          </div>
          <div class="consultant-specializations">
            ${escapeHtml(c.specializations)}
          </div>
        </div>
        <div class="consultant-footer">
          <span class="availability-text${c.availableNow ? '' : ' later'}">${escapeHtml(
        c.availability
      )}</span>
          <button type="button" class="btn btn-primary btn-sm join-video-btn">
            Book / Join Video Call
          </button>
        </div>
      `;

      card.querySelector('.join-video-btn').addEventListener('click', () => {
        openVideoModal(c);
      });

      els.consultantsGrid.appendChild(card);
    });
  }

  function formatCallTimer(totalSeconds) {
    const mins = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const secs = String(totalSeconds % 60).padStart(2, '0');
    return `${mins}:${secs}`;
  }

  function updateVideoModalUI() {
    const v = state.video;
    if (!v.consultant) return;

    els.videoCounselorInitials.textContent = v.consultant.initials;
    els.videoCounselorName.textContent = v.consultant.name;
    els.videoCounselorMeta.textContent = `${v.consultant.city} · ${v.consultant.languages}`;
    els.videoCallState.textContent = v.connected ? 'Connected (Simulated Preview)' : 'Waiting Room';
    els.videoCallTimer.textContent = formatCallTimer(v.seconds);

    els.audioWave.classList.toggle('hidden', !v.connected || !v.micOn);
    els.toggleMicBtn.textContent = v.micOn ? 'Mic: On' : 'Mic: Muted';
    els.toggleCamBtn.textContent = v.camOn ? 'Camera: On' : 'Camera: Off';
    els.pipCameraOffView.classList.toggle('hidden', v.camOn);
    els.pipCameraOnView.classList.toggle('hidden', !v.camOn);

    els.toggleJoinCallBtn.classList.toggle('hidden', v.connected);
    els.endCallBtn.classList.toggle('hidden', !v.connected);

    els.videoNoteStatus.textContent = els.shareNoteToggle.checked
      ? state.noteData
        ? 'Clinical note attached'
        : 'Will auto-generate summary on join'
      : 'Note sharing off';
  }

  async function openVideoModal(consultant) {
    stopVideoCallTimer();
    state.video.consultant = consultant;
    state.video.appointmentId = null;
    state.video.connected = false;
    state.video.seconds = 0;
    state.video.micOn = true;
    state.video.camOn = false;
    updateVideoModalUI();
    els.videoModal.classList.remove('hidden');

    if (state.token) {
      try {
        const res = await apiFetch('/api/appointments', {
          method: 'POST',
          body: JSON.stringify({
            consultantId: consultant.id,
            shareNote: els.shareNoteToggle.checked,
            noteId: state.noteData ? state.noteData.id : null,
          }),
        });
        state.video.appointmentId = res.appointment?.id || null;
      } catch {
        // Preview remains usable even if booking record fails
      }
    }
  }

  async function startVideoCall() {
    if (state.video.connected) return;
    if (els.shareNoteToggle.checked && !state.noteData && state.token) {
      try {
        const res = await apiFetch('/api/notes/generate', {
          method: 'POST',
          body: JSON.stringify({
            chatId: state.activeChatId,
            model: state.model,
            ...state.currentIntakeDraft,
          }),
        });
        state.noteData = res.note;
        renderClinicalNote();
      } catch {
        // Ignore auto-note error during call preview
      }
    }

    if (state.video.appointmentId && state.token) {
      apiFetch(`/api/appointments/${encodeURIComponent(state.video.appointmentId)}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'connected' }),
      }).catch(() => {});
    }

    state.video.connected = true;
    state.video.seconds = 0;
    updateVideoModalUI();

    state.video.timerId = setInterval(() => {
      state.video.seconds += 1;
      els.videoCallTimer.textContent = formatCallTimer(state.video.seconds);
    }, 1000);
    showToast(`Connected to ${state.video.consultant.name} (Preview)`);
  }

  function stopVideoCallTimer() {
    if (state.video.timerId) {
      clearInterval(state.video.timerId);
      state.video.timerId = null;
    }
  }

  function closeVideoModal() {
    stopVideoCallTimer();
    if (state.video.appointmentId && state.token && state.video.connected) {
      apiFetch(`/api/appointments/${encodeURIComponent(state.video.appointmentId)}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'ended' }),
      }).catch(() => {});
    }
    state.video.connected = false;
    els.videoModal.classList.add('hidden');
  }

  // =========================================================================
  // Sidebar Responsive Drawer
  // =========================================================================
  function isMobileViewport() {
    return window.innerWidth <= 860;
  }

  function closeMobileSidebar() {
    els.appShell.classList.remove('mobile-sidebar-open');
    els.sidebarBackdrop.classList.add('hidden');
  }

  function toggleSidebar() {
    if (isMobileViewport()) {
      const opening = !els.appShell.classList.contains('mobile-sidebar-open');
      els.appShell.classList.toggle('mobile-sidebar-open', opening);
      els.sidebarBackdrop.classList.toggle('hidden', !opening);
    } else {
      els.appShell.classList.toggle('sidebar-collapsed');
    }
  }

  // =========================================================================
  // Event Binding & Initialization
  // =========================================================================
  function bindEvents() {
    els.openSidebarBtn.addEventListener('click', toggleSidebar);
    els.collapseSidebarBtn.addEventListener('click', toggleSidebar);
    els.sidebarBackdrop.addEventListener('click', closeMobileSidebar);

    els.openSettingsBtn.addEventListener('click', () => openAuthModal(true));
    els.closeAuthModalBtn.addEventListener('click', closeAuthModal);
    els.geminiModelSelect.addEventListener('change', async () => {
      state.model = els.geminiModelSelect.value;
      localStorage.setItem(STORAGE_KEYS.MODEL, state.model);
      updateModelIndicators();
      if (state.token) {
        await apiFetch('/api/auth/preferences', {
          method: 'PATCH',
          body: JSON.stringify({ model: state.model }),
        }).catch(() => {});
      }
      showToast(`Switched model to ${state.model}`);
    });
    els.loginForm.addEventListener('submit', handlePseudonymousLogin);
    els.guestLoginBtn.addEventListener('click', handleGuestLogin);
    els.signOutBtn.addEventListener('click', handleSignOut);

    els.tabButtons.forEach((btn) => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    els.topHelplineBtn.addEventListener('click', () => els.helplineModal.classList.remove('hidden'));
    els.closeHelplineModalBtn.addEventListener('click', () =>
      els.helplineModal.classList.add('hidden')
    );
    els.helplineToConsultantsBtn.addEventListener('click', () => {
      els.helplineModal.classList.add('hidden');
      switchTab('consultants');
    });

    els.newChatBtn.addEventListener('click', startNewChatFlow);
    els.intakeForm.querySelectorAll('.option-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const group = btn.closest('.option-grid');
        const question = group.dataset.question;
        state.currentIntakeDraft[question] = btn.dataset.value;
        group.querySelectorAll('.option-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
    els.intakeForm.addEventListener('submit', handleIntakeSubmit);

    els.editIntakeBtn.addEventListener('click', () => {
      const chat = getActiveChat();
      if (!chat) return;
      state.currentIntakeDraft = { ...chat.intake };
      els.chatView.classList.add('hidden');
      els.intakeView.classList.remove('hidden');
      syncIntakeButtonsUI(state.currentIntakeDraft);
    });

    els.quickGenerateNoteBtn.addEventListener('click', handleGenerateNote);

    els.connectCounselorNowBtn.addEventListener('click', () => {
      switchTab('consultants');
      const firstAvailable =
        state.consultants.find((c) => c.availableNow) || state.consultants[0];
      if (firstAvailable) {
        openVideoModal(firstAvailable);
      }
    });

    els.unlockChatBtn.addEventListener('click', async () => {
      const chat = getActiveChat();
      if (!chat) return;
      try {
        const res = await apiFetch(`/api/chats/${encodeURIComponent(chat.id)}`, {
          method: 'PATCH',
          body: JSON.stringify({ crisisLocked: false }),
        });
        const idx = state.chats.findIndex((c) => c.id === chat.id);
        if (idx !== -1) state.chats[idx] = res.chat;
        renderActiveChatPanel();
        showToast('Chat unlocked. Crisis helplines remain accessible in the top bar.');
      } catch (err) {
        showToast(err.message || 'Could not unlock chat', true);
      }
    });

    els.chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      submitChatMessage(els.chatInput.value);
    });

    els.chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        submitChatMessage(els.chatInput.value);
      }
    });

    els.chatInput.addEventListener('input', () => {
      els.chatInput.style.height = 'auto';
      els.chatInput.style.height = `${Math.min(140, els.chatInput.scrollHeight)}px`;
    });

    els.stressSlider.addEventListener('input', updateStressSliderPreview);
    els.logStressBtn.addEventListener('click', handleLogStress);

    els.breathingStartBtn.addEventListener('click', startBreathing);
    els.breathingStopBtn.addEventListener('click', stopBreathing);
    els.breathingResetBtn.addEventListener('click', resetBreathing);

    els.bubbleCanvas.addEventListener('click', handleBubbleCanvasClick);
    els.bubbleSoundBtn.addEventListener('click', () => {
      state.bubbles.soundOn = !state.bubbles.soundOn;
      els.bubbleSoundBtn.textContent = state.bubbles.soundOn ? 'Chime: On' : 'Chime: Off';
      if (state.bubbles.soundOn) playSoftChime();
    });
    els.bubbleResetBtn.addEventListener('click', () => {
      populateBubbles();
      showToast('Bubbles refreshed');
    });

    els.generateNoteBtn.addEventListener('click', handleGenerateNote);
    els.emptyGenerateNoteBtn.addEventListener('click', handleGenerateNote);
    els.copyNoteBtn.addEventListener('click', handleCopyNote);
    els.downloadNoteBtn.addEventListener('click', handleDownloadNote);

    els.cityFilter.addEventListener('change', refreshAndRenderConsultants);
    els.availabilityFilter.addEventListener('change', refreshAndRenderConsultants);

    els.closeVideoModalBtn.addEventListener('click', closeVideoModal);
    els.toggleMicBtn.addEventListener('click', () => {
      state.video.micOn = !state.video.micOn;
      updateVideoModalUI();
    });
    els.toggleCamBtn.addEventListener('click', () => {
      state.video.camOn = !state.video.camOn;
      updateVideoModalUI();
    });
    els.shareNoteToggle.addEventListener('change', updateVideoModalUI);
    els.toggleJoinCallBtn.addEventListener('click', startVideoCall);
    els.endCallBtn.addEventListener('click', () => {
      stopVideoCallTimer();
      if (state.video.appointmentId && state.token) {
        apiFetch(`/api/appointments/${encodeURIComponent(state.video.appointmentId)}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'ended' }),
        }).catch(() => {});
      }
      state.video.connected = false;
      updateVideoModalUI();
      showToast('Video consultation preview ended');
    });

    window.addEventListener('resize', () => {
      if (!isMobileViewport()) {
        closeMobileSidebar();
      }
      if (state.activeTab === 'relief') {
        resizeBubbleCanvas();
      }
    });
  }

  async function init() {
    const savedModel = localStorage.getItem(STORAGE_KEYS.MODEL);
    state.model =
      savedModel === 'gemini-4-hydrogen' || savedModel === 'gemini-3.1-flash-lite'
        ? savedModel
        : DEFAULT_MODEL;
    updateModelIndicators();
    updateStressSliderPreview();
    renderBreathingUI();
    bindEvents();

    // Load public consultant directory immediately
    await refreshAndRenderConsultants().catch(() => {});

    const savedToken = localStorage.getItem(STORAGE_KEYS.TOKEN);
    if (savedToken) {
      state.token = savedToken;
      try {
        const me = await apiFetch('/api/auth/me');
        state.user = me.user;
        els.authModal.classList.add('hidden');
        await hydrateWorkspaceFromBackend();
        return;
      } catch {
        clearClientSession();
      }
    }

    openAuthModal(false);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
