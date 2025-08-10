import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Database, Globe, Brain, Clock, Users, Building, Tag } from "lucide-react";
import type { ResearchResponse } from "@/orchestrator/types";

interface AllResearchResponsesProps {
  responses: ResearchResponse[];
}

export const AllResearchResponses = ({ responses }: AllResearchResponsesProps) => {
  const [openItems, setOpenItems] = useState<Set<number>>(new Set());

  if (!responses || responses.length === 0) {
    return (
      <Card className="p-6 text-center">
        <p className="text-muted-foreground">No research responses available yet.</p>
      </Card>
    );
  }

  const toggleItem = (index: number) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(index)) {
      newOpenItems.delete(index);
    } else {
      newOpenItems.add(index);
    }
    setOpenItems(newOpenItems);
  };

  const getSourceIcon = (source: ResearchResponse['source']) => {
    switch (source) {
      case 'cache':
        return <Database className="h-4 w-4" />;
      case 'research-api':
        return <Globe className="h-4 w-4" />;
      case 'ai-research':
        return <Brain className="h-4 w-4" />;
      default:
        return <Database className="h-4 w-4" />;
    }
  };

  const getSourceLabel = (source: ResearchResponse['source']) => {
    switch (source) {
      case 'cache':
        return 'Cached Report';
      case 'research-api':
        return 'Research API';
      case 'ai-research':
        return 'AI Research';
      default:
        return 'Unknown Source';
    }
  };

  const getSourceColor = (source: ResearchResponse['source']) => {
    switch (source) {
      case 'cache':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'research-api':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'ai-research':
        return 'bg-purple-50 border-purple-200 text-purple-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return 'Unknown time';
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return timestamp;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">All Research Responses ({responses.length})</h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpenItems(new Set(responses.map((_, i) => i)))}
          >
            Expand All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpenItems(new Set())}
          >
            Collapse All
          </Button>
        </div>
      </div>

      {responses.map((response, index) => {
        const isOpen = openItems.has(index);
        
        return (
          <Card key={index} className={`border-2 ${getSourceColor(response.source)}`}>
            <Collapsible open={isOpen} onOpenChange={() => toggleItem(index)}>
              <CollapsibleTrigger asChild>
                <div className="p-4 cursor-pointer hover:bg-black/5 transition-colors">
                  <div className="flex items-center gap-3">
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    
                    {getSourceIcon(response.source)}
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-sm">
                          {getSourceLabel(response.source)}
                        </h4>
                        <Badge variant="outline" className="text-xs">
                          #{index + 1}
                        </Badge>
                      </div>
                      
                      <p className="text-xs opacity-80 line-clamp-1">
                        {response.query}
                      </p>
                      
                      <div className="flex items-center gap-4 mt-2 text-xs opacity-60">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTimestamp(response.timestamp)}
                        </div>
                        
                        {response.metadata?.rounds && (
                          <div className="flex items-center gap-1">
                            <Tag className="h-3 w-3" />
                            {response.metadata.rounds} rounds
                          </div>
                        )}
                        
                        {response.metadata?.aliases && response.metadata.aliases.length > 0 && (
                          <div className="flex items-center gap-1">
                            <Building className="h-3 w-3" />
                            {response.metadata.aliases.length} aliases
                          </div>
                        )}
                        
                        {response.metadata?.clients && response.metadata.clients.length > 0 && (
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {response.metadata.clients.length} clients
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <div className="px-4 pb-4 border-t border-current/20">
                  <div className="mt-3 space-y-3">
                    <div>
                      <h5 className="font-medium text-xs mb-2 opacity-80">Query:</h5>
                      <p className="text-xs bg-white/50 p-2 rounded border">
                        {response.query}
                      </p>
                    </div>
                    
                    {response.metadata && (
                      <div>
                        <h5 className="font-medium text-xs mb-2 opacity-80">Metadata:</h5>
                        <div className="text-xs bg-white/50 p-2 rounded border space-y-1">
                          {response.metadata.rounds && (
                            <p><strong>Rounds:</strong> {response.metadata.rounds}</p>
                          )}
                          {response.metadata.aliases && response.metadata.aliases.length > 0 && (
                            <p><strong>Aliases:</strong> {response.metadata.aliases.join(', ')}</p>
                          )}
                          {response.metadata.industries && response.metadata.industries.length > 0 && (
                            <p><strong>Industries:</strong> {response.metadata.industries.join(', ')}</p>
                          )}
                          {response.metadata.clients && response.metadata.clients.length > 0 && (
                            <p><strong>Clients:</strong> {response.metadata.clients.join(', ')}</p>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <h5 className="font-medium text-xs mb-2 opacity-80">Report:</h5>
                      <div className="text-xs bg-white/50 p-3 rounded border max-h-96 overflow-y-auto">
                        <div className="prose prose-xs max-w-none">
                          {response.report.split('\n').map((paragraph, i) => (
                            <p key={i} className="mb-2 last:mb-0">
                              {paragraph}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        );
      })}
    </div>
  );
};
