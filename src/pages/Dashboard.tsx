import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';
import { AlertTriangle, CheckCircle, TrendingUp, Zap, Shield, Code, Layers, ArrowRight, LogOut, Sparkles } from 'lucide-react';
import { GlassButton } from '@/components/ui/glass-button';
import puffLogo from '@/assets/puff-character.png';

// Shader background component
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

// Score Gauge Component
const ScoreGauge: React.FC<{ score: number; label: string }> = ({ score, label }) => {
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg className="w-32 h-32 transform -rotate-90">
        <circle
          cx="64"
          cy="64"
          r="45"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="8"
          fill="none"
        />
        <circle
          cx="64"
          cy="64"
          r="45"
          stroke="white"
          strokeWidth="8"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold text-white">{score}</span>
        <span className="text-xs text-white/60">{label}</span>
      </div>
    </div>
  );
};

// Category Score Bar
const CategoryBar: React.FC<{ name: string; score: number; icon: React.ReactNode }> = ({ name, score, icon }) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2 text-white/80">
        {icon}
        <span>{name}</span>
      </div>
      <span className="text-white font-medium">{score}/100</span>
    </div>
    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
      <div 
        className="h-full bg-white rounded-full transition-all duration-1000 ease-out"
        style={{ width: `${score}%` }}
      />
    </div>
  </div>
);

// Issue Card
const IssueCard: React.FC<{ 
  automation: string; 
  issue: string; 
  severity: 'low' | 'medium' | 'high';
  impact: string;
}> = ({ automation, issue, severity, impact }) => {
  const severityStyles = {
    low: 'border-white/20 bg-white/5',
    medium: 'border-yellow-500/30 bg-yellow-500/10',
    high: 'border-red-500/30 bg-red-500/10'
  };
  
  return (
    <div className={`p-4 rounded-xl border ${severityStyles[severity]} backdrop-blur-sm`}>
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-white">{automation}</h4>
        <span className={`text-xs px-2 py-1 rounded-full ${
          severity === 'high' ? 'bg-red-500/20 text-red-300' :
          severity === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
          'bg-white/10 text-white/60'
        }`}>
          {severity}
        </span>
      </div>
      <p className="text-sm text-white/60 mb-2">{issue}</p>
      <p className="text-xs text-white/40">Impact: {impact}</p>
    </div>
  );
};

// Recommendation Card
const RecommendationCard: React.FC<{
  title: string;
  reason: string;
  improvement: string;
}> = ({ title, reason, improvement }) => (
  <div className="p-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all cursor-pointer group">
    <div className="flex items-start justify-between mb-2">
      <h4 className="font-medium text-white">{title}</h4>
      <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-300">
        {improvement}
      </span>
    </div>
    <p className="text-sm text-white/60 mb-3">{reason}</p>
    <button className="flex items-center gap-2 text-sm text-white/80 group-hover:text-white transition-colors">
      Fix this <ArrowRight className="w-4 h-4" />
    </button>
  </div>
);

// Mrs. Puff rotating quotes
const mrsPuffQuotes = [
  "Every great driver started with a learner's permit.",
  "I've seen fewer crashes in a demolition derby.",
  "At this rate, my insurance will never recover.",
  "You remind me of my worst student... and that's saying something.",
  "Deep breaths... this is why I have a stress ball.",
  "Some students take years to learn. You might take decades.",
  "I didn't think it was possible to fail this creatively.",
  "My other students at least hit the brakes occasionally.",
  "You drive like you're being chased by your own logic.",
  "I'm not mad, I'm just... profoundly disappointed.",
];

