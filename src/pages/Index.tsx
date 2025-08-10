import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { TaskGraph } from "@/components/TaskGraph";
import { ExecutiveBrief } from "@/components/ExecutiveBrief";
import { AIResearchDetails } from "@/components/AIResearchDetails";
import { GradientBackdrop } from "@/components/GradientBackdrop";
import { SettingsDrawer } from "@/components/SettingsDrawer";
import { TaskOrchestrator } from "@/orchestrator/TaskOrchestrator";
import type { ResearchInput, ResearchOutput, TaskNode } from "@/orchestrator/types";
import { downloadHTML, downloadJSON } from "@/utils/export";
import { useToast } from "@/components/ui/use-toast";

const Index = () => {
  const { toast } = useToast();
  const [company, setCompany] = useState("");
  const [industry, setIndustry] = useState("");
  const [clients, setClients] = useState("");
  const [windowDays, setWindowDays] = useState(90);
  const [region, setRegion] = useState("");

  const [nodes, setNodes] = useState<TaskNode[]>([]);
  const [output, setOutput] = useState<ResearchOutput | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = "Agent Research Orchestrator – AI News & Scraping";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', 'AI orchestrator for dynamic tasking, compliant scraping, and concise summaries with citations.');

    const canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (canonical) canonical.href = window.location.href;

    // JSON-LD
    const ld = document.createElement('script');
    ld.type = 'application/ld+json';
    ld.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "Agent Research Orchestrator",
      description: "Dynamic research planner with compliant scraping and summaries",
      applicationCategory: "BusinessApplication",
      url: window.location.href
    });
    document.head.appendChild(ld);
    return () => { document.head.removeChild(ld); };
  }, []);

  const valid = company.trim().length > 1 && industry.trim().length > 1;

  const handleRun = async () => {
    if (!valid) {
      toast({ title: "Missing info", description: "Please enter company and industry.", variant: "destructive" });
      return;
    }
    setLoading(true);
    setOutput(null);
    const orchestrator = new TaskOrchestrator(setNodes);

    try {
      const input: ResearchInput = {
        company, industry,
        clients: clients.split(',').map((s) => s.trim()).filter(Boolean),
        windowDays,
        region: region || undefined,
      };
      const result = await orchestrator.run(input);
      setOutput(result);
      toast({ title: "Complete", description: "Research finished." });
    } catch (e: any) {
      console.error(e);
      toast({ title: "Error", description: e?.message || "Something went wrong", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const appendix = useMemo(() => {
    if (!output) return [] as { title?: string; url: string }[];
    const all = Object.values(output.itemsBySegment || {}).flat() as any[];
    const uniq = new Map<string, { title?: string; url: string }>();
    all.forEach((i) => { if (i.url && !uniq.has(i.url)) uniq.set(i.url, { title: i.title, url: i.url }); });
    return Array.from(uniq.values());
  }, [output]);

  return (
    <div className="min-h-screen relative">
      <GradientBackdrop />
      <header className="container py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-md bg-[linear-gradient(var(--gradient-primary))] animate-float" />
          <div>
            <h1 className="text-xl font-semibold">Agent Research Orchestrator</h1>
            <p className="text-sm text-muted-foreground">Dynamic tasking • Compliant scraping • Cited summaries</p>
          </div>
        </div>
        <SettingsDrawer />
      </header>

      <main className="container pb-24">
        <section className="grid lg:grid-cols-5 gap-8 items-start">
          <Card className="p-6 lg:col-span-2 shadow-[var(--shadow-elegant)]">
            <h2 className="text-lg font-semibold">Start a research run</h2>
            <p className="text-sm text-muted-foreground mb-4">We’ll plan tasks, search, scrape public sources, and deliver a concise brief.</p>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input id="company" placeholder="e.g., TotalEnergies" value={company} onChange={(e) => setCompany(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Input id="industry" placeholder="e.g., Energy" value={industry} onChange={(e) => setIndustry(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clients">Clients (comma separated)</Label>
                <Input id="clients" placeholder="e.g., Shell, BP, Engie" value={clients} onChange={(e) => setClients(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="window">Time window</Label>
                  <select id="window" className="w-full h-10 rounded-md border bg-background" value={windowDays} onChange={(e) => setWindowDays(parseInt(e.target.value))}>
                    <option value={30}>Last 30 days</option>
                    <option value={60}>Last 60 days</option>
                    <option value={90}>Last 90 days</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="region">Region (optional)</Label>
                  <Input id="region" placeholder="e.g., EU, US, APAC" value={region} onChange={(e) => setRegion(e.target.value)} />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button onClick={handleRun} disabled={loading || !valid} variant="hero" className="flex-1">
                  {loading ? "Running..." : "Run Research"}
                </Button>
                <Button onClick={() => output && downloadJSON('research.json', output)} disabled={!output} variant="outline">Export JSON</Button>
                <Button onClick={() => output && downloadHTML('report.html', document.getElementById('report')?.innerHTML || '')} disabled={!output} variant="outline">Export HTML</Button>
              </div>
              <p className="text-xs text-muted-foreground">Compliance: public data only, robots.txt respected. No paywalls/CAPTCHA bypass.</p>
            </div>
          </Card>

          <div className="lg:col-span-3 space-y-8">
            <section>
              <h2 className="text-lg font-semibold mb-3">Task graph</h2>
              {nodes.length ? <TaskGraph nodes={nodes} /> : <p className="text-sm text-muted-foreground">No run yet. Fill the form and click Run Research.</p>}
            </section>

            <Separator />

            {/* AI Research Details Section */}
            {output?.aiResearch && (
              <>
                <section>
                  <h2 className="text-lg font-semibold mb-3">AI Research Intelligence</h2>
                  <AIResearchDetails research={output.aiResearch} />
                </section>
                
                <Separator />
              </>
            )}

            <section>
              <h2 className="text-lg font-semibold mb-3">Executive brief</h2>
              <div id="report" className="rounded-lg border p-6 bg-card shadow-sm">
                {output?.executiveBrief ? (
                  <ExecutiveBrief brief={output.executiveBrief} />
                ) : (
                  <p className="text-sm text-muted-foreground">Your summarized brief will appear here with inline citations and a sources appendix.</p>
                )}

                {!!appendix.length && (
                  <div className="mt-6">
                    <h3 className="font-semibold mb-2">Sources appendix</h3>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      {appendix.map((s, i) => (
                        <li key={s.url}>
                          <a className="text-primary underline" href={s.url} target="_blank" rel="noreferrer noopener">{s.title || s.url}</a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Index;
