import type { SearchItem } from "@/agents/PerplexitySearchAgent";

export const ExecutiveBrief = ({ brief }: { brief?: string }) => {
  if (!brief) return null;
  return (
    <article className="prose prose-slate dark:prose-invert max-w-none">
      <div dangerouslySetInnerHTML={{ __html: brief.replace(/\n/g, '<br/>') }} />
    </article>
  );
};