const Dashboard: React.FC = () => {
  const { userName, logout } = useUser();
  const navigate = useNavigate();
  const [hasAutomations, setHasAutomations] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [quoteIndex, setQuoteIndex] = useState(0);

  // Rotate quotes every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % mrsPuffQuotes.length);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!userName) {
      navigate('/login');
    }
  }, [userName, navigate]);

  const handleUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setHasAutomations(true);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!userName) return null;

  // Mock data for demonstration
  const puffScore = 72;
  const scoreLabel = puffScore >= 85 ? 'Excellent' : puffScore >= 70 ? 'Solid' : 'Needs Work';

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
        <div className="max-w-7xl mx-auto space-y-12">
          
          {/* Hero / Welcome Section */}
          <section className="text-center space-y-6 py-8">
            <div className="flex items-center justify-center gap-4 mb-4">
              <img 
                src={puffLogo} 
                alt="Mrs. Puff" 
                className="h-20 w-20 rounded-full object-cover"
                style={{ filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.2))' }}
              />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold">
              Welcome back, {userName}
            </h1>
            <p className="text-xl text-white/70 max-w-2xl mx-auto">
              {hasAutomations 
                ? "Mrs. Puff reviewed your workflows. Here's the verdict."
                : "Mrs. Puff is ready to grade your automations. Upload one to get started."}
            </p>
          </section>

          {!hasAutomations ? (
            /* Empty State - Create Questions CTA */
            <section className="max-w-2xl mx-auto text-center flex flex-col items-center py-12">
              <GlassButton
                size="lg"
                contentClassName="text-2xl font-semibold px-12 py-5"
                onClick={() => navigate('/n8n-workflows')}
              >
                Create Questions
              </GlassButton>
              <p className="text-center text-white/50 text-lg mt-10 transition-opacity duration-500 max-w-lg leading-relaxed">
                "{mrsPuffQuotes[quoteIndex]}" — Mrs. Puff
              </p>
            </section>
          ) : (
            <>
              {/* PUFF Score Display */}
              <section className="flex flex-col md:flex-row items-center justify-center gap-12 py-8">
                <ScoreGauge score={puffScore} label={scoreLabel} />
                <div className="text-center md:text-left max-w-md">
                  <h2 className="text-2xl font-bold mb-2">Your PUFF Score</h2>
                  <p className="text-white/60">
                    Your automations are {scoreLabel.toLowerCase()}. There's room for improvement, 
                    but you're on the right track.
                  </p>
                </div>
              </section>

              {/* Score Breakdown */}
              <section className="max-w-2xl mx-auto space-y-6">
                <h2 className="text-2xl font-bold text-center mb-8">Score Breakdown</h2>
                <div className="grid gap-4 p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
                  <CategoryBar name="Structure" score={85} icon={<Layers className="w-4 h-4" />} />
                  <CategoryBar name="Efficiency" score={68} icon={<Zap className="w-4 h-4" />} />
                  <CategoryBar name="Error Handling" score={55} icon={<Shield className="w-4 h-4" />} />
                  <CategoryBar name="Scalability" score={78} icon={<TrendingUp className="w-4 h-4" />} />
                  <CategoryBar name="Readability" score={74} icon={<Code className="w-4 h-4" />} />
                </div>
              </section>

              {/* Mrs. Puff's Feedback */}
              <section className="max-w-2xl mx-auto">
                <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
                  <div className="flex items-start gap-4">
                    <img src={puffLogo} alt="Mrs. Puff" className="h-12 w-12 rounded-full object-cover flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold mb-2">Mrs. Puff's Feedback</h3>
                      <p className="text-white/70 leading-relaxed">
                        "I've seen worse… but I've also seen much better. Your structure is clean, 
                        which shows promise. However, your error handling needs serious attention — 
                        one unexpected input and your whole automation could crash. 
                        On the bright side, your naming conventions are consistent. That's a passing grade... barely."
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Critical Issues */}
              <section className="max-w-4xl mx-auto space-y-6">
                <h2 className="text-2xl font-bold text-center">Critical Issues Detected</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <IssueCard 
                    automation="Data Sync Workflow"
                    issue="Missing retry logic for API failures"
                    severity="high"
                    impact="Reliability, Data Loss Risk"
                  />
                  <IssueCard 
                    automation="Email Notification Flow"
                    issue="No rate limiting implemented"
                    severity="medium"
                    impact="Cost, Performance"
                  />
                  <IssueCard 
                    automation="User Onboarding"
                    issue="Hardcoded configuration values"
                    severity="medium"
                    impact="Maintainability"
                  />
                  <IssueCard 
                    automation="Report Generator"
                    issue="Inefficient loop structure"
                    severity="low"
                    impact="Performance"
                  />
                </div>
              </section>

              {/* Recommended Fixes */}
              <section className="max-w-4xl mx-auto space-y-6">
                <h2 className="text-2xl font-bold text-center">Recommended Fixes</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <RecommendationCard 
                    title="Add Retry Logic to Data Sync"
                    reason="Implement exponential backoff for API calls to handle transient failures gracefully."
                    improvement="+12 pts"
                  />
                  <RecommendationCard 
                    title="Implement Rate Limiting"
                    reason="Add rate limiting to prevent email flooding and reduce costs."
                    improvement="+8 pts"
                  />
                  <RecommendationCard 
                    title="Extract Configuration"
                    reason="Move hardcoded values to environment variables or config files."
                    improvement="+5 pts"
                  />
                  <RecommendationCard 
                    title="Optimize Loop Structure"
                    reason="Replace nested loops with more efficient data structures."
                    improvement="+3 pts"
                  />
                </div>
              </section>

              {/* Progress Section */}
              <section className="max-w-2xl mx-auto text-center space-y-6 py-8">
                <h2 className="text-2xl font-bold">Your Progress</h2>
                <div className="flex items-center justify-center gap-8">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-white/40">58</p>
                    <p className="text-sm text-white/40">Last Score</p>
                  </div>
                  <ArrowRight className="w-6 h-6 text-white/40" />
                  <div className="text-center">
                    <p className="text-3xl font-bold text-white">{puffScore}</p>
                    <p className="text-sm text-white/60">Current Score</p>
                  </div>
                </div>
                <p className="text-white/50 italic">
                  "Progress is progress. Even SpongeBob had to retake the exam." — Mrs. Puff
                </p>
              </section>

              {/* Upload More CTA */}
              <section className="max-w-xl mx-auto text-center">
                <button 
                  onClick={handleUpload}
                  className="px-8 py-4 bg-white text-black hover:bg-white/90 rounded-xl font-semibold text-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-white/20"
                >
                  Upload Another Automation
                </button>
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
