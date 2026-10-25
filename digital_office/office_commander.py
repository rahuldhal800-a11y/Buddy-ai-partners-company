"""
Buddy AI Partners — Autonomous Digital Office Commander (Bhubaneswar B2B Edition)
Departments:
1. ScoutDept (Finds local businesses in Bhubaneswar without websites/AI automation)
2. MarketingDept (Generates Odia/English WhatsApp pitches, Meta ad copy, SEO audits)
3. SalesDept (Handles inbound/outbound replies, sends UPI/Razorpay proposals, books demos)
4. DeliveryDept (Auto-generates landing pages, WhatsApp bots, and CRM pipelines for clients)
"""
import os, json, time
from pathlib import Path
import urllib.request

class ZeroQuotaRouter:
    """Routes tasks across Groq, NVIDIA NIM, Xiaomi MiMo V2.6, and Colab/Local Buddy without touching AGY quota."""
    def __init__(self):
        self.colab_url = os.getenv("BUDDY_COLAB_ENDPOINT", "")
        self.nvidia_key = os.getenv("NVIDIA_API_KEY", "")
        self.groq_key = os.getenv("GROQ_API_KEY", "")
        self.openai_key = os.getenv("OPENAI_API_KEY", "")

    def complete(self, system_prompt: str, user_prompt: str) -> str:
        providers = []
        if self.colab_url:
            providers.append(("colab-buddy", f"{self.colab_url}/v1/chat/completions", "buddy-b2b-7b", "none"))
        if self.groq_key:
            providers.append(("groq", "https://api.groq.com/openai/v1/chat/completions", "llama-3.3-70b-versatile", self.groq_key))
        if self.nvidia_key:
            providers.append(("nvidia", "https://integrate.api.nvidia.com/v1/chat/completions", "meta/llama-3.1-70b-instruct", self.nvidia_key))
        if self.openai_key:
            providers.append(("openai", "https://api.openai.com/v1/chat/completions", "gpt-4o-mini", self.openai_key))

        for name, url, model, key in providers:
            try:
                payload = json.dumps({
                    "model": model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    "temperature": 0.3
                }).encode("utf-8")
                req = urllib.request.Request(url, data=payload, headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {key}"
                })
                with urllib.request.urlopen(req, timeout=20) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
                    return data["choices"][0]["message"]["content"]
            except Exception:
                continue
        return "[Fallback] Ready to process task via local deterministic templates."

BHUBANESWAR_SERVICE_CATALOG = [
    {"id": "starter-os", "name": "Buddy AI Personal Assistant (1-on-1 Laptop/Mobile Setup)", "setup_inr": 2999, "monthly_inr": 0, "target_corridors": ["Individuals", "Solopreneurs", "Creators", "All Bhubaneswar"]},
    {"id": "clinic-os", "name": "AI Clinic & Hospital Appointment + WhatsApp OS", "setup_inr": 9999, "monthly_inr": 2499, "target_corridors": ["Saheed Nagar", "Nayapalli", "Khandagiri", "Patia"]},
    {"id": "coaching-os", "name": "Coaching Institute AI Admission Telecaller & Lead CRM", "setup_inr": 14999, "monthly_inr": 3499, "target_corridors": ["Jaydev Vihar", "Acharya Vihar", "Patia"]},
    {"id": "restaurant-os", "name": "QR Table Ordering + Automated Google Review & WhatsApp Loyalty", "setup_inr": 7999, "monthly_inr": 1999, "target_corridors": ["Infocity", "Patia", "Saheed Nagar", "Rasulgarh"]},
    {"id": "custom-web-ai", "name": "5-Day Business Website + 24/7 Odia/English AI Sales Chatbot", "setup_inr": 11999, "monthly_inr": 1999, "target_corridors": ["All Bhubaneswar"]},
    {"id": "enterprise-swarm", "name": "Enterprise Custom Software & Autonomous AI Agent Swarm", "setup_inr": 89999, "monthly_inr": 9999, "target_corridors": ["Software Companies", "Enterprises", "Infocity", "Pan-India"]}
]

if __name__ == "__main__":
    print("=== Buddy AI Partners Digital Office Initialized ===")
    for s in BHUBANESWAR_SERVICE_CATALOG:
        print(f" - {s['name']}: ₹{s['setup_inr']} setup + ₹{s['monthly_inr']}/mo ({', '.join(s['target_corridors'])})")
