import Link from "next/link"
import { Header } from "@/components/marketing/header"
import { Footer } from "@/components/marketing/footer"
import { plans } from "@/lib/plans"

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-base-100">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative py-24 lg:py-32 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/4 -left-20 w-72 h-72 bg-primary/30 rounded-full blur-3xl animate-pulse" />
            <div className="absolute top-1/3 right-0 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-pulse delay-700" />
            <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-accent/20 rounded-full blur-3xl animate-pulse delay-1000" />
          </div>

          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-size-[72px_72px] mask-[radial-gradient(ellipse_at_center,black_30%,transparent_70%)]" />

          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-5xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2 mb-8 backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                <span className="text-sm font-medium text-primary">Headless API now available</span>
              </div>

              <h1 className="text-5xl md:text-7xl lg:text-8xl font-black mb-8 leading-[0.95] tracking-tight">
                Build AI Workflows
                <br />
                <span className="text-rotate inline-block">
                  <span className="justify-items-center">
                    <span className="bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent">Visually</span>
                    <span className="bg-linear-to-r from-secondary to-accent bg-clip-text text-transparent">Run via API</span>
                    <span className="bg-linear-to-r from-accent to-primary bg-clip-text text-transparent">At Scale</span>
                  </span>
                </span>
              </h1>

              <p className="text-xl md:text-2xl text-base-content/60 max-w-2xl mx-auto mb-12 leading-relaxed">
                Node Banana is a visual node editor for AI image generation. Build complex pipelines, publish as APIs, and scale with usage-based pricing.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-20">
                <Link href="/editor" className="btn btn-primary btn-lg gap-2 shadow-lg shadow-primary/25 group">
                  <span>Open Editor</span>
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <Link href="/pricing" className="btn btn-ghost btn-lg gap-2 group">
                  <span>View Pricing</span>
                </Link>
              </div>

              {/* Hero visual */}
              <div className="relative max-w-5xl mx-auto">
                <div className="flex flex-col lg:flex-row items-center justify-center gap-8">
                  <div className="relative flex-1 max-w-2xl">
                    <div className="absolute -left-4 -right-4 top-8 bottom-0 bg-base-300/50 rounded-3xl transform rotate-2 border border-base-content/5" />
                    <div className="absolute -left-2 -right-2 top-4 bottom-0 bg-base-200/50 rounded-3xl transform -rotate-1 border border-base-content/5" />
                    <div className="relative bg-base-200 rounded-3xl border border-base-content/10 shadow-2xl overflow-hidden">
                      <div className="aspect-video flex items-center justify-center bg-linear-to-br from-base-200 to-base-300 p-8">
                        <div className="text-center">
                          <div className="text-5xl mb-4">Node Banana</div>
                          <p className="text-base-content/40 text-base font-medium">Visual AI Workflow Editor</p>
                          <p className="text-base-content/30 text-sm mt-2">Drag, connect, generate</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-20">
          <div className="container mx-auto px-4 flex justify-center">
            <div className="stats stats-vertical lg:stats-horizontal shadow-xl bg-base-200/50 border border-base-content/5">
              <div className="stat place-items-center py-8 px-12">
                <div className="stat-figure text-primary">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                  </svg>
                </div>
                <div className="stat-title text-base">Node Types</div>
                <div className="stat-value text-primary text-5xl">7+</div>
                <div className="stat-desc text-sm">Image, prompt, LLM, video & more</div>
              </div>
              <div className="stat place-items-center py-8 px-12">
                <div className="stat-figure text-secondary">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="stat-title text-base">AI Models</div>
                <div className="stat-value text-secondary text-5xl">10+</div>
                <div className="stat-desc text-sm">Gemini, Sora, Veo, Kling & more</div>
              </div>
              <div className="stat place-items-center py-8 px-12">
                <div className="stat-figure text-accent">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="stat-title text-base">Headless API</div>
                <div className="stat-value text-accent text-5xl">REST</div>
                <div className="stat-desc text-sm">Publish & call programmatically</div>
              </div>
            </div>
          </div>
        </section>

        {/* Features - Bento Grid */}
        <section className="py-24 lg:py-32">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <span className="badge badge-primary badge-outline mb-4">Features</span>
              <h2 className="text-4xl md:text-6xl font-black mb-6">
                Everything you need
                <br />
                <span className="text-base-content/40">to automate AI workflows</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
              {/* Large feature card */}
              <div className="md:col-span-2 card bg-linear-to-br from-primary/10 via-base-200 to-base-200 border border-base-content/5 overflow-hidden group hover:border-primary/30 transition-colors">
                <div className="card-body p-8">
                  <div className="flex items-start justify-between mb-6">
                    <div className="p-3 bg-primary/20 rounded-2xl">
                      <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                      </svg>
                    </div>
                    <span className="badge badge-ghost">Visual</span>
                  </div>
                  <h3 className="card-title text-2xl mb-2">Visual Node Editor</h3>
                  <p className="text-base-content/60 mb-6">Drag and drop nodes onto a canvas. Connect image inputs, prompts, AI generators, and outputs into powerful pipelines — no code required.</p>
                  <div className="bg-base-300/50 rounded-xl p-6 text-center">
                    <p className="text-base-content/40">React Flow canvas with typed connections</p>
                  </div>
                </div>
              </div>

              {/* Tall feature card */}
              <div className="md:row-span-2 card bg-linear-to-b from-secondary/10 via-base-200 to-base-200 border border-base-content/5 overflow-hidden group hover:border-secondary/30 transition-colors">
                <div className="card-body p-8 h-full flex flex-col">
                  <div className="p-3 bg-secondary/20 rounded-2xl w-fit mb-6">
                    <svg className="w-8 h-8 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                  </div>
                  <h3 className="card-title text-2xl mb-2">Headless API</h3>
                  <p className="text-base-content/60 mb-8">Publish any workflow as an API endpoint. Call it programmatically from your app, CI/CD pipeline, or automation tools.</p>
                  <div className="flex-1 flex flex-col justify-end">
                    <div className="space-y-3">
                      {["REST API with API key auth", "Async job execution", "Webhook callbacks", "Parameter overrides", "Usage tracking & billing"].map((item, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <svg className="w-5 h-5 text-success" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span className="text-sm">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Small feature cards */}
              <div className="card bg-base-200 border border-base-content/5 hover:border-accent/30 transition-colors group">
                <div className="card-body p-6">
                  <div className="p-3 bg-accent/20 rounded-2xl w-fit mb-4">
                    <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="font-bold text-lg">Multiple AI Models</h3>
                  <p className="text-base-content/60 text-sm">Access Gemini, Sora, Veo, Kling, and more from a single editor. Switch models per node.</p>
                </div>
              </div>

              <div className="card bg-base-200 border border-base-content/5 hover:border-warning/30 transition-colors group">
                <div className="card-body p-6">
                  <div className="p-3 bg-warning/20 rounded-2xl w-fit mb-4">
                    <svg className="w-6 h-6 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h3 className="font-bold text-lg">Usage Tracking</h3>
                  <p className="text-base-content/60 text-sm">Monitor API calls, job counts, and costs per workflow. Stay in control of your spend.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-24 lg:py-32 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(var(--p)/0.1),transparent_50%)]" />

          <div className="container mx-auto px-4 relative z-10">
            <div className="text-center mb-16">
              <span className="badge badge-secondary badge-outline mb-4">How It Works</span>
              <h2 className="text-4xl md:text-5xl font-black mb-4">
                Three steps to automation
              </h2>
              <p className="text-base-content/60 text-lg">From visual design to programmatic execution</p>
            </div>

            <div className="flex justify-center">
              <ul className="steps steps-vertical lg:steps-horizontal steps-lg">
                <li className="step step-primary" data-content="1">
                  <div className="text-left lg:text-center mt-6 lg:mt-10 lg:px-8">
                    <h3 className="font-bold text-xl mb-2">Build Your Workflow</h3>
                    <p className="text-base text-base-content/60">Drag nodes onto the canvas and connect them to create AI image generation pipelines.</p>
                  </div>
                </li>
                <li className="step step-primary" data-content="2">
                  <div className="text-left lg:text-center mt-6 lg:mt-10 lg:px-8">
                    <h3 className="font-bold text-xl mb-2">Publish as API</h3>
                    <p className="text-base text-base-content/60">One click to publish your workflow as a REST endpoint with automatic schema generation.</p>
                  </div>
                </li>
                <li className="step step-primary" data-content="3">
                  <div className="text-left lg:text-center mt-6 lg:mt-10 lg:px-8">
                    <h3 className="font-bold text-xl mb-2">Call Programmatically</h3>
                    <p className="text-base text-base-content/60">Use your API key to trigger workflows from any application. Pay only for what you use.</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Pricing Preview */}
        <section className="py-24 lg:py-32 bg-base-200/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <span className="badge badge-info badge-outline mb-4">Pricing</span>
              <h2 className="text-4xl md:text-5xl font-black mb-4">
                Simple, usage-based pricing
              </h2>
              <p className="text-base-content/60 text-lg">Start free, scale as you grow</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 max-w-4xl mx-auto items-stretch">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`card flex-1 ${plan.popular
                    ? "bg-primary text-primary-content scale-105 shadow-xl shadow-primary/20"
                    : "bg-base-100 border border-base-content/10"
                    }`}
                >
                  <div className="card-body">
                    <div className={plan.popular ? "flex justify-between items-start" : ""}>
                      <div>
                        <h3 className="font-bold text-xl">{plan.name}</h3>
                        <p className={`text-sm ${plan.popular ? "text-primary-content/70" : "text-base-content/60"}`}>
                          {plan.description}
                        </p>
                      </div>
                      {plan.popular && <span className="badge badge-secondary">Popular</span>}
                    </div>
                    <div className="my-4">
                      <span className="text-4xl font-black">${plan.price}</span>
                      <span className={plan.popular ? "text-primary-content/70" : "text-base-content/60"}>/month</span>
                    </div>
                    <ul className="space-y-2 mb-6">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm">
                          <svg className={`w-4 h-4 ${plan.popular ? "" : "text-success"}`} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Link
                      href={plan.ctaLink}
                      className={`btn btn-block ${plan.popular
                        ? "bg-white text-primary hover:bg-white/90 border-0"
                        : "btn-ghost"
                        }`}
                    >
                      {plan.cta}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-24 lg:py-32 bg-base-200/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <span className="badge badge-warning badge-outline mb-4">FAQ</span>
              <h2 className="text-4xl md:text-5xl font-black mb-4">
                Frequently asked questions
              </h2>
            </div>

            <div className="max-w-3xl mx-auto space-y-4">
              {[
                { q: "What AI models are supported?", a: "Node Banana supports Gemini (Nano Banana and Nano Banana Pro), Sora, Veo, Kling, and more. New models are added regularly." },
                { q: "How does the Headless API work?", a: "Build a workflow in the visual editor, then publish it with one click. You get a REST endpoint that accepts input parameters and returns generated outputs. Use your API key to authenticate." },
                { q: "Can I use my own API keys?", a: "Yes. You can bring your own Gemini, OpenAI, or Kie.ai API keys. Node Banana manages the orchestration and pipeline execution." },
                { q: "What happens if I exceed my plan limits?", a: "We will notify you when you are approaching your limits. You can upgrade anytime or your jobs will be queued until the next billing cycle." },
                { q: "Is there a free tier?", a: "Yes. The free plan includes 50 workflow runs per month, 5 saved workflows, and 2 API keys. No credit card required." },
              ].map((faq, i) => (
                <div key={i} className="collapse collapse-arrow bg-base-100 border border-base-content/5">
                  <input type="radio" name="faq-accordion" defaultChecked={i === 0} />
                  <div className="collapse-title text-lg font-semibold">
                    {faq.q}
                  </div>
                  <div className="collapse-content">
                    <p className="text-base-content/70 pt-2">{faq.a}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-24 lg:py-32 relative overflow-hidden">
          <div className="absolute inset-0 bg-linear-to-br from-primary via-secondary to-accent" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%23ffffff%22 fill-opacity=%220.05%22%3E%3Cpath d=%22M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-30" />

          <div className="container mx-auto px-4 text-center relative z-10">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-4xl md:text-6xl lg:text-7xl font-black mb-6 text-white leading-tight">
                Start building AI workflows today
              </h2>
              <p className="text-white/80 text-xl mb-10 max-w-xl mx-auto">
                From visual prototype to production API in minutes. No infrastructure to manage.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/editor" className="btn btn-lg bg-white text-primary hover:bg-white/90 border-0 shadow-xl gap-2 group">
                  <span>Open Editor</span>
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <Link href="/pricing" className="btn btn-lg btn-ghost text-white border-white/20 hover:bg-white/10 hover:border-white/30">
                  View Pricing
                </Link>
              </div>
              <p className="text-white/60 text-sm mt-8">
                No credit card required. Free tier available.
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
