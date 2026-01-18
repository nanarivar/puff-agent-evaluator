import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface Workflow {
  id: string;
  name: string;
}

interface N8nApiResponse {
  data: Workflow[];
  nextCursor: string | null;
}

const N8nWorkflows = () => {
  const navigate = useNavigate();
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  
  // Question generation state
  const [generatingWorkflowId, setGeneratingWorkflowId] = useState<string | null>(null);
  const [generationSuccess, setGenerationSuccess] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Normalize base URL: trim trailing slash and validate
  const normalizeBaseUrl = (url: string): string | null => {
    const trimmed = url.trim();
    if (!trimmed) return null;
    
    // Remove trailing slash
    const normalized = trimmed.replace(/\/+$/, "");
    
    // Validate it starts with http:// or https://
    if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
      return null;
    }
    
    return normalized;
  };

  const fetchWorkflows = async (url: string, cursor?: string | null) => {
    // Build the final URL
    const endpoint = cursor 
      ? `${url}/api/v1/workflows/?cursor=${cursor}`
      : `${url}/api/v1/workflows/`;
    
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        "N8N_API_KEY": apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: N8nApiResponse = await response.json();
    return data;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setWorkflows([]);
    setSelectedWorkflowId(null);
    setNextCursor(null);

    // Validate API Key
    if (!apiKey.trim()) {
      setError("API Key is required");
      return;
    }

    // Normalize and validate Base URL
    const normalizedUrl = normalizeBaseUrl(baseUrl);
    if (!normalizedUrl) {
      setError("Base URL must start with http:// or https://");
      return;
    }

    setLoading(true);

    try {
      const result = await fetchWorkflows(normalizedUrl);
      setWorkflows(result.data);
      setNextCursor(result.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch workflows");
      setWorkflows([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (!nextCursor) return;

    const normalizedUrl = normalizeBaseUrl(baseUrl);
    if (!normalizedUrl) return;

    setLoading(true);

    try {
      const result = await fetchWorkflows(normalizedUrl, nextCursor);
      setWorkflows((prev) => [...prev, ...result.data]);
      setNextCursor(result.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load more workflows");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Trigger question generation for a selected workflow.
   * 
   * Uses values from in-memory state:
   * - apiKey: from user input (stored in component state)
   * - baseUrl: from user input (stored in component state, normalized)
   * - workflow_id: from the clicked workflow row
   * 
   * Sends POST request to webhook endpoint to start question generation process.
   */
  const handleGenerateQuestions = async (workflowId: string) => {
    // Clear previous messages
    setGenerationSuccess(null);
    setGenerationError(null);
    
    // Validate required values are available
    if (!apiKey.trim()) {
      setGenerationError("API Key is required. Please enter it in the form above.");
      return;
    }

    const normalizedUrl = normalizeBaseUrl(baseUrl);
    if (!normalizedUrl) {
      setGenerationError("Base URL is required and must start with http:// or https://");
      return;
    }

    // Set loading state for this specific workflow
    setGeneratingWorkflowId(workflowId);

    try {
      // Webhook endpoint for question generation
      const webhookUrl = "https://primary-production-a0f8d.up.railway.app/webhook-test/create/questions";
      
      // Build request body with values from in-memory state
      const requestBody = {
        apikey: apiKey, // From user input, stored in component state
        workflow_id: workflowId, // From clicked workflow row
        base_url: normalizedUrl, // From user input, normalized (trailing slash removed)
      };

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        // Extract error message with status code
        const statusText = response.statusText || "Unknown error";
        throw new Error(`HTTP ${response.status}: ${statusText}`);
      }

      // Parse response (we don't assume a specific shape, just check for success)
      await response.json();

      // Success: show confirmation message and navigate to Questions page
      setGenerationSuccess("Questions generation started successfully.");
      setSelectedWorkflowId(workflowId);
      
      // Navigate to Questions page with workflowId as query parameter
      // The questions may take a moment to generate, so we navigate immediately
      // The Questions page will handle loading and retry logic
      navigate(`/questions?workflowId=${encodeURIComponent(workflowId)}`);
    } catch (err) {
      // Error: show clear error message with status code if available
      const errorMessage = err instanceof Error 
        ? err.message 
        : "Failed to start question generation";
      setGenerationError(errorMessage);
    } finally {
      // Clear loading state
      setGeneratingWorkflowId(null);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>n8n Workflow Viewer</CardTitle>
          <CardDescription>
            Connect to your n8n instance and view your workflows
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="baseUrl">n8n Base URL</Label>
              <Input
                id="baseUrl"
                type="url"
                placeholder="https://primary-production-1456c.up.railway.app"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiKey">n8n API Key</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="Enter your API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Fetching workflows..." : "Fetch Workflows"}
            </Button>
          </form>

          {/* Error State */}
          {error && (
            <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive font-medium">Error: {error}</p>
            </div>
          )}

          {/* Loading State */}
          {loading && workflows.length === 0 && (
            <div className="mt-4 text-center text-muted-foreground">
              <p>Fetching workflows...</p>
            </div>
          )}

          {/* Empty State */}
          {!loading && workflows.length === 0 && !error && (
            <div className="mt-4 text-center text-muted-foreground">
              <p>No workflows found.</p>
            </div>
          )}

          {/* Question Generation Success Message */}
          {generationSuccess && (
            <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-md">
              <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                {generationSuccess}
              </p>
            </div>
          )}

          {/* Question Generation Error Message */}
          {generationError && (
            <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive font-medium">Error: {generationError}</p>
            </div>
          )}

          {/* Workflows List */}
          {workflows.length > 0 && (
            <div className="mt-6 space-y-2">
              <h3 className="text-lg font-semibold">Workflows</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Click a workflow to generate questions for it
              </p>
              <div className="space-y-1">
                {workflows.map((workflow) => {
                  const isGenerating = generatingWorkflowId === workflow.id;
                  const isSelected = selectedWorkflowId === workflow.id;
                  const isDisabled = generatingWorkflowId !== null; // Disable all clicks while any workflow is generating

                  return (
                    <div
                      key={workflow.id}
                      data-id={workflow.id}
                      onClick={() => {
                        // Only allow clicks if no workflow is currently generating
                        if (!isDisabled) {
                          handleGenerateQuestions(workflow.id);
                        }
                      }}
                      className={`p-3 rounded-md border transition-colors ${
                        isDisabled
                          ? "cursor-not-allowed opacity-50"
                          : "cursor-pointer hover:bg-accent/50"
                      } ${
                        isSelected
                          ? "bg-accent border-accent-foreground/20"
                          : "border-border"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{workflow.name}</p>
                        {isGenerating && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Generating questions…</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Load More Button (if pagination available) */}
              {nextCursor && (
                <Button
                  onClick={handleLoadMore}
                  disabled={loading}
                  variant="outline"
                  className="w-full mt-4"
                >
                  {loading ? "Loading..." : "Load More"}
                </Button>
              )}

              {/* Selected Workflow ID Display */}
              {selectedWorkflowId && !generatingWorkflowId && (
                <div className="mt-4 p-4 bg-muted rounded-md">
                  <p className="text-sm text-muted-foreground">Selected Workflow ID:</p>
                  <p className="text-sm font-mono mt-1">{selectedWorkflowId}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default N8nWorkflows;
