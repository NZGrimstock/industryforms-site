<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Industry Forms — Intelligent Job Management for Trades</title>
<script src="https://cdn.tailwindcss.com"></script>
<script src="https://unpkg.com/lucide@latest"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
<script>
tailwind.config = {
  theme: {
    extend: {
      colors: {
        paper: '#F5F1EB',
        'paper-dark': '#EDE8E0',
        brand: '#E8722A',
        'brand-dark': '#C95D1A',
        teal: '#0D9488',
        'teal-light': '#14B8A6',
        grape: '#7C3AED',
        'grape-light': '#8B5CF6',
        ink: '#1A1A2E',
        'ink-light': '#2D2D44',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Space Grotesk', 'sans-serif'],
      }
    }
  }
}
</script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  body { font-family: 'Inter', sans-serif; background: #F5F1EB; color: #1A1A2E; overflow-x: hidden; }

  /* Paper texture overlay */
  .paper-texture {
    position: fixed; inset: 0; z-index: 0; pointer-events: none; opacity: 0.35;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E");
    background-size: 256px 256px;
  }

  /* Scroll-triggered animations */
  .reveal {
    opacity: 0; transform: translateY(40px);
    transition: opacity 0.9s cubic-bezier(0.16, 1, 0.3, 1), transform 0.9s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .reveal.visible { opacity: 1; transform: translateY(0); }
  .reveal-delay-1 { transition-delay: 0.1s; }
  .reveal-delay-2 { transition-delay: 0.2s; }
  .reveal-delay-3 { transition-delay: 0.3s; }
  .reveal-delay-4 { transition-delay: 0.4s; }
  .reveal-delay-5 { transition-delay: 0.5s; }

  /* Floating ambient shapes */
  @keyframes float1 {
    0%, 100% { transform: translate(0, 0) rotate(0deg); }
    33% { transform: translate(30px, -20px) rotate(5deg); }
    66% { transform: translate(-15px, 15px) rotate(-3deg); }
  }
  @keyframes float2 {
    0%, 100% { transform: translate(0, 0) rotate(0deg); }
    33% { transform: translate(-25px, 25px) rotate(-4deg); }
    66% { transform: translate(20px, -10px) rotate(6deg); }
  }
  @keyframes float3 {
    0%, 100% { transform: translate(0, 0) rotate(0deg); }
    50% { transform: translate(15px, -30px) rotate(8deg); }
  }
  .float-1 { animation: float1 12s ease-in-out infinite; }
  .float-2 { animation: float2 15s ease-in-out infinite; }
  .float-3 { animation: float3 10s ease-in-out infinite; }

  /* Sticky footer scroll */
  .sticky-footer-track {
    display: flex; gap: 0; white-space: nowrap; will-change: transform;
  }
  .sticky-footer-item {
    flex-shrink: 0; display: flex; align-items: center; gap: 12px;
    padding: 0 48px; border-right: 1px solid rgba(255,255,255,0.1);
  }

  /* Feature card hover */
  .feature-card {
    transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.5s ease;
  }
  .feature-card:hover {
    transform: translateY(-6px);
    box-shadow: 0 20px 60px -15px rgba(0,0,0,0.12);
  }

  /* Hero dashboard mockup */
  .dashboard-mockup {
    transition: transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .dashboard-mockup:hover { transform: scale(1.02) rotate(-0.5deg); }

  /* Magnetic button effect */
  .mag-btn {
    transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease;
  }
  .mag-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 30px -5px rgba(232,114,42,0.4); }

  /* Module tag colors */
  .tag-orange { background: rgba(232,114,42,0.1); color: #E8722A; }
  .tag-teal { background: rgba(13,148,136,0.1); color: #0D9488; }
  .tag-grape { background: rgba(124,58,237,0.1); color: #7C3AED; }
  .tag-ink { background: rgba(26,26,46,0.08); color: #1A1A2E; }

  /* Subtle line decoration */
  .line-accent {
    width: 48px; height: 3px; border-radius: 2px; background: #E8722A;
  }

  /* Number counter */
  .counter-value {
    font-variant-numeric: tabular-nums;
  }

  /* Custom scrollbar */
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: #F5F1EB; }
  ::-webkit-scrollbar-thumb { background: #C4BDB3; border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: #A69E94; }

  /* Nav blur */
  .nav-blur {
    backdrop-filter: blur(20px) saturate(1.2);
    -webkit-backdrop-filter: blur(20px) saturate(1.2);
    background: rgba(245,241,235,0.85);
  }

  @media (max-width: 768px) {
    .sticky-footer-item { padding: 0 24px; font-size: 13px; }
  }
</style>
</head>
<body>

<!-- Paper Texture Overlay -->
<div class="paper-texture"></div>

<!-- Floating Ambient Shapes -->
<div class="fixed inset-0 pointer-events-none z-0 overflow-hidden">
  <div class="float-1 absolute top-[15%] left-[8%] w-64 h-64 rounded-full bg-brand/[0.04] blur-3xl"></div>
  <div class="float-2 absolute top-[40%] right-[5%] w-80 h-80 rounded-full bg-teal/[0.04] blur-3xl"></div>
  <div class="float-3 absolute bottom-[25%] left-[20%] w-72 h-72 rounded-full bg-grape/[0.03] blur-3xl"></div>
</div>

<!-- Navigation -->
<nav class="fixed top-0 left-0 right-0 z-50 nav-blur border-b border-black/[0.06]">
  <div class="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
    <!-- Logo -->
    <a href="#" class="flex items-center gap-3 group">
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" class="transition-transform duration-300 group-hover:scale-105">
        <rect x="2" y="2" width="24" height="32" rx="4" fill="#1A1A2E" opacity="0.9"/>
        <rect x="10" y="2" width="24" height="32" rx="4" fill="#E8722A"/>
        <rect x="16" y="10" width="12" height="2" rx="1" fill="white" opacity="0.9"/>
        <rect x="16" y="15" width="8" height="2" rx="1" fill="white" opacity="0.6"/>
        <rect x="16" y="20" width="12" height="2" rx="1" fill="white" opacity="0.9"/>
        <rect x="16" y="25" width="6" height="2" rx="1" fill="white" opacity="0.6"/>
        <path d="M7 12L10 9L13 12" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.7"/>
        <path d="M10 9V17" stroke="white" stroke-width="1.5" stroke-linecap="round" opacity="0.7"/>
      </svg>
      <span class="font-display font-bold text-lg tracking-tight text-ink">Industry Forms</span>
    </a>
    <!-- Nav Links (Desktop) -->
    <div class="hidden md:flex items-center gap-8">
      <a href="#features" class="text-sm font-medium text-ink/60 hover:text-ink transition-colors duration-200">Features</a>
      <a href="#how-it-works" class="text-sm font-medium text-ink/60 hover:text-ink transition-colors duration-200">How It Works</a>
      <a href="#pricing" class="text-sm font-medium text-ink/60 hover:text-ink transition-colors duration-200">Pricing</a>
      <a href="#" class="text-sm font-medium text-ink/60 hover:text-ink transition-colors duration-200">Log In</a>
      <a href="#cta" class="mag-btn bg-ink text-white text-sm font-semibold px-5 py-2.5 rounded-full">Start Free Trial</a>
    </div>
    <!-- Mobile Menu Button -->
    <button id="mobileMenuBtn" class="md:hidden p-2 rounded-lg hover:bg-black/5 transition-colors">
      <i data-lucide="menu" class="w-5 h-5 text-ink"></i>
    </button>
  </div>
  <!-- Mobile Menu -->
  <div id="mobileMenu" class="hidden md:hidden border-t border-black/[0.06] bg-paper/95 backdrop-blur-xl">
    <div class="px-6 py-4 flex flex-col gap-3">
      <a href="#features" class="text-sm font-medium text-ink/70 py-2">Features</a>
      <a href="#how-it-works" class="text-sm font-medium text-ink/70 py-2">How It Works</a>
      <a href="#pricing" class="text-sm font-medium text-ink/70 py-2">Pricing</a>
      <a href="#" class="text-sm font-medium text-ink/70 py-2">Log In</a>
      <a href="#cta" class="mag-btn bg-ink text-white text-sm font-semibold px-5 py-2.5 rounded-full text-center mt-2">Start Free Trial</a>
    </div>
  </div>
</nav>

<!-- ===== HERO ===== -->
<section class="relative z-10 pt-36 md:pt-44 pb-20 md:pb-32 px-6">
  <div class="max-w-7xl mx-auto">
    <div class="max-w-3xl">
      <div class="reveal flex items-center gap-3 mb-8">
        <span class="tag-orange text-xs font-semibold tracking-wider uppercase px-3 py-1.5 rounded-full">For Trades & SMEs</span>
        <span class="text-ink/30 text-xs">•</span>
        <span class="text-ink/50 text-xs font-medium">Now in Beta</span>
      </div>
      <h1 class="reveal reveal-delay-1 font-display font-bold text-5xl md:text-7xl lg:text-8xl tracking-tight leading-[0.95] text-ink mb-8">
        You didn't start a trade to do
        <span class="text-brand">paperwork.</span>
      </h1>
      <p class="reveal reveal-delay-2 text-lg md:text-xl text-ink/60 leading-relaxed max-w-xl mb-10">
        Industry Forms automates your jobs, invoices, scheduling, and compliance — so you can get back on the tools and grow your business.
      </p>
      <div class="reveal reveal-delay-3 flex flex-wrap items-center gap-4">
        <a href="#cta" class="mag-btn bg-brand text-white font-semibold px-8 py-4 rounded-full text-sm inline-flex items-center gap-2">
          Start Free — No Card Needed
          <i data-lucide="arrow-right" class="w-4 h-4"></i>
        </a>
        <a href="#how-it-works" class="inline-flex items-center gap-2 text-sm font-medium text-ink/60 hover:text-ink transition-colors px-4 py-4">
          <i data-lucide="play-circle" class="w-5 h-5"></i>
          Watch 2-min demo
        </a>
      </div>
      <div class="reveal reveal-delay-4 mt-12 flex items-center gap-6">
        <div class="flex -space-x-2">
          <div class="w-8 h-8 rounded-full bg-teal text-white text-xs font-bold flex items-center justify-center ring-2 ring-paper">J</div>
          <div class="w-8 h-8 rounded-full bg-grape text-white text-xs font-bold flex items-center justify-center ring-2 ring-paper">M</div>
          <div class="w-8 h-8 rounded-full bg-brand text-white text-xs font-bold flex items-center justify-center ring-2 ring-paper">S</div>
          <div class="w-8 h-8 rounded-full bg-ink text-white text-xs font-bold flex items-center justify-center ring-2 ring-paper">K</div>
        </div>
        <p class="text-xs text-ink/50"><span class="font-semibold text-ink/70">2,400+</span> tradespeople already saving time</p>
      </div>
    </div>

    <!-- Dashboard Mockup -->
    <div class="reveal reveal-delay-5 mt-16 md:mt-20 dashboard-mockup relative">
      <div class="bg-white rounded-2xl shadow-[0_25px_80px_-20px_rgba(0,0,0,0.15)] border border-black/[0.06] overflow-hidden">
        <!-- Mockup Top Bar -->
        <div class="flex items-center gap-2 px-5 py-3.5 border-b border-black/[0.06] bg-paper-dark/50">
          <div class="w-3 h-3 rounded-full bg-red-400/70"></div>
          <div class="w-3 h-3 rounded-full bg-yellow-400/70"></div>
          <div class="w-3 h-3 rounded-full bg-green-400/70"></div>
          <span class="ml-3 text-xs text-ink/30 font-medium">app.industryforms.com</span>
        </div>
        <!-- Mockup Content -->
        <div class="flex min-h-[400px] md:min-h-[480px]">
          <!-- Sidebar -->
          <div class="hidden md:flex flex-col w-56 border-r border-black/[0.06] bg-paper-dark/30 p-3 gap-0.5 flex-shrink-0">
            <div class="bg-brand text-white text-xs font-semibold px-3 py-2.5 rounded-lg flex items-center gap-2.5 mb-2">
              <i data-lucide="layout-dashboard" class="w-4 h-4"></i>Dashboard
            </div>
            <p class="text-[9px] font-bold tracking-widest text-ink/30 uppercase px-3 pt-3 pb-1">Customers & Jobs</p>
            <div class="text-xs text-ink/60 px-3 py-2 rounded-md hover:bg-black/[0.03] flex items-center gap-2.5"><i data-lucide="folder-kanban" class="w-3.5 h-3.5"></i>Projects</div>
            <div class="text-xs text-ink/60 px-3 py-2 rounded-md hover:bg-black/[0.03] flex items-center gap-2.5"><i data-lucide="message-circle" class="w-3.5 h-3.5"></i>Enquiries</div>
            <div class="text-xs text-ink/60 px-3 py-2 rounded-md hover:bg-black/[0.03] flex items-center gap-2.5"><i data-lucide="users" class="w-3.5 h-3.5"></i>Customers</div>
            <p class="text-[9px] font-bold tracking-widest text-ink/30 uppercase px-3 pt-4 pb-1">Field Work</p>
            <div class="text-xs text-ink/60 px-3 py-2 rounded-md hover:bg-black/[0.03] flex items-center gap-2.5"><i data-lucide="map-pin" class="w-3.5 h-3.5"></i>Job Map</div>
            <div class="text-xs text-ink/60 px-3 py-2 rounded-md hover:bg-black/[0.03] flex items-center gap-2.5"><i data-lucide="calendar" class="w-3.5 h-3.5"></i>Schedule</div>
            <div class="text-xs text-ink/60 px-3 py-2 rounded-md hover:bg-black/[0.03] flex items-center gap-2.5"><i data-lucide="clock" class="w-3.5 h-3.5"></i>Time Logs</div>
            <div class="bg-teal/10 text-teal text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-2.5"><i data-lucide="car" class="w-3.5 h-3.5"></i>Vehicle Logbook</div>
            <p class="text-[9px] font-bold tracking-widest text-ink/30 uppercase px-3 pt-4 pb-1">Finance</p>
            <div class="text-xs text-ink/60 px-3 py-2 rounded-md hover:bg-black/[0.03] flex items-center gap-2.5"><i data-lucide="receipt" class="w-3.5 h-3.5"></i>Invoices</div>
            <div class="text-xs text-ink/60 px-3 py-2 rounded-md hover:bg-black/[0.03] flex items-center gap-2.5"><i data-lucide="file-text" class="w-3.5 h-3.5"></i>Forms</div>
            <div class="bg-grape/10 text-grape text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-2.5"><i data-lucide="bar-chart-3" class="w-3.5 h-3.5"></i>Reports</div>
          </div>
          <!-- Main Content Area -->
          <div class="flex-1 p-6 md:p-8">
            <div class="flex items-center justify-between mb-6">
              <div>
                <p class="text-xs text-ink/40 font-medium">Good morning,</p>
                <p class="text-lg font-display font-bold text-ink">James Plumbing</p>
              </div>
              <div class="flex gap-2">
                <div class="w-8 h-8 rounded-lg bg-black/[0.04] flex items-center justify-center"><i data-lucide="bell" class="w-4 h-4 text-ink/40"></i></div>
                <div class="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center text-brand text-xs font-bold">J</div>
              </div>
            </div>
            <!-- Stat Cards -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div class="bg-paper-dark/60 rounded-xl p-4 border border-black/[0.04]">
                <p class="text-[10px] text-ink/40 font-medium uppercase tracking-wider">Active Jobs</p>
                <p class="text-2xl font-display font-bold text-ink mt-1">12</p>
                <p class="text-[10px] text-teal font-medium mt-1">+3 this week</p>
              </div>
              <div class="bg-paper-dark/60 rounded-xl p-4 border border-black/[0.04]">
                <p class="text-[10px] text-ink/40 font-medium uppercase tracking-wider">Pending Invoices</p>
                <p class="text-2xl font-display font-bold text-ink mt-1">£8.4k</p>
                <p class="text-[10px] text-brand font-medium mt-1">4 to send</p>
              </div>
              <div class="bg-paper-dark/60 rounded-xl p-4 border border-black/[0.04] hidden md:block">
                <p class="text-[10px] text-ink/40 font-medium uppercase tracking-wider">This Week</p>
                <p class="text-2xl font-display font-bold text-ink mt-1">38h</p>
                <p class="text-[10px] text-ink/40 font-medium mt-1">logged</p>
              </div>
              <div class="bg-paper-dark/60 rounded-xl p-4 border border-black/[0.04] hidden md:block">
                <p class="text-[10px] text-ink/40 font-medium uppercase tracking-wider">Enquiries</p>
                <p class="text-2xl font-display font-bold text-grape mt-1">7</p>
                <p class="text-[10px] text-grape font-medium mt-1">2 urgent</p>
              </div>
            </div>
            <!-- Mini Schedule -->
            <div class="bg-paper-dark/60 rounded-xl p-4 border border-black/[0.04]">
              <p class="text-xs font-semibold text-ink mb-3">Today's Schedule</p>
              <div class="space-y-2">
                <div class="flex items-center gap-3 p-2.5 rounded-lg bg-brand/[0.06] border border-brand/10">
                  <div class="w-1 h-8 rounded-full bg-brand"></div>
                  <div class="flex-1">
                    <p class="text-xs font-semibold text-ink">Boiler Repair — Mrs. Thompson</p>
                    <p class="text-[10px] text-ink/40">9:00 AM · 14 Oak Lane</p>
                  </div>
                  <i data-lucide="navigation" class="w-3.5 h-3.5 text-brand"></i>
                </div>
                <div class="flex items-center gap-3 p-2.5 rounded-lg hover:bg-black/[0.02] transition-colors">
                  <div class="w-1 h-8 rounded-full bg-teal"></div>
                  <div class="flex-1">
                    <p class="text-xs font-semibold text-ink">Bathroom Fit — New Build #4</p>
                    <p class="text-[10px] text-ink/40">1:00 PM · 22 Mill Street</p>
                  </div>
                  <i data-lucide="navigation" class="w-3.5 h-3.5 text-ink/20"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <!-- Decorative glow behind mockup -->
      <div class="absolute -inset-4 bg-gradient-to-br from-brand/[0.06] via-transparent to-teal/[0.06] rounded-3xl -z-10 blur-2xl"></div>
    </div>
  </div>
</section>

<!-- ===== PAIN POINTS ===== -->
<section class="relative z-10 py-20 px-6">
  <div class="max-w-7xl mx-auto">
    <div class="reveal text-center max-w-2xl mx-auto mb-16">
      <div class="line-accent mx-auto mb-6"></div>
      <h2 class="font-display font-bold text-3xl md:text-5xl tracking-tight text-ink mb-5">Every hour on admin is an hour not earning.</h2>
      <p class="text-ink/50 text-lg">Spreadsheets, lost invoices, forgotten follow-ups — the hidden costs that eat into your margins every single week.</p>
    </div>
    <div class="grid md:grid-cols-3 gap-6">
      <div class="reveal reveal-delay-1 feature-card bg-white/60 backdrop-blur-sm rounded-2xl p-8 border border-black/[0.05]">
        <div class="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mb-5">
          <i data-lucide="file-x" class="w-6 h-6 text-red-400"></i>
        </div>
        <h3 class="font-display font-bold text-lg text-ink mb-2">Lost Paperwork</h3>
        <p class="text-sm text-ink/50 leading-relaxed">Job sheets left in the van. Invoices that never get sent. Compliance forms that expire. Sound familiar?</p>
      </div>
      <div class="reveal reveal-delay-2 feature-card bg-white/60 backdrop-blur-sm rounded-2xl p-8 border border-black/[0.05]">
        <div class="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center mb-5">
          <i data-lucide="clock" class="w-6 h-6 text-amber-500"></i>
        </div>
        <h3 class="font-display font-bold text-lg text-ink mb-2">12 Hours a Week on Admin</h3>
        <p class="text-sm text-ink/50 leading-relaxed">The average tradesperson loses 12+ hours weekly to scheduling, invoicing, and chasing payments manually.</p>
      </div>
      <div class="reveal reveal-delay-3 feature-card bg-white/60 backdrop-blur-sm rounded-2xl p-8 border border-black/[0.05]">
        <div class="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-5">
          <i data-lucide="puzzle" class="w-6 h-6 text-blue-400"></i>
        </div>
        <h3 class="font-display font-bold text-lg text-ink mb-2">Too Many Tools</h3>
        <p class="text-sm text-ink/50 leading-relaxed">Calendar here, invoices there, maps somewhere else. Nothing talks to anything and you pay for 5 apps.</p>
      </div>
    </div>
  </div>
</section>

<!-- ===== FEATURES ===== -->
<section id="features" class="relative z-10 py-24 px-6">
  <div class="max-w-7xl mx-auto">
    <div class="reveal text-center max-w-2xl mx-auto mb-20">
      <span class="tag-teal text-xs font-semibold tracking-wider uppercase px-3 py-1.5 rounded-full">Everything in One Place</span>
      <h2 class="font-display font-bold text-3xl md:text-5xl tracking-tight text-ink mt-6 mb-5">One system. Every job, end to end.</h2>
      <p class="text-ink/50 text-lg">From first enquiry to final invoice — automated, tracked, and under control.</p>
    </div>

    <!-- Feature Grid - Bento Style -->
    <div class="grid md:grid-cols-3 gap-5">
      <!-- Large Card: Job Management -->
      <div class="reveal reveal-delay-1 md:col-span-2 feature-card bg-white/70 backdrop-blur-sm rounded-2xl p-8 md:p-10 border border-black/[0.05] relative overflow-hidden">
        <div class="absolute top-0 right-0 w-64 h-64 bg-brand/[0.04] rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <span class="tag-orange text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full">Customers & Jobs</span>
        <h3 class="font-display font-bold text-xl md:text-2xl text-ink mt-5 mb-3">Manage every job from enquiry to completion</h3>
        <p class="text-sm text-ink/50 leading-relaxed max-w-md mb-6">Track enquiries, convert to projects, assign teams, and monitor progress — all from a single dashboard. Never lose track of a lead again.</p>
        <div class="flex flex-wrap gap-2">
          <span class="text-[11px] font-medium bg-black/[0.04] text-ink/60 px-3 py-1.5 rounded-full">Projects</span>
          <span class="text-[11px] font-medium bg-black/[0.04] text-ink/60 px-3 py-1.5 rounded-full">Enquiries</span>
          <span class="text-[11px] font-medium bg-black/[0.04] text-ink/60 px-3 py-1.5 rounded-full">Customers</span>
          <span class="text-[11px] font-medium bg-black/[0.04] text-ink/60 px-3 py-1.5 rounded-full">To-Do Lists</span>
        </div>
      </div>

      <!-- Tall Card: Scheduling -->
      <div class="reveal reveal-delay-2 md:row-span-2 feature-card bg-ink rounded-2xl p-8 md:p-10 border border-white/[0.06] relative overflow-hidden flex flex-col justify-between">
        <div>
          <span class="text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full bg-teal/20 text-teal-light">Field Work</span>
          <h3 class="font-display font-bold text-xl md:text-2xl text-white mt-5 mb-3">Smart scheduling & navigation</h3>
          <p class="text-sm text-white/40 leading-relaxed mb-8">See every job on a map, optimise your routes, log time on-site, and track vehicle mileage automatically.</p>
        </div>
        <div class="space-y-3">
          <div class="flex items-center gap-3 text-white/60 text-sm">
            <i data-lucide="map-pin" class="w-4 h-4 text-teal-light"></i>Job Map
          </div>
          <div class="flex items-center gap-3 text-white/60 text-sm">
            <i data-lucide="calendar" class="w-4 h-4 text-teal-light"></i>Schedule
          </div>
          <div class="flex items-center gap-3 text-white/60 text-sm">
            <i data-lucide="clock" class="w-4 h-4 text-teal-light"></i>Time Logs
          </div>
          <div class="flex items-center gap-3 text-white/60 text-sm">
            <i data-lucide="car" class="w-4 h-4 text-teal-light"></i>Vehicle Logbook
          </div>
        </div>
        <div class="absolute bottom-0 right-0 w-48 h-48 bg-teal/[0.08] rounded-full blur-3xl translate-x-1/3 translate-y-1/3"></div>
      </div>

      <!-- Card: Invoicing -->
      <div class="reveal reveal-delay-3 feature-card bg-white/70 backdrop-blur-sm rounded-2xl p-8 border border-black/[0.05]">
        <span class="tag-grape text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full">Finance</span>
        <h3 class="font-display font-bold text-lg text-ink mt-4 mb-2">Invoices that send themselves</h3>
        <p class="text-sm text-ink/50 leading-relaxed mb-5">Auto-generate invoices from completed jobs. Set reminders. Get paid faster with built-in tracking.</p>
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-grape/10 flex items-center justify-center"><i data-lucide="receipt" class="w-4 h-4 text-grape"></i></div>
          <div class="w-8 h-8 rounded-lg bg-grape/10 flex items-center justify-center"><i data-lucide="credit-card" class="w-4 h-4 text-grape"></i></div>
          <div class="w-8 h-8 rounded-lg bg-grape/10 flex items-center justify-center"><i data-lucide="trending-up" class="w-4 h-4 text-grape"></i></div>
        </div>
      </div>

      <!-- Card: Suppliers -->
      <div class="reveal reveal-delay-4 feature-card bg-white/70 backdrop-blur-sm rounded-2xl p-8 border border-black/[0.05]">
        <span class="tag-ink text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full">Suppliers & Orders</span>
        <h3 class="font-display font-bold text-lg text-ink mt-4 mb-2">Purchase orders & bills</h3>
        <p class="text-sm text-ink/50 leading-relaxed mb-5">Manage suppliers, raise POs, track bills, and keep your price lists organised in one place.</p>
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-black/[0.05] flex items-center justify-center"><i data-lucide="package" class="w-4 h-4 text-ink/50"></i></div>
          <div class="w-8 h-8 rounded-lg bg-black/[0.05] flex items-center justify-center"><i data-lucide="file-text" class="w-4 h-4 text-ink/50"></i></div>
          <div class="w-8 h-8 rounded-lg bg-black/[0.05] flex items-center justify-center"><i data-lucide="list" class="w-4 h-4 text-ink/50"></i></div>
        </div>
      </div>

      <!-- Card: Forms -->
      <div class="reveal reveal-delay-5 feature-card bg-white/70 backdrop-blur-sm rounded-2xl p-8 border border-black/[0.05]">
        <span class="tag-orange text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full">Compliance</span>
        <h3 class="font-display font-bold text-lg text-ink mt-4 mb-2">Digital forms & compliance</h3>
        <p class="text-sm text-ink/50 leading-relaxed mb-5">Complete gas certs, electrical checks, PS3's and risk assessments on-site. Signed, stored, and sent instantly.</p>
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center"><i data-lucide="clipboard-check" class="w-4 h-4 text-brand"></i></div>
          <div class="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center"><i data-lucide="pen-tool" class="w-4 h-4 text-brand"></i></div>
          <div class="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center"><i data-lucide="shield-check" class="w-4 h-4 text-brand"></i></div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ===== HOW IT WORKS ===== -->
<section id="how-it-works" class="relative z-10 py-24 px-6 bg-ink overflow-hidden">
  <div class="absolute inset-0 pointer-events-none">
    <div class="float-1 absolute top-[10%] left-[10%] w-96 h-96 bg-brand/[0.06] rounded-full blur-[100px]"></div>
    <div class="float-2 absolute bottom-[10%] right-[10%] w-80 h-80 bg-teal/[0.06] rounded-full blur-[100px]"></div>
  </div>
  <div class="max-w-7xl mx-auto relative">
    <div class="reveal text-center max-w-2xl mx-auto mb-20">
      <span class="text-[10px] font-bold tracking-widest uppercase px-3 py-1.5 rounded-full bg-white/10 text-white/60">How It Works</span>
      <h2 class="font-display font-bold text-3xl md:text-5xl tracking-tight text-white mt-6 mb-5">Three steps to reclaiming your time.</h2>
    </div>
    <div class="grid md:grid-cols-3 gap-8 md:gap-12">
      <div class="reveal reveal-delay-1 text-center md:text-left">
        <div class="w-14 h-14 rounded-2xl bg-brand/20 flex items-center justify-center mb-6 mx-auto md:mx-0">
          <span class="font-display font-bold text-xl text-brand">01</span>
        </div>
        <h3 class="font-display font-bold text-lg text-white mb-3">Import or start fresh</h3>
        <p class="text-sm text-white/40 leading-relaxed">Bring your existing customer list or start from scratch. Set up in under 10 minutes — no IT degree required.</p>
      </div>
      <div class="reveal reveal-delay-2 text-center md:text-left">
        <div class="w-14 h-14 rounded-2xl bg-teal/20 flex items-center justify-center mb-6 mx-auto md:mx-0">
          <span class="font-display font-bold text-xl text-teal-light">02</span>
        </div>
        <h3 class="font-display font-bold text-lg text-white mb-3">Jobs flow automatically</h3>
        <p class="text-sm text-white/40 leading-relaxed">Enquiries become jobs. Jobs trigger schedules. Completed work generates invoices. All hands-free once configured.</p>
      </div>
      <div class="reveal reveal-delay-3 text-center md:text-left">
        <div class="w-14 h-14 rounded-2xl bg-grape/20 flex items-center justify-center mb-6 mx-auto md:mx-0">
          <span class="font-display font-bold text-xl text-grape-light">03</span>
        </div>
        <h3 class="font-display font-bold text-lg text-white mb-3">Watch your business grow</h3>
        <p class="text-sm text-white/40 leading-relaxed">Real-time reports show revenue, job margins, time efficiency, and more. Make decisions with data, not guesswork.</p>
      </div>
    </div>
    <!-- Automation Visual -->
    <div class="reveal mt-20 bg-white/[0.04] backdrop-blur-sm rounded-2xl border border-white/[0.06] p-6 md:p-10 overflow-hidden">
      <div class="flex items-center gap-3 mb-8">
        <div class="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
        <span class="text-xs text-white/40 font-medium">Automation Pipeline — Live</span>
      </div>
      <div class="flex items-center gap-3 md:gap-4 overflow-x-auto pb-4">
        <div class="flex-shrink-0 bg-brand/20 border border-brand/30 rounded-xl px-5 py-3 text-center">
          <i data-lucide="message-circle" class="w-5 h-5 text-brand mx-auto mb-1"></i>
          <p class="text-[10px] text-white/60 font-medium">New Enquiry</p>
        </div>
        <i data-lucide="chevron-right" class="w-4 h-4 text-white/20 flex-shrink-0"></i>
        <div class="flex-shrink-0 bg-orange-500/20 border border-orange-500/30 rounded-xl px-5 py-3 text-center">
          <i data-lucide="check-circle" class="w-5 h-5 text-orange-400 mx-auto mb-1"></i>
          <p class="text-[10px] text-white/60 font-medium">Auto-Quote Sent</p>
        </div>
        <i data-lucide="chevron-right" class="w-4 h-4 text-white/20 flex-shrink-0"></i>
        <div class="flex-shrink-0 bg-yellow-500/20 border border-yellow-500/30 rounded-xl px-5 py-3 text-center">
          <i data-lucide="folder-kanban" class="w-5 h-5 text-yellow-400 mx-auto mb-1"></i>
          <p class="text-[10px] text-white/60 font-medium">Job Created</p>
        </div>
        <i data-lucide="chevron-right" class="w-4 h-4 text-white/20 flex-shrink-0"></i>
        <div class="flex-shrink-0 bg-teal/20 border border-teal/30 rounded-xl px-5 py-3 text-center">
          <i data-lucide="calendar" class="w-5 h-5 text-teal-light mx-auto mb-1"></i>
          <p class="text-[10px] text-white/60 font-medium">Scheduled</p>
        </div>
        <i data-lucide="chevron-right" class="w-4 h-4 text-white/20 flex-shrink-0"></i>
        <div class="flex-shrink-0 bg-blue-500/20 border border-blue-500/30 rounded-xl px-5 py-3 text-center">
          <i data-lucide="clipboard-check" class="w-5 h-5 text-blue-400 mx-auto mb-1"></i>
          <p class="text-[10px] text-white/60 font-medium">Forms Completed</p>
        </div>
        <i data-lucide="chevron-right" class="w-4 h-4 text-white/20 flex-shrink-0"></i>
        <div class="flex-shrink-0 bg-grape/20 border border-grape/30 rounded-xl px-5 py-3 text-center">
          <i data-lucide="receipt" class="w-5 h-5 text-grape-light mx-auto mb-1"></i>
          <p class="text-[10px] text-white/60 font-medium">Invoice Generated</p>
        </div>
        <i data-lucide="chevron-right" class="w-4 h-4 text-white/20 flex-shrink-0"></i>
        <div class="flex-shrink-0 bg-green-500/20 border border-green-500/30 rounded-xl px-5 py-3 text-center">
          <i data-lucide="banknote" class="w-5 h-5 text-green-400 mx-auto mb-1"></i>
          <p class="text-[10px] text-white/60 font-medium">Payment Tracked</p>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ===== TESTIMONIALS ===== -->
<section class="relative z-10 py-24 px-6">
  <div class="max-w-7xl mx-auto">
    <div class="reveal text-center max-w-2xl mx-auto mb-16">
      <div class="line-accent mx-auto mb-6"></div>
      <h2 class="font-display font-bold text-3xl md:text-5xl tracking-tight text-ink">Trusted by trades who were tired of the chaos.</h2>
    </div>
    <div class="grid md:grid-cols-3 gap-6">
      <div class="reveal reveal-delay-1 feature-card bg-white/60 backdrop-blur-sm rounded-2xl p-8 border border-black/[0.05]">
        <div class="flex items-center gap-1 mb-4">
          <i data-lucide="star" class="w-4 h-4 fill-brand text-brand"></i>
          <i data-lucide="star" class="w-4 h-4 fill-brand text-brand"></i>
          <i data-lucide="star" class="w-4 h-4 fill-brand text-brand"></i>
          <i data-lucide="star" class="w-4 h-4 fill-brand text-brand"></i>
          <i data-lucide="star" class="w-4 h-4 fill-brand text-brand"></i>
        </div>
        <p class="text-sm text-ink/60 leading-relaxed mb-6">"I used to spend my Sunday evenings doing invoices. Now they just... happen. Genuinely life-changing for a one-man band like me."</p>
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-teal text-white text-sm font-bold flex items-center justify-center">D</div>
          <div>
            <p class="text-sm font-semibold text-ink">Dave Morrison</p>
            <p class="text-xs text-ink/40">Morrison Electrical</p>
          </div>
        </div>
      </div>
      <div class="reveal reveal-delay-2 feature-card bg-white/60 backdrop-blur-sm rounded-2xl p-8 border border-black/[0.05]">
        <div class="flex items-center gap-1 mb-4">
          <i data-lucide="star" class="w-4 h-4 fill-brand text-brand"></i>
          <i data-lucide="star" class="w-4 h-4 fill-brand text-brand"></i>
          <i data-lucide="star" class="w-4 h-4 fill-brand text-brand"></i>
          <i data-lucide="star" class="w-4 h-4 fill-brand text-brand"></i>
          <i data-lucide="star" class="w-4 h-4 fill-brand text-brand"></i>
        </div>
        <p class="text-sm text-ink/60 leading-relaxed mb-6">"We cancelled three separate subscriptions and replaced them all with Industry Forms. The job map alone saves us 2 hours a day in travel."</p>
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-brand text-white text-sm font-bold flex items-center justify-center">S</div>
          <div>
            <p class="text-sm font-semibold text-ink">Sarah Chen</p>
            <p class="text-xs text-ink/40">Chen Plumbing & Heating</p>
          </div>
        </div>
      </div>
      <div class="reveal reveal-delay-3 feature-card bg-white/60 backdrop-blur-sm rounded-2xl p-8 border border-black/[0.05]">
        <div class="flex items-center gap-1 mb-4">
          <i data-lucide="star" class="w-4 h-4 fill-brand text-brand"></i>
          <i data-lucide="star" class="w-4 h-4 fill-brand text-brand"></i>
          <i data-lucide="star" class="w-4 h-4 fill-brand text-brand"></i>
          <i data-lucide="star" class="w-4 h-4 fill-brand text-brand"></i>
          <i data-lucide="star" class="w-4 h-4 fill-brand text-brand"></i>
        </div>
        <p class="text-sm text-ink/60 leading-relaxed mb-6">"The compliance forms are brilliant. Gas safe certs done on my phone at the job, signed by the customer, and stored forever. No more filing cabinets."</p>
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-grape text-white text-sm font-bold flex items-center justify-center">J</div>
          <div>
            <p class="text-sm font-semibold text-ink">Jake Williams</p>
            <p class="text-xs text-ink/40">JW Gas Services</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ===== PRICING ===== -->
<section id="pricing" class="relative z-10 py-24 px-6 bg-paper-dark/40">
  <div class="max-w-7xl mx-auto">
    <div class="reveal text-center max-w-2xl mx-auto mb-16">
      <span class="tag-orange text-xs font-semibold tracking-wider uppercase px-3 py-1.5 rounded-full">Simple Pricing</span>
      <h2 class="font-display font-bold text-3xl md:text-5xl tracking-tight text-ink mt-6 mb-5">Less than a cup of coffee a day.</h2>
      <p class="text-ink/50 text-lg">No hidden fees. No contracts. Cancel anytime.</p>
    </div>
    <div class="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
      <!-- Solo -->
      <div class="reveal reveal-delay-1 feature-card bg-white/70 backdrop-blur-sm rounded-2xl p-8 md:p-10 border border-black/[0.05]">
        <p class="text-xs font-bold tracking-widest uppercase text-ink/40 mb-4">Solo</p>
        <div class="flex items-baseline gap-1 mb-2">
          <span class="font-display font-bold text-4xl text-ink">$49</span>
          <span class="text-sm text-ink/40">/month</span>
        </div>
        <p class="text-sm text-ink/50 mb-8">Perfect for one-person trades.</p>
        <ul class="space-y-3 mb-8">
          <li class="flex items-center gap-3 text-sm text-ink/70"><i data-lucide="check" class="w-4 h-4 text-teal flex-shrink-0"></i>Unlimited jobs & customers</li>
          <li class="flex items-center gap-3 text-sm text-ink/70"><i data-lucide="check" class="w-4 h-4 text-teal flex-shrink-0"></i>Invoicing & payment tracking</li>
          <li class="flex items-center gap-3 text-sm text-ink/70"><i data-lucide="check" class="w-4 h-4 text-teal flex-shrink-0"></i>Job map & scheduling</li>
          <li class="flex items-center gap-3 text-sm text-ink/70"><i data-lucide="check" class="w-4 h-4 text-teal flex-shrink-0"></i>Digital forms & compliance</li>
          <li class="flex items-center gap-3 text-sm text-ink/70"><i data-lucide="check" class="w-4 h-4 text-teal flex-shrink-0"></i>Vehicle logbook</li>
        </ul>
        <a href="#cta" class="block text-center bg-ink text-white font-semibold text-sm px-6 py-3.5 rounded-full hover:bg-ink-light transition-colors">Start Free Trial</a>
      </div>
      <!-- Team -->
      <div class="reveal reveal-delay-2 feature-card bg-ink rounded-2xl p-8 md:p-10 border border-white/[0.06] relative overflow-hidden">
        <div class="absolute top-4 right-4 bg-brand text-white text-[10px] font-bold tracking-wider uppercase px-3 py-1 rounded-full">Popular</div>
        <p class="text-xs font-bold tracking-widest uppercase text-white/40 mb-4">Team</p>
        <div class="flex items-baseline gap-1 mb-2">
          <span class="font-display font-bold text-4xl text-white">£79</span>
          <span class="text-sm text-white/40">/month</span>
        </div>
        <p class="text-sm text-white/40 mb-8">For growing businesses with a crew.</p>
        <ul class="space-y-3 mb-8">
          <li class="flex items-center gap-3 text-sm text-white/70"><i data-lucide="check" class="w-4 h-4 text-brand flex-shrink-0"></i>Everything in Solo</li>
          <li class="flex items-center gap-3 text-sm text-white/70"><i data-lucide="check" class="w-4 h-4 text-brand flex-shrink-0"></i>Up to 10 team members</li>
          <li class="flex items-center gap-3 text-sm text-white/70"><i data-lucide="check" class="w-4 h-4 text-brand flex-shrink-0"></i>Purchase orders & supplier mgmt</li>
          <li class="flex items-center gap-3 text-sm text-white/70"><i data-lucide="check" class="w-4 h-4 text-brand flex-shrink-0"></i>Advanced reports & analytics</li>
          <li class="flex items-center gap-3 text-sm text-white/70"><i data-lucide="check" class="w-4 h-4 text-brand flex-shrink-0"></i>Client-facing website builder</li>
          <li class="flex items-center gap-3 text-sm text-white/70"><i data-lucide="check" class="w-4 h-4 text-brand flex-shrink-0"></i>Priority support</li>
        </ul>
        <a href="#cta" class="mag-btn block text-center bg-brand text-white font-semibold text-sm px-6 py-3.5 rounded-full">Start Free Trial</a>
      </div>
    </div>
  </div>
</section>

<!-- ===== FINAL CTA ===== -->
<section id="cta" class="relative z-10 py-28 md:py-36 px-6">
  <div class="max-w-3xl mx-auto text-center">
    <div class="reveal">
      <h2 class="font-display font-bold text-3xl md:text-5xl lg:text-6xl tracking-tight text-ink mb-6">Stop losing hours.<br>Start gaining ground.</h2>
      <p class="text-lg text-ink/50 mb-10 max-w-lg mx-auto">Join the many tradespeople who've already reclaimed their time. Free for 28 days — no credit card needed.</p>
      <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
        <div class="flex items-center bg-white/70 backdrop-blur-sm rounded-full border border-black/[0.08] p-1.5 w-full sm:w-auto">
          <input type="email" placeholder="you@yourtrade.com" class="bg-transparent text-sm text-ink placeholder-ink/30 px-4 py-3 w-full sm:w-64 outline-none">
          <button class="mag-btn bg-brand text-white font-semibold text-sm px-6 py-3 rounded-full whitespace-nowrap flex-shrink-0">Start Free Trial</button>
        </div>
      </div>
      <p class="text-xs text-ink/30 mt-4">Free 14-day trial · No credit card · Cancel anytime</p>
    </div>
  </div>
</section>

<!-- ===== FOOTER ===== -->
<footer class="relative z-10 bg-ink border-t border-white/[0.06] pt-16 pb-32 px-6">
  <div class="max-w-7xl mx-auto">
    <div class="grid grid-cols-2 md:grid-cols-5 gap-8 mb-16">
      <!-- Brand -->
      <div class="col-span-2 md:col-span-1">
        <a href="#" class="flex items-center gap-2.5 mb-4">
          <svg width="28" height="28" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="2" width="24" height="32" rx="4" fill="white" opacity="0.15"/>
            <rect x="10" y="2" width="24" height="32" rx="4" fill="#E8722A"/>
            <rect x="16" y="10" width="12" height="2" rx="1" fill="white" opacity="0.9"/>
            <rect x="16" y="15" width="8" height="2" rx="1" fill="white" opacity="0.6"/>
            <rect x="16" y="20" width="12" height="2" rx="1" fill="white" opacity="0.9"/>
            <rect x="16" y="25" width="6" height="2" rx="1" fill="white" opacity="0.6"/>
          </svg>
          <span class="font-display font-bold text-sm text-white">Industry Forms</span>
        </a>
        <p class="text-xs text-white/30 leading-relaxed">Intelligent job management for tradespeople and SMEs.</p>
      </div>
      <!-- Product -->
      <div>
        <p class="text-[10px] font-bold tracking-widest uppercase text-white/30 mb-4">Product</p>
        <ul class="space-y-2.5">
          <li><a href="#features" class="text-sm text-white/50 hover:text-white transition-colors">Features</a></li>
          <li><a href="#pricing" class="text-sm text-white/50 hover:text-white transition-colors">Pricing</a></li>
          <li><a href="#" class="text-sm text-white/50 hover:text-white transition-colors">Integrations</a></li>
          <li><a href="#" class="text-sm text-white/50 hover:text-white transition-colors">Changelog</a></li>
        </ul>
      </div>
      <!-- Solutions -->
      <div>
        <p class="text-[10px] font-bold tracking-widest uppercase text-white/30 mb-4">Solutions</p>
        <ul class="space-y-2.5">
          <li><a href="#" class="text-sm text-white/50 hover:text-white transition-colors">Plumbers</a></li>
          <li><a href="#" class="text-sm text-white/50 hover:text-white transition-colors">Electricians</a></li>
          <li><a href="#" class="text-sm text-white/50 hover:text-white transition-colors">Builders</a></li>
          <li><a href="#" class="text-sm text-white/50 hover:text-white transition-colors">HVAC</a></li>
        </ul>
      </div>
      <!-- Company -->
      <div>
        <p class="text-[10px] font-bold tracking-widest uppercase text-white/30 mb-4">Company</p>
        <ul class="space-y-2.5">
          <li><a href="#" class="text-sm text-white/50 hover:text-white transition-colors">About</a></li>
          <li><a href="#" class="text-sm text-white/50 hover:text-white transition-colors">Blog</a></li>
          <li><a href="#" class="text-sm text-white/50 hover:text-white transition-colors">Careers</a></li>
          <li><a href="#" class="text-sm text-white/50 hover:text-white transition-colors">Contact</a></li>
        </ul>
      </div>
      <!-- Legal -->
      <div>
        <p class="text-[10px] font-bold tracking-widest uppercase text-white/30 mb-4">Legal</p>
        <ul class="space-y-2.5">
          <li><a href="#" class="text-sm text-white/50 hover:text-white transition-colors">Privacy</a></li>
          <li><a href="#" class="text-sm text-white/50 hover:text-white transition-colors">Terms</a></li>
          <li><a href="#" class="text-sm text-white/50 hover:text-white transition-colors">Security</a></li>
          <li><a href="#" class="text-sm text-white/50 hover:text-white transition-colors">GDPR</a></li>
        </ul>
      </div>
    </div>
    <div class="border-t border-white/[0.06] pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
      <p class="text-xs text-white/20">© 2025 Industry Forms. All rights reserved.</p>
      <div class="flex items-center gap-4">
        <a href="#" class="text-white/20 hover:text-white/60 transition-colors"><i data-lucide="twitter" class="w-4 h-4"></i></a>
        <a href="#" class="text-white/20 hover:text-white/60 transition-colors"><i data-lucide="linkedin" class="w-4 h-4"></i></a>
        <a href="#" class="text-white/20 hover:text-white/60 transition-colors"><i data-lucide="instagram" class="w-4 h-4"></i></a>
        <a href="#" class="text-white/20 hover:text-white/60 transition-colors"><i data-lucide="youtube" class="w-4 h-4"></i></a>
      </div>
    </div>
  </div>
</footer>

<!-- ===== STICKY SCROLLING FOOTER ===== -->
<div id="stickyFooter" class="fixed bottom-0 left-0 right-0 z-50 bg-ink border-t border-white/[0.08] overflow-hidden transition-transform duration-500" style="transform: translateY(100%);">
  <div class="py-4">
    <div id="footerTrack" class="sticky-footer-track">
      <!-- Items repeated 3x for seamless loop -->
      <div class="sticky-footer-item">
        <span class="text-white/30 text-xs font-medium tracking-wider uppercase">Save</span>
        <span class="font-display font-bold text-lg text-brand counter-value" data-target="12" data-suffix=" hrs/week">0 hrs/week</span>
        <span class="text-white/30 text-xs">on admin</span>
      </div>
      <div class="sticky-footer-item">
        <span class="text-white/30 text-xs font-medium tracking-wider uppercase">Cut</span>
        <span class="font-display font-bold text-lg text-teal-light counter-value" data-target="85" data-suffix="%">0%</span>
        <span class="text-white/30 text-xs">of paperwork</span>
      </div>
      <div class="sticky-footer-item">
        <span class="text-white/30 text-xs font-medium tracking-wider uppercase">Reduce missed calls by</span>
        <span class="font-display font-bold text-lg text-grape-light counter-value" data-target="90" data-suffix="%">0%</span>
      </div>
      <div class="sticky-footer-item">
        <span class="text-white/30 text-xs font-medium tracking-wider uppercase">Save</span>
        <span class="font-display font-bold text-lg text-brand counter-value" data-target="4200" data-prefix="£" data-suffix="/yr">$0/yr</span>
        <span class="text-white/30 text-xs">on software</span>
      </div>
      <div class="sticky-footer-item">
        <span class="text-white/30 text-xs font-medium tracking-wider uppercase">Eliminate</span>
        <span class="font-display font-bold text-lg text-teal-light">double entry</span>
        <span class="text-white/30 text-xs">forever</span>
      </div>
      <div class="sticky-footer-item">
        <span class="text-white/30 text-xs font-medium tracking-wider uppercase">Get paid</span>
        <span class="font-display font-bold text-lg text-brand counter-value" data-target="2" data-suffix="x faster">0x faster</span>
      </div>
      <div class="sticky-footer-item">
        <span class="text-white/30 text-xs font-medium tracking-wider uppercase">Automate</span>
        <span class="font-display font-bold text-lg text-grape-light">invoicing</span>
        <span class="text-white/30 text-xs">completely</span>
      </div>
      <div class="sticky-footer-item">
        <span class="text-white/30 text-xs font-medium tracking-wider uppercase">Replace</span>
        <span class="font-display font-bold text-lg text-teal-light counter-value" data-target="5" data-suffix=" apps">0 apps</span>
        <span class="text-white/30 text-xs">with one</span>
      </div>
      <!-- Repeat -->
      <div class="sticky-footer-item">
        <span class="text-white/30 text-xs font-medium tracking-wider uppercase">Save</span>
        <span class="font-display font-bold text-lg text-brand counter-value" data-target="12" data-suffix=" hrs/week">0 hrs/week</span>
        <span class="text-white/30 text-xs">on admin</span>
      </div>
      <div class="sticky-footer-item">
        <span class="text-white/30 text-xs font-medium tracking-wider uppercase">Cut</span>
        <span class="font-display font-bold text-lg text-teal-light counter-value" data-target="85" data-suffix="%">0%</span>
        <span class="text-white/30 text-xs">of paperwork</span>
      </div>
      <div class="sticky-footer-item">
        <span class="text-white/30 text-xs font-medium tracking-wider uppercase">Reduce missed calls by</span>
        <span class="font-display font-bold text-lg text-grape-light counter-value" data-target="90" data-suffix="%">0%</span>
      </div>
      <div class="sticky-footer-item">
        <span class="text-white/30 text-xs font-medium tracking-wider uppercase">Save</span>
        <span class="font-display font-bold text-lg text-brand counter-value" data-target="4200" data-prefix="£" data-suffix="/yr">£0/yr</span>
        <span class="text-white/30 text-xs">on software</span>
      </div>
      <div class="sticky-footer-item">
        <span class="text-white/30 text-xs font-medium tracking-wider uppercase">Eliminate</span>
        <span class="font-display font-bold text-lg text-teal-light">double entry</span>
        <span class="text-white/30 text-xs">forever</span>
      </div>
      <div class="sticky-footer-item">
        <span class="text-white/30 text-xs font-medium tracking-wider uppercase">Get paid</span>
        <span class="font-display font-bold text-lg text-brand counter-value" data-target="2" data-suffix="x faster">0x faster</span>
      </div>
      <div class="sticky-footer-item">
        <span class="text-white/30 text-xs font-medium tracking-wider uppercase">Automate</span>
        <span class="font-display font-bold text-lg text-grape-light">invoicing</span>
        <span class="text-white/30 text-xs">completely</span>
      </div>
      <div class="sticky-footer-item">
        <span class="text-white/30 text-xs font-medium tracking-wider uppercase">Replace</span>
        <span class="font-display font-bold text-lg text-teal-light counter-value" data-target="5" data-suffix=" apps">0 apps</span>
        <span class="text-white/30 text-xs">with one</span>
      </div>
      <!-- Repeat 3 -->
      <div class="sticky-footer-item">
        <span class="text-white/30 text-xs font-medium tracking-wider uppercase">Save</span>
        <span class="font-display font-bold text-lg text-brand counter-value" data-target="12" data-suffix=" hrs/week">0 hrs/week</span>
        <span class="text-white/30 text-xs">on admin</span>
      </div>
      <div class="sticky-footer-item">
        <span class="text-white/30 text-xs font-medium tracking-wider uppercase">Cut</span>
        <span class="font-display font-bold text-lg text-teal-light counter-value" data-target="85" data-suffix="%">0%</span>
        <span class="text-white/30 text-xs">of paperwork</span>
      </div>
      <div class="sticky-footer-item">
        <span class="text-white/30 text-xs font-medium tracking-wider uppercase">Reduce missed calls by</span>
        <span class="font-display font-bold text-lg text-grape-light counter-value" data-target="90" data-suffix="%">0%</span>
      </div>
      <div class="sticky-footer-item">
        <span class="text-white/30 text-xs font-medium tracking-wider uppercase">Save</span>
        <span class="font-display font-bold text-lg text-brand counter-value" data-target="4200" data-prefix="£" data-suffix="/yr">£0/yr</span>
        <span class="text-white/30 text-xs">on software</span>
      </div>
      <div class="sticky-footer-item">
        <span class="text-white/30 text-xs font-medium tracking-wider uppercase">Eliminate</span>
        <span class="font-display font-bold text-lg text-teal-light">double entry</span>
        <span class="text-white/30 text-xs">forever</span>
      </div>
      <div class="sticky-footer-item">
        <span class="text-white/30 text-xs font-medium tracking-wider uppercase">Get paid</span>
        <span class="font-display font-bold text-lg text-brand counter-value" data-target="2" data-suffix="x faster">0x faster</span>
      </div>
      <div class="sticky-footer-item">
        <span class="text-white/30 text-xs font-medium tracking-wider uppercase">Automate</span>
        <span class="font-display font-bold text-lg text-grape-light">invoicing</span>
        <span class="text-white/30 text-xs">completely</span>
      </div>
      <div class="sticky-footer-item">
        <span class="text-white/30 text-xs font-medium tracking-wider uppercase">Replace</span>
        <span class="font-display font-bold text-lg text-teal-light counter-value" data-target="5" data-suffix=" apps">0 apps</span>
        <span class="text-white/30 text-xs">with one</span>
      </div>
    </div>
  </div>
</div>

<script>
  // Initialize Lucide icons
  lucide.createIcons();

  // Mobile menu toggle
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  mobileMenuBtn.addEventListener('click', () => {
    mobileMenu.classList.toggle('hidden');
  });
  // Close mobile menu on link click
  mobileMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => mobileMenu.classList.add('hidden'));
  });

  // Scroll reveal animation
  const revealElements = document.querySelectorAll('.reveal');
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
  revealElements.forEach(el => revealObserver.observe(el));

  // Sticky footer: show after scrolling past hero, sync horizontal scroll
  const stickyFooter = document.getElementById('stickyFooter');
  const footerTrack = document.getElementById('footerTrack');
  let footerVisible = false;
  let countersAnimated = false;

  function updateStickyFooter() {
    const scrollY = window.scrollY;
    const docHeight = document.body.scrollHeight - window.innerHeight;
    const scrollPercent = scrollY / docHeight;

    // Show footer after 15% scroll
    if (scrollPercent > 0.15 && !footerVisible) {
      stickyFooter.style.transform = 'translateY(0)';
      footerVisible = true;
    } else if (scrollPercent <= 0.15 && footerVisible) {
      stickyFooter.style.transform = 'translateY(100%)';
      footerVisible = false;
    }

    // Hide footer near actual footer
    const footerTop = document.querySelector('footer').getBoundingClientRect().top;
    if (footerTop < window.innerHeight - 60) {
      stickyFooter.style.transform = 'translateY(100%)';
    } else if (scrollPercent > 0.15) {
      stickyFooter.style.transform = 'translateY(0)';
    }

    // Horizontal scroll sync — move track based on page scroll
    const trackWidth = footerTrack.scrollWidth / 3; // width of one set
    const maxTranslate = trackWidth;
    const translateX = -(scrollPercent * maxTranslate * 1.5);
    footerTrack.style.transform = `translateX(${translateX}px)`;

    // Animate counters when footer first appears
    if (footerVisible && !countersAnimated) {
      countersAnimated = true;
      animateCounters();
    }
  }

  // Counter animation
  function animateCounters() {
    document.querySelectorAll('.counter-value').forEach(el => {
      const target = parseInt(el.dataset.target);
      const prefix = el.dataset.prefix || '';
      const suffix = el.dataset.suffix || '';
      const duration = 1500;
      const start = performance.now();

      function update(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(target * eased);
        el.textContent = prefix + current.toLocaleString() + suffix;
        if (progress < 1) requestAnimationFrame(update);
      }
      requestAnimationFrame(update);
    });
  }

  window.addEventListener('scroll', updateStickyFooter, { passive: true });
  updateStickyFooter();

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
</script>
</body>
</html>