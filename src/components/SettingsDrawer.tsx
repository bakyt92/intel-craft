import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LS_KEYS } from "@/utils/LocalStorageKeys";
import { Settings } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export const SettingsDrawer = () => {
  const { toast } = useToast();
  const [perplexityKey, setPerplexityKey] = useState("");
  const [serperKey, setSerperKey] = useState("");

  useEffect(() => {
    setPerplexityKey(localStorage.getItem(LS_KEYS.perplexityApiKey) || "");
    setSerperKey(localStorage.getItem(LS_KEYS.serperApiKey) || "");
  }, []);

  const save = () => {
    if (perplexityKey) localStorage.setItem(LS_KEYS.perplexityApiKey, perplexityKey);
    if (serperKey) localStorage.setItem(LS_KEYS.serperApiKey, serperKey);
    toast({ title: "Saved", description: "API keys stored locally.", duration: 2000 });
  };

  const clear = () => {
    localStorage.removeItem(LS_KEYS.perplexityApiKey);
    localStorage.removeItem(LS_KEYS.serperApiKey);
    setPerplexityKey("");
    setSerperKey("");
    toast({ title: "Cleared", description: "API keys removed.", duration: 2000 });
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="premium" size="sm" className="animate-pulse-glow">
          <Settings className="mr-1" /> Settings
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Agent Settings</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="perplexity">Perplexity API Key</Label>
            <Input id="perplexity" value={perplexityKey} onChange={(e) => setPerplexityKey(e.target.value)} placeholder="pplx-..." />
            <p className="text-xs text-muted-foreground">Used for planning and summaries. Stored in your browser.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="serper">Serper API Key</Label>
            <Input id="serper" value={serperKey} onChange={(e) => setSerperKey(e.target.value)} placeholder="serper-..." />
            <p className="text-xs text-muted-foreground">Used for Google News/Search. Stored in your browser.</p>
          </div>
          <div className="flex gap-3">
            <Button onClick={save} className="flex-1" variant="hero">Save</Button>
            <Button onClick={clear} className="flex-1" variant="outline">Clear</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
