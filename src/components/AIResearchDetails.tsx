import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Search, Building2, Users, Target } from "lucide-react";
import { useState } from "react";
import type { AIResearchSummary } from "@/orchestrator/types";

interface AIResearchDetailsProps {
  research: AIResearchSummary;
}

export const AIResearchDetails = ({ research }: AIResearchDetailsProps) => {
  const [isQueriesOpen, setIsQueriesOpen] = useState(false);
  const [isAliasesOpen, setIsAliasesOpen] = useState(false);
  const [isIndustriesOpen, setIsIndustriesOpen] = useState(false);
  const [isClientsOpen, setIsClientsOpen] = useState(false);

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Target className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">AI Research Intelligence</h3>
        <Badge variant="secondary" className="ml-auto">
          {research.generatedQueries.totalQueries} queries generated
        </Badge>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Company Aliases */}
        <Collapsible open={isAliasesOpen} onOpenChange={setIsAliasesOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg border bg-muted/50 hover:bg-muted text-left">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="font-medium">Company Aliases</span>
              <Badge variant="outline">{research.discoveredAliases.length}</Badge>
            </div>
            <ChevronDown className={`h-4 w-4 transition-transform ${isAliasesOpen ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <div className="flex flex-wrap gap-1">
              {research.discoveredAliases.map((alias, i) => (
                <Badge key={i} variant={alias === research.originalCompany ? "default" : "secondary"}>
                  {alias}
                </Badge>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Industries */}
        <Collapsible open={isIndustriesOpen} onOpenChange={setIsIndustriesOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg border bg-muted/50 hover:bg-muted text-left">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              <span className="font-medium">Industries</span>
              <Badge variant="outline">{research.discoveredIndustries.length}</Badge>
            </div>
            <ChevronDown className={`h-4 w-4 transition-transform ${isIndustriesOpen ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <div className="flex flex-wrap gap-1">
              {research.discoveredIndustries.map((industry, i) => (
                <Badge key={i} variant={industry === research.originalIndustry ? "default" : "secondary"}>
                  {industry}
                </Badge>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Validated Clients */}
        <Collapsible open={isClientsOpen} onOpenChange={setIsClientsOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg border bg-muted/50 hover:bg-muted text-left">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="font-medium">Validated Clients</span>
              <Badge variant="outline">{research.validatedClients.length}</Badge>
            </div>
            <ChevronDown className={`h-4 w-4 transition-transform ${isClientsOpen ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <div className="flex flex-wrap gap-1">
              {research.validatedClients.map((client, i) => (
                <Badge key={i} variant={research.originalClients.includes(client) ? "default" : "secondary"}>
                  {client}
                </Badge>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Generated Queries */}
        <Collapsible open={isQueriesOpen} onOpenChange={setIsQueriesOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg border bg-muted/50 hover:bg-muted text-left">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              <span className="font-medium">Search Queries</span>
              <Badge variant="outline">{research.generatedQueries.totalQueries}</Badge>
            </div>
            <ChevronDown className={`h-4 w-4 transition-transform ${isQueriesOpen ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <div className="space-y-3">
              {/* Company Queries */}
              {research.generatedQueries.companyQueries.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium text-muted-foreground mb-1">Company Queries ({research.generatedQueries.companyQueries.length})</h5>
                  <div className="space-y-1">
                    {research.generatedQueries.companyQueries.map((query, i) => (
                      <div key={i} className="text-xs font-mono bg-muted p-2 rounded border">
                        {query}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Industry Queries */}
              {research.generatedQueries.industryQueries.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium text-muted-foreground mb-1">Industry Queries ({research.generatedQueries.industryQueries.length})</h5>
                  <div className="space-y-1">
                    {research.generatedQueries.industryQueries.map((query, i) => (
                      <div key={i} className="text-xs font-mono bg-muted p-2 rounded border">
                        {query}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Client Queries */}
              {research.generatedQueries.clientQueries.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium text-muted-foreground mb-1">Client Queries ({research.generatedQueries.clientQueries.length})</h5>
                  <div className="space-y-1">
                    {research.generatedQueries.clientQueries.slice(0, 3).map((query, i) => (
                      <div key={i} className="text-xs font-mono bg-muted p-2 rounded border">
                        {query.length > 100 ? `${query.substring(0, 100)}...` : query}
                      </div>
                    ))}
                    {research.generatedQueries.clientQueries.length > 3 && (
                      <div className="text-xs text-muted-foreground italic">
                        ... and {research.generatedQueries.clientQueries.length - 3} more client queries
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      <div className="text-xs text-muted-foreground pt-2 border-t">
        <strong>AI Enhancement:</strong> Perplexity AI discovered {research.discoveredAliases.length - 1} additional company names, 
        {research.discoveredIndustries.length - 1} related industries, and validated {research.validatedClients.length} clients 
        to generate {research.generatedQueries.totalQueries} targeted search queries.
      </div>
    </Card>
  );
};
