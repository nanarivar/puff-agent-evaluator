import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Copy, Search, ArrowLeft } from "lucide-react";
import { fetchQuestions, type Question } from "@/lib/api/questions";
import { useToast } from "@/hooks/use-toast";

const Questions = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const workflowId = searchParams.get("workflowId");
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter questions client-side based on search query
  const filteredQuestions = useMemo(() => {
    if (!searchQuery.trim()) {
      return questions;
    }
    
    const query = searchQuery.toLowerCase();
    return questions.filter((q) => q.question.toLowerCase().includes(query));
  }, [questions, searchQuery]);

  useEffect(() => {
    if (!workflowId) {
      setError("Missing workflowId parameter");
      setLoading(false);
      return;
    }

    const loadQuestions = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const data = await fetchQuestions(workflowId);
        setQuestions(data);
      } catch (err) {
        const errorMessage = err instanceof Error 
          ? err.message 
          : "Failed to fetch questions";
        setError(errorMessage);
        setQuestions([]);
      } finally {
        setLoading(false);
      }
    };

    loadQuestions();
  }, [workflowId]);

  const handleCopyQuestion = async (questionText: string) => {
    try {
      await navigator.clipboard.writeText(questionText);
      toast({
        title: "Copied!",
        description: "Question copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Could not copy question to clipboard",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4 mb-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/n8n-workflows")}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1">
              <CardTitle>Questions</CardTitle>
              {workflowId && (
                <CardDescription className="mt-1 font-mono text-xs">
                  Workflow ID: {workflowId}
                </CardDescription>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search Input */}
          {questions.length > 0 && (
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search questions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              {searchQuery && (
                <p className="text-sm text-muted-foreground mt-2">
                  Showing {filteredQuestions.length} of {questions.length} questions
                </p>
              )}
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive font-medium">Error: {error}</p>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && questions.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No questions yet.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Questions will appear here after they are generated for this workflow.
              </p>
            </div>
          )}

          {/* Empty Search Results */}
          {!loading && !error && questions.length > 0 && filteredQuestions.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No questions match your search.</p>
            </div>
          )}

          {/* Questions List */}
          {!loading && !error && filteredQuestions.length > 0 && (
            <div className="space-y-3">
              {filteredQuestions.map((question, index) => (
                <div
                  key={question.id}
                  className="group p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium flex items-center justify-center mt-0.5">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm leading-relaxed break-words">
                        {question.question}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="flex-shrink-0 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleCopyQuestion(question.question)}
                      title="Copy question"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Questions;
