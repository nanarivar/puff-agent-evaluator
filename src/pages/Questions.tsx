import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Copy, Search, ArrowLeft, LogOut } from "lucide-react";
import { fetchQuestions, type Question } from "@/lib/api/questions";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/contexts/UserContext";
import puffLogo from "@/assets/puff-character.png";

// Shader background component (same as Dashboard)
const ShaderBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const gl = canvas.getContext('webgl2');
    if (!gl) return;

    const dpr = Math.max(1, 0.5 * window.devicePixelRatio);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    gl.viewport(0, 0, canvas.width, canvas.height);

    const vertexSrc = `#version 300 es
    precision highp float;
    in vec4 position;
    void main(){gl_Position=position;}`;

    const fragmentSrc = `#version 300 es
    precision highp float;
    out vec4 O;
    uniform vec2 resolution;
    uniform float time;
    #define FC gl_FragCoord.xy
    #define T time
    #define R resolution
    #define MN min(R.x,R.y)

    float rnd(vec2 p) {
      p=fract(p*vec2(12.9898,78.233));
      p+=dot(p,p+34.56);
      return fract(p.x*p.y);
    }

    float noise(in vec2 p) {
      vec2 i=floor(p), f=fract(p), u=f*f*(3.-2.*f);
      float a=rnd(i), b=rnd(i+vec2(1,0)), c=rnd(i+vec2(0,1)), d=rnd(i+1.);
      return mix(mix(a,b,u.x),mix(c,d,u.x),u.y);
    }

    float fbm(vec2 p) {
      float t=.0, a=1.; mat2 m=mat2(1.,-.5,.2,1.2);
      for (int i=0; i<5; i++) { t+=a*noise(p); p*=2.*m; a*=.5; }
      return t;
    }

    float clouds(vec2 p) {
      float d=1., t=.0;
      for (float i=.0; i<3.; i++) {
        float a=d*fbm(i*10.+p.x*.2+.2*(1.+i)*p.y+d+i*i+p);
        t=mix(t,d,a); d=a; p*=2./(i+1.);
      }
      return t;
    }

    void main(void) {
      vec2 uv=(FC-.5*R)/MN,st=uv*vec2(2,1);
      vec3 col=vec3(0);
      float bg=clouds(vec2(st.x+T*.3,-st.y));
      uv*=1.-.2*(sin(T*.15)*.5+.5);
      for (float i=1.; i<8.; i++) {
        uv+=.08*cos(i*vec2(.1+.01*i, .8)+i*i+T*.3+.1*uv.x);
        vec2 p=uv;
        float d=length(p);
        float intensity = .001/d*(cos(sin(i))+1.);
        col+=vec3(intensity);
        float b=noise(i+p+bg*1.731);
        col+=vec3(.0015*b/length(max(p,vec2(b*p.x*.02,p.y))));
        col=mix(col,vec3(bg*.15),d);
      }
      O=vec4(col*.7,1);
    }`;

    const vs = gl.createShader(gl.VERTEX_SHADER)!;
    const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(vs, vertexSrc);
    gl.shaderSource(fs, fragmentSrc);
    gl.compileShader(vs);
    gl.compileShader(fs);

    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, 1, -1, -1, 1, 1, 1, -1]), gl.STATIC_DRAW);

    const position = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const resolutionLoc = gl.getUniformLocation(program, 'resolution');
    const timeLoc = gl.getUniformLocation(program, 'time');

    const render = (now: number) => {
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.uniform2f(resolutionLoc, canvas.width, canvas.height);
      gl.uniform1f(timeLoc, now * 1e-3);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      animationFrameRef.current = requestAnimationFrame(render);
    };

    render(0);

    const handleResize = () => {
      const dpr = Math.max(1, 0.5 * window.devicePixelRatio);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full object-contain touch-none -z-10"
      style={{ background: 'black' }}
    />
  );
};

const Questions = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userName, logout } = useUser();
  
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

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen text-white">
      <ShaderBackground />
      
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={puffLogo} alt="PUFF" className="h-10 w-10 rounded-full object-cover" />
            <span className="text-xl font-bold">PUFF</span>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-sm"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </header>

      <main className="pt-24 pb-12 px-6">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Title Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/n8n-workflows")}
                className="h-10 w-10 bg-white/10 hover:bg-white/20 rounded-full"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold">Questions</h1>
                {workflowId && (
                  <p className="text-white/50 text-sm font-mono mt-1">
                    Workflow ID: {workflowId}
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Content Card */}
          <section className="p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
            
            {/* Search Input */}
            {questions.length > 0 && (
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
                  <Input
                    type="text"
                    placeholder="Search questions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-white/40"
                  />
                </div>
                {searchQuery && (
                  <p className="text-sm text-white/50 mt-2">
                    Showing {filteredQuestions.length} of {questions.length} questions
                  </p>
                )}
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full bg-white/10" />
                ))}
              </div>
            )}

            {/* Error State */}
            {error && !loading && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-sm text-red-300 font-medium">Error: {error}</p>
              </div>
            )}

            {/* Empty State */}
            {!loading && !error && questions.length === 0 && (
              <div className="text-center py-12">
                <img 
                  src={puffLogo} 
                  alt="Mrs. Puff" 
                  className="h-16 w-16 rounded-full object-cover mx-auto mb-4"
                  style={{ filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.2))' }}
                />
                <p className="text-white/70">No questions yet.</p>
                <p className="text-sm text-white/50 mt-2">
                  Questions will appear here after they are generated for this workflow.
                </p>
              </div>
            )}

            {/* Empty Search Results */}
            {!loading && !error && questions.length > 0 && filteredQuestions.length === 0 && (
              <div className="text-center py-12">
                <p className="text-white/70">No questions match your search.</p>
              </div>
            )}

            {/* Questions List */}
            {!loading && !error && filteredQuestions.length > 0 && (
              <div className="space-y-3">
                {filteredQuestions.map((question, index) => (
                  <div
                    key={question.id}
                    className="group p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/10 text-white text-sm font-medium flex items-center justify-center mt-0.5">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm leading-relaxed break-words text-white/90">
                          {question.question}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="flex-shrink-0 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-white/70 hover:text-white hover:bg-white/10"
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
          </section>
        </div>
      </main>
    </div>
  );
};

export default Questions;
