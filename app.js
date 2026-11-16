/* StillMind — AI-Powered Mental Health Support & Pre-Consultation Platform */
(() => {
  'use strict';

  // =========================================================================
  // Constants & Storage Keys
  // =========================================================================
  const STORAGE_KEYS = {
    USERS: 'stillmind_users_v1',
    ACTIVE_SESSION: 'stillmind_active_session_v1',
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

  const MAHARASHTRA_CONSULTANTS = [
    {
      id: 'c-pune-1',
      name: 'Dr. Aditi Kulkarni',
      initials: 'AK',
      credentials: 'M.Phil Clinical Psychology · RCI Registered',
      city: 'Pune',
      area: 'Shivajinagar, Pune',
      experience: '10 yrs experience',
      languages: 'Marathi, Hindi, English',
      specializations: 'Anxiety · Academic Burnout · CBT & Mindfulness',
      availability: 'Available Now',
      availableNow: true,
    },
    {
      id: 'c-pune-2',
      name: 'Rohan Deshmukh',
      initials: 'RD',
      credentials: 'M.A. Counseling Psychology',
      city: 'Pune',
      area: 'Kothrud, Pune',
      experience: '7 yrs experience',
      languages: 'Marathi, English',
      specializations: 'Career Transitions · Sleep Hygiene · Stress Management',
      availability: 'Next Slot: Today, 5:00 PM',
      availableNow: false,
    },
    {
      id: 'c-mumbai-1',
      name: 'Dr. Meera Nair',
      initials: 'MN',
      credentials: 'Ph.D. Counseling Psychology · RCI Registered',
      city: 'Mumbai',
      area: 'Bandra West, Mumbai',
      experience: '12 yrs experience',
      languages: 'English, Hindi, Marathi',
      specializations: 'Relationship Dynamics · Panic & Overwhelm · Trauma-Informed Care',
      availability: 'Available Now',
      availableNow: true,
    },
    {
      id: 'c-mumbai-2',
      name: 'Siddharth Joshi',
      initials: 'SJ',
      credentials: 'M.Sc. Clinical Psychology',
      city: 'Mumbai',
      area: 'Powai, Mumbai',
      experience: '6 yrs experience',
      languages: 'Hindi, English, Marathi',
      specializations: 'Workplace Stress · Young Adult Counseling · ACT',
      availability: 'Next Slot: Today, 6:30 PM',
      availableNow: false,
    },
    {
      id: 'c-nagpur-1',
      name: 'Dr. Pallavi Deshpande',
      initials: 'PD',
      credentials: 'M.Phil Clinical Psychology · RCI Registered',
      city: 'Nagpur',
      area: 'Dharampeth, Nagpur',
      experience: '9 yrs experience',
      languages: 'Marathi, Hindi, English',
      specializations: 'Exam Anxiety · Emotional Regulation · Family Support',
      availability: 'Available Now',
      availableNow: true,
    },
    {
      id: 'c-nagpur-2',
      name: 'Aniket Wankhede',
      initials: 'AW',
      credentials: 'M.A. Applied Psychology',
      city: 'Nagpur',
      area: 'Civil Lines, Nagpur',
      experience: '5 yrs experience',
      languages: 'Marathi, Hindi',
      specializations: 'General Stress · Sleep Difficulties · Behavioral Activation',
      availability: 'Next Slot: Tomorrow, 11:00 AM',
      availableNow: false,
    },
    {
      id: 'c-nashik-1',
      name: 'Snehal Patil',
      initials: 'SP',
      credentials: 'M.A. Counseling Psychology',
      city: 'Nashik',
      area: 'College Road, Nashik',
      experience: '8 yrs experience',
      languages: 'Marathi, Hindi, English',
      specializations: 'Student Wellbeing · Self-Esteem · Solution-Focused Therapy',
      availability: 'Available Now',
      availableNow: true,
    },
    {
      id: 'c-nashik-2',
      name: 'Dr. Vikram Gokhale',
      initials: 'VG',
      credentials: 'M.D. Psychiatry · Tele-Consultation',
      city: 'Nashik',
      area: 'Gangapur Road, Nashik',
      experience: '14 yrs experience',
      languages: 'Marathi, Hindi, English',
      specializations: 'Severe Distress · Mood & Sleep Assessment · Clinical Handoff',
      availability: 'Next Slot: Today, 7:15 PM',
      availableNow: false,
    },
  ];

  // =========================================================================
  // Application State
  // =========================================================================
  const state = {
    session: null, // { id, email, isGuest }
    model: DEFAULT_MODEL,
    chats: [],
    activeChatId: null,
    stressLogs: [],
    activeTab: 'chat',
    isSending: false,
    currentIntakeDraft: {
      mood: 'Anxious',
      concern: 'Academics',
      language: 'English',
      style: 'Empathetic Listener',
    },
    noteData: null,
    // Relief Games state
    breathing: {
      running: false,
      phaseIndex: 0, // 0: Inhale 4s, 1: Hold 7s, 2: Exhale 8s
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
    // Video modal state
    video: {
      consultant: null,
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
  // Utility Helpers
  // =========================================================================
  function generateId(prefix = 'id') {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  }

  function simpleHash(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i += 1) {
      hash = (hash * 33) ^ str.charCodeAt(i);
    }
    return (hash >>> 0).toString(16);
  }

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

  function renderFormattedMarkdown(rawText) {
    const escaped = escapeHtml(rawText || '');
    const lines = escaped.split(/\r?\n/);
    const htmlParts = [];
    let inList = null; // 'ul' | 'ol'

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
  // LocalStorage Data Layer (User-Scoped)
  // =========================================================================
  function getUserChatsKey(userId) {
    return `stillmind_chats_${userId}`;
  }

  function getUserStressKey(userId) {
    return `stillmind_stress_${userId}`;
  }

  function loadGlobalSettings() {
    const savedModel = localStorage.getItem(STORAGE_KEYS.MODEL);
    state.model =
      savedModel === 'gemini-4-hydrogen' || savedModel === 'gemini-3.1-flash-lite'
        ? savedModel
        : DEFAULT_MODEL;
    els.geminiModelSelect.value = state.model;
    updateModelIndicators();
  }

  function updateModelIndicators() {
    if (els.modelStatusLabel) {
      els.modelStatusLabel.textContent = `Model: ${state.model}`;
    }
  }

  function loadUserWorkspaceData() {
    if (!state.session) return;
    const userId = state.session.id;
    state.chats = safeJsonParse(localStorage.getItem(getUserChatsKey(userId)), []);
    state.stressLogs = safeJsonParse(localStorage.getItem(getUserStressKey(userId)), []);

    if (state.chats.length > 0) {
      state.activeChatId = state.chats[0].id;
    } else {
      state.activeChatId = null;
    }

    els.userIdentityLabel.textContent = state.session.isGuest
      ? `Anonymous Guest (${state.session.id.slice(-4).toUpperCase()})`
      : state.session.email;

    renderChatHistory();
    renderStressHistory();
    renderActiveChatPanel();
  }

  function persistChats() {
    if (!state.session) return;
    localStorage.setItem(getUserChatsKey(state.session.id), JSON.stringify(state.chats));
  }

  function persistStressLogs() {
    if (!state.session) return;
    localStorage.setItem(getUserStressKey(state.session.id), JSON.stringify(state.stressLogs));
  }

  // =========================================================================
  // Account & Session Modal Logic
  // =========================================================================
  function openAuthModal(allowClose = true) {
    els.authError.textContent = '';
    els.geminiModelSelect.value = state.model;
    els.closeAuthModalBtn.classList.toggle('hidden', !allowClose);
    els.authModal.classList.remove('hidden');
  }

  function closeAuthModal() {
    if (!state.session) return;
    els.authModal.classList.add('hidden');
  }

  function completeSignIn(sessionObj) {
    state.session = sessionObj;
    localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, JSON.stringify(sessionObj));
    els.authModal.classList.add('hidden');
    loadUserWorkspaceData();
  }

  function handlePseudonymousLogin(e) {
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

    const users = safeJsonParse(localStorage.getItem(STORAGE_KEYS.USERS), {});
    const passHash = simpleHash(password);

    if (users[email]) {
      if (users[email].passHash !== passHash) {
        els.authError.textContent = 'Incorrect password for this local account.';
        return;
      }
      completeSignIn({ id: users[email].id, email, isGuest: false });
      showToast('Signed in to private local account');
    } else {
      const userId = `u_${simpleHash(email)}`;
      users[email] = { id: userId, email, passHash, createdAt: new Date().toISOString() };
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
      completeSignIn({ id: userId, email, isGuest: false });
      showToast('Created private local account');
    }
  }

  function handleGuestLogin() {
    const existingGuestId = localStorage.getItem('stillmind_guest_id') || generateId('guest');
    localStorage.setItem('stillmind_guest_id', existingGuestId);
    completeSignIn({ id: existingGuestId, email: 'Anonymous Guest', isGuest: true });
    showToast('Entered as Anonymous Guest');
  }

  function handleSignOut() {
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);
    state.session = null;
    state.chats = [];
    state.activeChatId = null;
    state.stressLogs = [];
    state.noteData = null;
    els.authPassword.value = '';
    openAuthModal(false);
  }

  // =========================================================================
  // Pre-Screening Intake & Chat Session Management
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
    closeMobileSidebar();
  }

  function getLocalizedWelcomeMessage(intake) {
    const { mood, concern, language, style } = intake;
    const isPractical = style === 'Practical Coping Exercises';

    if (language === 'Hindi') {
      return isPractical
        ? `नमस्ते। StillMind में आपका स्वागत है। आपने बताया कि आप अभी **${mood}** महसूस कर रहे हैं और **${concern}** को लेकर चिंतित हैं।\n\nहम छोटे, व्यावहारिक कदमों से शुरुआत कर सकते हैं। क्या आप बताना चाहेंगे कि इस समय सबसे ज़्यादा दबाव किस बात से महसूस हो रहा है?`
        : `नमस्ते। मैं आपकी बात बिना किसी जजमेंट के सुनने के लिए यहाँ हूँ। **${concern}** के कारण **${mood}** महसूस करना पूरी तरह स्वाभाविक है।\n\nजब भी आप सहज हों, जो मन में चल रहा है वह साझा करें।`;
    }

    if (language === 'Marathi') {
      return isPractical
        ? `नमस्कार. StillMind मध्ये तुमचे स्वागत आहे. तुम्ही सध्या **${mood}** वाटत असल्याचे आणि **${concern}** बद्दल विचार करत असल्याचे नमूद केले आहे.\n\nआपण सोप्या आणि व्यावहारिक उपायांपासून सुरुवात करू शकतो. सध्या नेमका कशाचा जास्त ताण येत आहे ते सांगाल का?`
        : `नमस्कार. मी तुमचे म्हणणे शांतपणे आणि कोणताही न्याय न करता ऐकण्यासाठी येथे आहे. **${concern}** मुळे **${mood}** वाटणे समजण्यासारखे आहे.\n\nतुम्हाला जे वाटते आहे ते मोकळेपणाने शेअर करा.`;
    }

    return isPractical
      ? `Welcome to StillMind. Thank you for sharing that you're feeling **${mood.toLowerCase()}** around **${concern.toLowerCase()}**.\n\nSince you prefer practical coping exercises, we can break things down into manageable steps together. What feels like the heaviest part right now?`
      : `Welcome to StillMind. I'm glad you're taking a quiet moment for yourself. Feeling **${mood.toLowerCase()}** when navigating **${concern.toLowerCase()}** is completely understandable.\n\nTake your time—what's been weighing on your mind today?`;
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

  function handleIntakeSubmit(e) {
    e.preventDefault();
    const intake = { ...state.currentIntakeDraft };
    const existing = getActiveChat();

    if (existing) {
      existing.intake = intake;
      existing.updatedAt = new Date().toISOString();
      persistChats();
      renderChatHistory();
      renderActiveChatPanel();
      showToast('Check-in preferences updated');
      return;
    }

    const newChat = {
      id: generateId('chat'),
      title: `${intake.concern} Check-In`,
      intake,
      crisisLocked: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [
        {
          id: generateId('msg'),
          role: 'assistant',
          text: getLocalizedWelcomeMessage(intake),
          timestamp: new Date().toISOString(),
        },
      ],
    };

    state.chats.unshift(newChat);
    state.activeChatId = newChat.id;
    persistChats();
    renderChatHistory();
    renderActiveChatPanel();
  }

  function selectChat(chatId) {
    state.activeChatId = chatId;
    state.noteData = null;
    switchTab('chat');
    renderChatHistory();
    renderActiveChatPanel();
    closeMobileSidebar();
  }

  function deleteChat(chatId) {
    state.chats = state.chats.filter((c) => c.id !== chatId);
    if (state.activeChatId === chatId) {
      state.activeChatId = state.chats.length > 0 ? state.chats[0].id : null;
    }
    persistChats();
    renderChatHistory();
    renderActiveChatPanel();
    showToast('Conversation deleted');
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

    // Crisis lock UI
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
  // Crisis Guardrail & Gemini REST API Integration
  // =========================================================================
  function detectCrisisKeywords(text) {
    if (!text) return false;
    return CRISIS_PATTERNS.some((pattern) => pattern.test(text));
  }

  function buildSystemInstruction(chat) {
    const { mood, concern, language, style } = chat.intake;
    const latestStress = state.stressLogs.length > 0 ? state.stressLogs[0].score : null;
    const stressLine = latestStress !== null ? `Latest logged stress level: ${latestStress}/10.` : 'No stress check-in logged yet.';

    return [
      'You are StillMind, a calm, culturally sensitive mental health support and pre-consultation companion.',
      'Your role is supportive reflection and preparation for human counseling—never diagnose medical conditions or prescribe medication.',
      `User Check-In Profile:`,
      `- Current Mood: ${mood}`,
      `- Primary Concern: ${concern}`,
      `- Preferred Language: ${language} (You MUST reply naturally and warmly in ${language}. If Hindi, use clear Hindi Devanagari or gentle conversational Hindi; if Marathi, use natural Marathi Devanagari.)`,
      `- Support Style: ${style}`,
      `- ${stressLine}`,
      style === 'Practical Coping Exercises'
        ? 'Prioritize grounded, step-by-step coping techniques (such as box breathing, cognitive reframing, or 5-4-3-2-1 sensory grounding) tailored to their concern.'
        : 'Prioritize empathetic validation, reflective listening, gentle open-ended questions, and emotional warmth.',
      'Keep responses concise (2–4 short paragraphs or bullet points), clear, and soothing.',
    ].join('\n');
  }

  async function callGeminiChatStream({ systemInstruction, contents, onChunk }) {
    const response = await fetch('/api/gemini/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction,
        contents,
        model: state.model,
      }),
    });

    if (!response.ok) {
      const errPayload = await response.json().catch(() => ({}));
      const err = new Error(errPayload.error || `Server error (HTTP ${response.status})`);
      err.code = errPayload.code || 'UPSTREAM_ERROR';
      throw err;
    }

    if (!response.body) {
      const fallbackRes = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemInstruction, contents, model: state.model }),
      });
      const fallbackData = await fallbackRes.json().catch(() => ({}));
      if (!fallbackRes.ok) {
        throw new Error(fallbackData.error || `Server error (HTTP ${fallbackRes.status})`);
      }
      onChunk(fallbackData.text || '');
      return fallbackData.text || '';
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const events = buffer.split('\n\n');
      buffer = events.pop() || '';

      for (const evt of events) {
        const line = evt
          .split('\n')
          .find((l) => l.startsWith('data: '));
        if (!line) continue;
        const payload = safeJsonParse(line.slice(6), null);
        if (!payload) continue;
        if (payload.error) {
          const err = new Error(payload.error);
          err.code = payload.code || 'UPSTREAM_ERROR';
          throw err;
        }
        if (payload.chunk) {
          fullText += payload.chunk;
          onChunk(fullText);
        }
      }
    }

    if (!fullText.trim()) {
      throw new Error('Empty response from StillMind AI.');
    }
    return fullText;
  }

  async function callGeminiNote({ systemInstruction, prompt }) {
    const response = await fetch('/api/gemini/note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction,
        prompt,
        model: state.model,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const err = new Error(payload.error || `Server error (HTTP ${response.status})`);
      err.code = payload.code || 'UPSTREAM_ERROR';
      throw err;
    }
    return payload.text || '';
  }

  async function submitChatMessage(rawText) {
    const chat = getActiveChat();
    if (!chat || state.isSending || chat.crisisLocked) return;

    const text = rawText.trim();
    if (!text) return;

    // 1. Add user message & auto-title if first user message
    const hadUserMsgs = chat.messages.some((m) => m.role === 'user');
    chat.messages.push({
      id: generateId('msg'),
      role: 'user',
      text,
      timestamp: new Date().toISOString(),
    });
    if (!hadUserMsgs) {
      chat.title = text.length > 38 ? `${text.slice(0, 38).trim()}...` : text;
    }
    chat.updatedAt = new Date().toISOString();

    els.chatInput.value = '';
    els.chatInput.style.height = 'auto';

    // 2. Crisis Detection Check BEFORE server Gemini API Call
    if (detectCrisisKeywords(text)) {
      chat.crisisLocked = true;
      chat.messages.push({
        id: generateId('msg'),
        role: 'assistant',
        text: 'I hear how much pain you are carrying right now. Because your safety matters most, I have paused AI chat so you can connect directly with trained crisis support (**Tele-MANAS: 14416 / 1800-891-4416** or **Vandrevala Foundation: +91 9999 666 555**) or a Maharashtra counselor.',
        timestamp: new Date().toISOString(),
      });
      persistChats();
      renderChatHistory();
      renderActiveChatPanel();
      return;
    }

    // 3. Stream reply from Server Gemini API
    state.isSending = true;
    const contents = chat.messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }],
      }));

    let streamingMsg = null;
    persistChats();
    renderChatHistory();
    renderActiveChatPanel();

    try {
      await callGeminiChatStream({
        systemInstruction: buildSystemInstruction(chat),
        contents,
        onChunk: (partialText) => {
          if (!streamingMsg) {
            streamingMsg = {
              id: generateId('msg'),
              role: 'assistant',
              text: partialText,
              timestamp: new Date().toISOString(),
            };
            chat.messages.push(streamingMsg);
            state.isSending = false;
          } else {
            streamingMsg.text = partialText;
          }
          chat.updatedAt = new Date().toISOString();
          renderMessages(chat);
        },
      });
    } catch (error) {
      if (streamingMsg && !streamingMsg.text.trim()) {
        chat.messages = chat.messages.filter((m) => m.id !== streamingMsg.id);
      }
      chat.messages.push({
        id: generateId('msg'),
        role: 'system-error',
        text: error.message || 'Unable to generate a response right now. Please try again shortly.',
        timestamp: new Date().toISOString(),
      });
    } finally {
      state.isSending = false;
      persistChats();
      renderChatHistory();
      renderActiveChatPanel();
    }
  }

  // =========================================================================
  // Stress-Level Tracker (1-10)
  // =========================================================================
  function getStressDescriptor(score) {
    if (score <= 3) {
      return { emoji: '😌', label: 'Calm / Low Stress', color: '#2E6F65' };
    }
    if (score <= 6) {
      return { emoji: '😐', label: 'Moderate Tension', color: '#B45309' };
    }
    if (score <= 8) {
      return { emoji: '😟', label: 'Elevated Stress', color: '#C2410C' };
    }
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

  function handleLogStress() {
    const score = Number(els.stressSlider.value);
    state.stressLogs.unshift({
      id: generateId('stress'),
      score,
      timestamp: new Date().toISOString(),
    });
    if (state.stressLogs.length > 30) {
      state.stressLogs = state.stressLogs.slice(0, 30);
    }
    persistStressLogs();
    renderStressHistory();
    showToast(`Logged stress check-in: ${score}/10`);
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
    const avg = (
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
      y: startAtBottom ? height + r + Math.random() * 30 : r + Math.random() * Math.max(40, height - r * 2),
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

    // Update & draw bubbles
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

      // Soft highlight arc
      ctx.beginPath();
      ctx.arc(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.22, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.fill();
    });

    // Update & draw ripples
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
  // Pre-Consultation Note Generator (Gemini + Offline Fallback)
  // =========================================================================
  function buildFallbackClinicalNote(chat) {
    const intake = chat ? chat.intake : state.currentIntakeDraft;
    const latestStress = state.stressLogs.length > 0 ? state.stressLogs[0].score : null;
    const avgStress =
      state.stressLogs.length > 0
        ? (
            state.stressLogs.reduce((sum, s) => sum + s.score, 0) / state.stressLogs.length
          ).toFixed(1)
        : null;

    const userMessages = chat
      ? chat.messages.filter((m) => m.role === 'user').map((m) => m.text)
      : [];

    const chiefConcernText =
      userMessages.length > 0
        ? `Primary area reported as ${intake.concern}. User shared: "${userMessages[0].slice(
            0,
            180
          )}${userMessages[0].length > 180 ? '...' : ''}"`
        : `Primary area selected during pre-screening: ${intake.concern}. No detailed conversation messages recorded yet.`;

    const emotionalStateText = chat?.crisisLocked
      ? `${intake.mood} with flagged high-distress / crisis phrasing during session. Immediate safety helpline resources were presented.`
      : `Self-reported current mood is ${intake.mood} (preferred communication in ${intake.language}).`;

    const stressScoreText =
      latestStress !== null
        ? `Latest check-in: ${latestStress}/10 (${getStressDescriptor(latestStress).label}). Session average across ${state.stressLogs.length} log(s): ${avgStress}/10.`
        : 'No numeric stress check-ins logged yet (recommend collecting baseline 1–10 rating at session start).';

    const triggersList = [];
    const combinedText = userMessages.join(' ').toLowerCase();
    if (/exam|study|college|grade|academic|assignment/.test(combinedText) || intake.concern === 'Academics') {
      triggersList.push('Academic workload, deadlines, or performance expectations');
    }
    if (/job|work|boss|career|interview|office/.test(combinedText) || intake.concern === 'Career') {
      triggersList.push('Career direction or workplace pressure');
    }
    if (/family|partner|friend|relationship|alone|fight/.test(combinedText) || intake.concern === 'Relationships') {
      triggersList.push('Interpersonal communication or relationship strain');
    }
    if (/sleep|insomnia|tired|night|wake/.test(combinedText) || intake.concern === 'Sleep') {
      triggersList.push('Disrupted sleep schedule or nighttime restlessness');
    }
    if (triggersList.length === 0) {
      triggersList.push(`Ongoing ${intake.concern.toLowerCase()} pressures impacting daily calm`);
    }

    const focusAreas = [
      intake.style === 'Practical Coping Exercises'
        ? 'Introduce structured grounding and actionable coping routines'
        : 'Provide supportive reflective listening and emotional validation',
      `Explore coping strategies tailored to ${intake.concern.toLowerCase()}`,
      `Conduct consultation in ${intake.language} to support comfort and clarity`,
    ];

    if (chat?.crisisLocked || (latestStress !== null && latestStress >= 8)) {
      focusAreas.unshift('Prioritize immediate safety assessment and stabilization plan');
    }

    return {
      source: 'Offline Structured Summary (Local Fallback)',
      generatedAt: new Date().toISOString(),
      intake,
      chiefConcerns: chiefConcernText,
      emotionalState: emotionalStateText,
      stressScore: stressScoreText,
      keyTriggers: triggersList,
      suggestedFocusAreas: focusAreas,
    };
  }

  async function handleGenerateNote() {
    switchTab('note');
    const chat = getActiveChat();

    els.noteEmptyState.classList.add('hidden');
    els.noteOutputContainer.classList.add('hidden');
    els.noteStatusBar.classList.add('hidden');
    els.noteLoadingState.classList.remove('hidden');

    let noteResult = null;

    if (chat && chat.messages.some((m) => m.role === 'user')) {
      try {
        const latestStress = state.stressLogs.length > 0 ? `${state.stressLogs[0].score}/10` : 'Not logged';
        const transcript = chat.messages
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .map((m) => `${m.role === 'user' ? 'Client' : 'Assistant'}: ${m.text}`)
          .join('\n');

        const prompt = [
          'Generate a concise, objective Pre-Consultation Clinical Summary Note in valid JSON based on this check-in and transcript.',
          `Profile: Mood=${chat.intake.mood}, Concern=${chat.intake.concern}, Language=${chat.intake.language}, Preferred Style=${chat.intake.style}, Latest Stress=${latestStress}, Crisis Flag=${Boolean(chat.crisisLocked)}`,
          'Transcript:',
          transcript,
          'Return strictly JSON with keys: "chiefConcerns" (string), "emotionalState" (string), "stressScore" (string), "keyTriggers" (array of 2-4 concise strings), "suggestedFocusAreas" (array of 2-4 concise strings). Always write the clinical note in clear professional English.',
        ].join('\n\n');

        const rawJson = await callGeminiNote({
          systemInstruction:
            'You are a clinical documentation assistant creating structured, non-diagnostic pre-consultation briefs for counselors.',
          prompt,
        });

        const parsed = JSON.parse(rawJson.replace(/^```json\s*|\s*```$/g, '').trim());
        noteResult = {
          source: `Gemini AI (${state.model})`,
          generatedAt: new Date().toISOString(),
          intake: chat.intake,
          chiefConcerns: parsed.chiefConcerns || 'See conversation summary.',
          emotionalState: parsed.emotionalState || chat.intake.mood,
          stressScore: parsed.stressScore || latestStress,
          keyTriggers: Array.isArray(parsed.keyTriggers) ? parsed.keyTriggers : [],
          suggestedFocusAreas: Array.isArray(parsed.suggestedFocusAreas)
            ? parsed.suggestedFocusAreas
            : [],
        };
      } catch {
        // Automatic offline/fallback generator if offline or API fails
        noteResult = buildFallbackClinicalNote(chat);
      }
    } else {
      noteResult = buildFallbackClinicalNote(chat);
    }

    state.noteData = noteResult;
    renderClinicalNote();
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

  function handleDownloadNote() {
    if (!state.noteData) return;
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

  // =========================================================================
  // Maharashtra Consultant Directory & Video Preview Modal
  // =========================================================================
  function renderConsultants() {
    const cityVal = els.cityFilter.value;
    const availVal = els.availabilityFilter.value;

    const filtered = MAHARASHTRA_CONSULTANTS.filter((c) => {
      const matchCity = cityVal === 'All' || c.city === cityVal;
      const matchAvail =
        availVal === 'All' ||
        (availVal === 'Available Now' && c.availableNow) ||
        (availVal === 'Today' && (c.availableNow || c.availability.includes('Today')));
      return matchCity && matchAvail;
    });

    els.consultantsGrid.innerHTML = '';

    if (filtered.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'surface-card';
      empty.innerHTML =
        '<p class="section-desc">No counselors match this city and availability filter. Try selecting All Cities.</p>';
      els.consultantsGrid.appendChild(empty);
      return;
    }

    filtered.forEach((c) => {
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

  function openVideoModal(consultant) {
    stopVideoCallTimer();
    state.video.consultant = consultant;
    state.video.connected = false;
    state.video.seconds = 0;
    state.video.micOn = true;
    state.video.camOn = false;
    updateVideoModalUI();
    els.videoModal.classList.remove('hidden');
  }

  function startVideoCall() {
    if (state.video.connected) return;
    if (els.shareNoteToggle.checked && !state.noteData) {
      state.noteData = buildFallbackClinicalNote(getActiveChat());
      renderClinicalNote();
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
    // Sidebar toggles
    els.openSidebarBtn.addEventListener('click', toggleSidebar);
    els.collapseSidebarBtn.addEventListener('click', toggleSidebar);
    els.sidebarBackdrop.addEventListener('click', closeMobileSidebar);

    // Auth & Settings Modal
    els.openSettingsBtn.addEventListener('click', () => openAuthModal(true));
    els.closeAuthModalBtn.addEventListener('click', closeAuthModal);
    els.geminiModelSelect.addEventListener('change', () => {
      state.model = els.geminiModelSelect.value;
      localStorage.setItem(STORAGE_KEYS.MODEL, state.model);
      updateModelIndicators();
      showToast(`Switched model to ${state.model}`);
    });
    els.loginForm.addEventListener('submit', handlePseudonymousLogin);
    els.guestLoginBtn.addEventListener('click', handleGuestLogin);
    els.signOutBtn.addEventListener('click', handleSignOut);

    // Navigation Tabs
    els.tabButtons.forEach((btn) => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Helplines Modal
    els.topHelplineBtn.addEventListener('click', () => els.helplineModal.classList.remove('hidden'));
    els.closeHelplineModalBtn.addEventListener('click', () =>
      els.helplineModal.classList.add('hidden')
    );
    els.helplineToConsultantsBtn.addEventListener('click', () => {
      els.helplineModal.classList.add('hidden');
      switchTab('consultants');
    });

    // New Chat & Intake
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

    // Crisis Banner Actions
    els.connectCounselorNowBtn.addEventListener('click', () => {
      switchTab('consultants');
      const firstAvailable =
        MAHARASHTRA_CONSULTANTS.find((c) => c.availableNow) || MAHARASHTRA_CONSULTANTS[0];
      if (firstAvailable) {
        openVideoModal(firstAvailable);
      }
    });

    els.unlockChatBtn.addEventListener('click', () => {
      const chat = getActiveChat();
      if (!chat) return;
      chat.crisisLocked = false;
      persistChats();
      renderActiveChatPanel();
      showToast('Chat unlocked. Crisis helplines remain accessible in the top bar.');
    });

    // Chat Composer
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

    // Stress Tracker
    els.stressSlider.addEventListener('input', updateStressSliderPreview);
    els.logStressBtn.addEventListener('click', handleLogStress);

    // Relief Mini-Games
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

    // Pre-Consultation Note
    els.generateNoteBtn.addEventListener('click', handleGenerateNote);
    els.emptyGenerateNoteBtn.addEventListener('click', handleGenerateNote);
    els.copyNoteBtn.addEventListener('click', handleCopyNote);
    els.downloadNoteBtn.addEventListener('click', handleDownloadNote);

    // Consultants Filters
    els.cityFilter.addEventListener('change', renderConsultants);
    els.availabilityFilter.addEventListener('change', renderConsultants);

    // Video Modal Controls
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
      state.video.connected = false;
      updateVideoModalUI();
      showToast('Video consultation preview ended');
    });

    // Window Resize
    window.addEventListener('resize', () => {
      if (!isMobileViewport()) {
        closeMobileSidebar();
      }
      if (state.activeTab === 'relief') {
        resizeBubbleCanvas();
      }
    });
  }

  function init() {
    loadGlobalSettings();
    updateStressSliderPreview();
    renderBreathingUI();
    renderConsultants();
    bindEvents();

    const savedSession = safeJsonParse(localStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION), null);
    if (savedSession && savedSession.id) {
      state.session = savedSession;
      els.authModal.classList.add('hidden');
      loadUserWorkspaceData();
    } else {
      openAuthModal(false);
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
