for path in [
    "/data/data/com.termux/files/home/buddy-ai-partners/dist/index.html",
    "/data/data/com.termux/files/home/buddy-ai-partners/index.html"
]:
    with open(path, "r", encoding="utf-8") as f:
        html = f.read()

    upgrade_ui = """
    <!-- UPGRADE: INTERACTIVE ROI SIMULATOR & LIVE AI TERMINAL -->
    <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
      <div class="grid lg:grid-cols-12 gap-8 items-stretch">
        <div class="lg:col-span-6 glass-card rounded-2xl p-6 sm:p-8 border border-sky-500/30 flex flex-col justify-between">
          <div>
            <span class="text-xs font-bold uppercase tracking-widest text-sky-400">INTERACTIVE GROWTH CALCULATOR</span>
            <h3 class="font-display text-2xl sm:text-3xl font-bold text-white mt-1">Estimate Your Monthly Lead Pipeline</h3>
            <p class="text-xs text-slate-400 mt-1 mb-6">Select your business vertical and monthly ad spend to project qualified inquiries.</p>
            <div class="space-y-5">
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-2">1. Select Your Industry</label>
                <select id="roiIndustry" onchange="calcROI()" class="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:border-sky-400 outline-none">
                  <option value="280">Real Estate (Flats, Duplex & Plots)</option>
                  <option value="110">Car Rental & Mobility Fleet</option>
                  <option value="160">Clinics, Healthcare & Aesthetics</option>
                  <option value="190">Local Enterprise & B2B Services</option>
                </select>
              </div>
              <div>
                <div class="flex justify-between text-xs font-semibold mb-2">
                  <span class="text-slate-300">2. Monthly Ad Spend Budget</span>
                  <span id="roiBudgetLabel" class="text-cyan-300 font-mono text-sm">₹30,000 / mo</span>
                </div>
                <input id="roiBudget" type="range" min="15000" max="150000" step="5000" value="30000" oninput="calcROI()" class="w-full accent-sky-400 cursor-pointer" />
              </div>
              <div class="grid grid-cols-3 gap-3 pt-2">
                <div class="p-3.5 rounded-xl bg-slate-900/90 border border-sky-500/20 text-center">
                  <p class="text-[11px] text-slate-400">Est. Monthly Leads</p>
                  <p id="roiLeads" class="font-display text-xl sm:text-2xl font-bold text-sky-400 mt-1">105+</p>
                </div>
                <div class="p-3.5 rounded-xl bg-slate-900/90 border border-cyan-500/20 text-center">
                  <p class="text-[11px] text-slate-400">AI Qualified Visits</p>
                  <p id="roiVisits" class="font-display text-xl sm:text-2xl font-bold text-cyan-300 mt-1">26+</p>
                </div>
                <div class="p-3.5 rounded-xl bg-slate-900/90 border border-emerald-500/20 text-center">
                  <p class="text-[11px] text-slate-400">AI Call Speed</p>
                  <p class="font-display text-xl sm:text-2xl font-bold text-emerald-400 mt-1">&lt; 5s</p>
                </div>
              </div>
            </div>
          </div>
          <button type="button" onclick="sendROIBrief()" class="mt-6 w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-blue-600 to-cyan-400 text-slate-950 shadow-lg hover:scale-[1.01] transition">
            🚀 Lock This Pipeline Target on WhatsApp →
          </button>
        </div>

        <div class="lg:col-span-6 glass-card rounded-2xl p-6 sm:p-8 border border-cyan-500/30 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold uppercase tracking-widest text-cyan-400">LIVE AUTOMATION TELEMETRY</span>
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">● N8N + PLAYWRIGHT READY</span>
            </div>
            <h3 class="font-display text-2xl sm:text-3xl font-bold text-white mt-1">Test Our AI Lead Engine Live</h3>
            <p class="text-xs text-slate-400 mt-1 mb-4">Click below to see how our Python + n8n + CRM pipeline processes an incoming buyer inquiry in real time.</p>
            <div id="aiTerminal" class="bg-[#03060f] border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300 h-52 overflow-y-auto space-y-2">
              <p class="text-sky-400">[SYSTEM] BUDDY AI Super-Brain Telemetry v2.6 initialized...</p>
              <p class="text-slate-400">[READY] Listening for Meta Lead Ads, 99acres & Website Webhooks...</p>
            </div>
          </div>
          <button type="button" onclick="simulateWebhook()" class="mt-6 w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-400/40 transition">
            ⚡ Simulate Live Lead Capture Webhook
          </button>
        </div>
      </div>
    </section>
    <script>
      function calcROI() {
        const cpl = parseInt(document.getElementById('roiIndustry').value, 10);
        const budget = parseInt(document.getElementById('roiBudget').value, 10);
        document.getElementById('roiBudgetLabel').innerText = '₹' + budget.toLocaleString('en-IN') + ' / mo';
        const leads = Math.round(budget / cpl);
        const visits = Math.max(4, Math.round(leads * 0.25));
        document.getElementById('roiLeads').innerText = leads + '+';
        document.getElementById('roiVisits').innerText = visits + '+';
      }
      function sendROIBrief() {
        const indSelect = document.getElementById('roiIndustry');
        const industry = indSelect.options[indSelect.selectedIndex].text;
        const budget = document.getElementById('roiBudgetLabel').innerText;
        const leads = document.getElementById('roiLeads').innerText;
        selectServiceAndContact('Growth Marketing Retainer (₹15k-₹25k/mo)');
        document.getElementById('clientGoal').value = `Industry: ${industry} | Monthly Ad Budget: ${budget} | Target Est. Leads: ${leads}/mo`;
      }
      function simulateWebhook() {
        const term = document.getElementById('aiTerminal');
        const names = ['Subrat Patnaik (Patia, BBSR)', 'Ananya Mohanty (Rasulgarh, BBSR)', 'Vikram Dash (Jayadev Vihar)'];
        const pick = names[Math.floor(Math.random() * names.length)];
        term.innerHTML = `<p class="text-amber-300">⚡ [WEBHOOK] Incoming Lead Payload: ${pick}</p>`;
        setTimeout(() => {
          term.innerHTML += `<p class="text-cyan-300">🤖 [AI FILTER] Intent Score: 94/100 (Verified Buyer Budget)</p>`;
          term.scrollTop = term.scrollHeight;
        }, 450);
        setTimeout(() => {
          term.innerHTML += `<p class="text-emerald-400">✅ [BUDDY CRM] Assigned to Daily Call Queue #1 + WhatsApp Brochure Dispatched (1.8s)</p>`;
          term.scrollTop = term.scrollHeight;
        }, 950);
      }
    </script>
"""
    target = "<!-- QUICK NAVIGATION GATEWAY -->"
    if "INTERACTIVE GROWTH CALCULATOR" not in html and target in html:
        html = html.replace(target, upgrade_ui + "\n    " + target)
        with open(path, "w", encoding="utf-8") as f:
            f.write(html)
print("✅ ROI Calculator & AI Terminal Injected!")
