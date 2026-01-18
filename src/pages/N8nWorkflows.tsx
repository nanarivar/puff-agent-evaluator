import React, { useState, FormEvent, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import puffLogo from '@/assets/puff-character.png';

// WebGL Classes (same as hero)
class WebGLRenderer {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram | null = null;
  private vs: WebGLShader | null = null;
  private fs: WebGLShader | null = null;
  private buffer: WebGLBuffer | null = null;
  private scale: number;
  private shaderSource: string;

  private vertexSrc = `#version 300 es
precision highp float;
in vec4 position;
void main(){gl_Position=position;}`;

  private vertices = [-1, 1, -1, -1, 1, 1, 1, -1];

  constructor(canvas: HTMLCanvasElement, scale: number, shaderSource: string) {
    this.canvas = canvas;
    this.scale = scale;
    this.gl = canvas.getContext('webgl2')!;
    this.gl.viewport(0, 0, canvas.width * scale, canvas.height * scale);
    this.shaderSource = shaderSource;
  }

  updateScale(scale: number) {
    this.scale = scale;
    this.gl.viewport(0, 0, this.canvas.width * scale, this.canvas.height * scale);
  }

  compile(shader: WebGLShader, source: string) {
    const gl = this.gl;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
  }

  reset() {
    const gl = this.gl;
    if (this.program && !gl.getProgramParameter(this.program, gl.DELETE_STATUS)) {
      if (this.vs) {
        gl.detachShader(this.program, this.vs);
        gl.deleteShader(this.vs);
      }
      if (this.fs) {
        gl.detachShader(this.program, this.fs);
        gl.deleteShader(this.fs);
      }
      gl.deleteProgram(this.program);
    }
  }

  setup() {
    const gl = this.gl;
    this.vs = gl.createShader(gl.VERTEX_SHADER)!;
    this.fs = gl.createShader(gl.FRAGMENT_SHADER)!;
    this.compile(this.vs, this.vertexSrc);
    this.compile(this.fs, this.shaderSource);
    this.program = gl.createProgram()!;
    gl.attachShader(this.program, this.vs);
    gl.attachShader(this.program, this.fs);
    gl.linkProgram(this.program);
  }

  init() {
    const gl = this.gl;
    const program = this.program!;
    
    this.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.STATIC_DRAW);

    const position = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    (program as any).resolution = gl.getUniformLocation(program, 'resolution');
    (program as any).time = gl.getUniformLocation(program, 'time');
  }

  render(now = 0) {
    const gl = this.gl;
    const program = this.program;
    
    if (!program || gl.getProgramParameter(program, gl.DELETE_STATUS)) return;

    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    
    gl.uniform2f((program as any).resolution, this.canvas.width, this.canvas.height);
    gl.uniform1f((program as any).time, now * 1e-3);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}

const shaderSource = `#version 300 es
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
  float bg=clouds(vec2(st.x+T*.5,-st.y));
  uv*=1.-.3*(sin(T*.2)*.5+.5);
  for (float i=1.; i<12.; i++) {
    uv+=.1*cos(i*vec2(.1+.01*i, .8)+i*i+T*.5+.1*uv.x);
    vec2 p=uv;
    float d=length(p);
    float intensity = .00125/d*(cos(sin(i))+1.);
    col+=vec3(intensity);
    float b=noise(i+p+bg*1.731);
    col+=vec3(.002*b/length(max(p,vec2(b*p.x*.02,p.y))));
    col=mix(col,vec3(bg*.2),d);
  }
  O=vec4(col,1);
}`;

interface Workflow {
  id: string;
  name: string;
}

interface N8nApiResponse {
  data: Workflow[];
  nextCursor: string | null;
}

const N8nWorkflows: React.FC = () => {
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

  // WebGL refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const rendererRef = useRef<WebGLRenderer | null>(null);

  // Shader background setup
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const dpr = Math.max(1, 0.5 * window.devicePixelRatio);
    
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    
    rendererRef.current = new WebGLRenderer(canvas, dpr, shaderSource);
    rendererRef.current.setup();
    rendererRef.current.init();

    const loop = (now: number) => {
      rendererRef.current?.render(now);
      animationFrameRef.current = requestAnimationFrame(loop);
    };
    
    loop(0);

    const resize = () => {
      if (!canvasRef.current) return;
      const dpr = Math.max(1, 0.5 * window.devicePixelRatio);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      rendererRef.current?.updateScale(dpr);
    };

    window.addEventListener('resize', resize);
    
    return () => {
      window.removeEventListener('resize', resize);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      rendererRef.current?.reset();
    };
  }, []);

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
        apikey: apiKey,
        workflow_id: workflowId,
        base_url: normalizedUrl,
      };

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const statusText = response.statusText || "Unknown error";
        throw new Error(`HTTP ${response.status}: ${statusText}`);
      }

      await response.json();

      setGenerationSuccess("Questions generation started successfully.");
      setSelectedWorkflowId(workflowId);
      
      navigate(`/questions?workflowId=${encodeURIComponent(workflowId)}`);
    } catch (err) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : "Failed to start question generation";
      setGenerationError(errorMessage);
    } finally {
      setGeneratingWorkflowId(null);
    }
  };

  return (
    <div className="relative w-full min-h-screen overflow-auto bg-black">
      <canvas
        ref={canvasRef}
        className="fixed inset-0 w-full h-full object-contain touch-none"
        style={{ background: 'black' }}
      />
      
      <div className="relative z-10 flex flex-col items-center justify-start px-4 py-12 min-h-screen">
        <div className="w-full max-w-2xl space-y-8 animate-fade-in">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3">
              <img 
                src={puffLogo} 
                alt="Mrs. Puff" 
                className="h-16 w-16 rounded-full object-cover"
                style={{ filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.3))' }}
              />
              <h1 className="text-4xl md:text-5xl font-bold text-white">PUFF</h1>
            </div>
            <p className="text-white/70 text-lg">
              Connect to your n8n instance and generate questions for your workflows.
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-white">n8n Workflow Viewer</h2>
              <p className="text-white/60 text-sm mt-1">
                Connect to your n8n instance and view your workflows
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="baseUrl" className="block text-white/80 text-sm font-medium">
                  n8n Base URL
                </label>
                <input
                  id="baseUrl"
                  type="url"
                  placeholder="https://primary-production-1456c.up.railway.app"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  disabled={loading}
                  required
                  className="w-full px-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent transition-all"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="apiKey" className="block text-white/80 text-sm font-medium">
                  n8n API Key
                </label>
                <input
                  id="apiKey"
                  type="password"
                  placeholder="Enter your API key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  disabled={loading}
                  required
                  className="w-full px-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-4 bg-white text-black hover:bg-white/90 rounded-xl font-semibold text-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-white/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {loading ? "Fetching workflows..." : "Fetch Workflows"}
              </button>
            </form>

            {/* Error State */}
            {error && (
              <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-xl">
                <p className="text-sm text-red-300 font-medium">Error: {error}</p>
              </div>
            )}

            {/* Loading State */}
            {loading && workflows.length === 0 && (
              <div className="text-center text-white/60">
                <p>Fetching workflows...</p>
              </div>
            )}

            {/* Empty State */}
            {!loading && workflows.length === 0 && !error && baseUrl && apiKey && (
              <div className="text-center text-white/60">
                <p>No workflows found.</p>
              </div>
            )}

            {/* Question Generation Success Message */}
            {generationSuccess && (
              <div className="p-4 bg-green-500/20 border border-green-500/30 rounded-xl">
                <p className="text-sm text-green-300 font-medium">
                  {generationSuccess}
                </p>
              </div>
            )}

            {/* Question Generation Error Message */}
            {generationError && (
              <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-xl">
                <p className="text-sm text-red-300 font-medium">Error: {generationError}</p>
              </div>
            )}

            {/* Workflows List */}
            {workflows.length > 0 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">Workflows</h3>
                  <p className="text-sm text-white/60">
                    Click a workflow to generate questions for it
                  </p>
                </div>
                <div className="space-y-2">
                  {workflows.map((workflow) => {
                    const isGenerating = generatingWorkflowId === workflow.id;
                    const isSelected = selectedWorkflowId === workflow.id;
                    const isDisabled = generatingWorkflowId !== null;

                    return (
                      <div
                        key={workflow.id}
                        data-id={workflow.id}
                        onClick={() => {
                          if (!isDisabled) {
                            handleGenerateQuestions(workflow.id);
                          }
                        }}
                        className={`p-4 rounded-xl border transition-all ${
                          isDisabled
                            ? "cursor-not-allowed opacity-50"
                            : "cursor-pointer hover:bg-white/10 hover:border-white/40"
                        } ${
                          isSelected
                            ? "bg-white/20 border-white/40"
                            : "bg-white/5 border-white/20"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-white">{workflow.name}</p>
                          {isGenerating && (
                            <div className="flex items-center gap-2 text-sm text-white/60">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Generating questions…</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Load More Button */}
                {nextCursor && (
                  <button
                    onClick={handleLoadMore}
                    disabled={loading}
                    className="w-full px-6 py-3 bg-white/10 text-white hover:bg-white/20 border border-white/20 rounded-xl font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "Loading..." : "Load More"}
                  </button>
                )}

                {/* Selected Workflow ID Display */}
                {selectedWorkflowId && !generatingWorkflowId && (
                  <div className="p-4 bg-white/5 border border-white/20 rounded-xl">
                    <p className="text-sm text-white/60">Selected Workflow ID:</p>
                    <p className="text-sm font-mono text-white mt-1">{selectedWorkflowId}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <p className="text-center text-white/50 text-sm">
            "Time to see what you've learned." — Mrs. Puff
          </p>
        </div>
      </div>
    </div>
  );
};

export default N8nWorkflows;
