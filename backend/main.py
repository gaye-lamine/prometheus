import asyncio
import json
import random
import aiosqlite
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import AsyncGenerator, Optional
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel, Field
from enum import Enum

DB_PATH = "prometheus.db"

async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS visitors (
                visitor_id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                display_name TEXT DEFAULT '',
                created_at TEXT NOT NULL
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS simulations (
                simulation_id TEXT PRIMARY KEY,
                visitor_id TEXT NOT NULL,
                persona TEXT NOT NULL,
                ux_debt_score INTEGER NOT NULL,
                grade TEXT NOT NULL,
                success_rate INTEGER NOT NULL,
                max_frustration REAL NOT NULL,
                steps_count INTEGER NOT NULL,
                is_calibrated INTEGER DEFAULT 0,
                target_url TEXT DEFAULT '',
                created_at TEXT NOT NULL
            )
        """)
        await db.commit()

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield

app = FastAPI(
    title="Prometheus Core Engine",
    description="Cognitive User Simulation & Telemetry Stream Server",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for Next.js dev server on port 3000
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AgentAction(str, Enum):
    READ = "READ"
    HOVER = "HOVER"
    CLICK = "CLICK"
    SCROLL = "SCROLL"
    ABANDON = "ABANDON"

class PersonaType(str, Enum):
    IMPATIENT = "IMPATIENT"
    ANALYTICAL = "ANALYTICAL"
    FRUSTRATED = "FRUSTRATED"

class EidolonState(BaseModel):
    agent_id: str
    persona: PersonaType
    current_step: str
    frustration_matrix: float = Field(..., ge=0.0, le=1.0)
    last_action: AgentAction
    target_coordinates: list[int] = Field(default_factory=list) # [x, y, width, height]
    cognitive_log: str

# Concrete simulation scenarios with coordinate maps to actual UI elements
SIMULATION_SCENARIOS = {
    PersonaType.IMPATIENT: [
        {
            "step": "landing_hero",
            "action": AgentAction.READ,
            "coords": [100, 200, 800, 150],
            "log": "Arrived on landing page. Scanning massive text block. Attention span is fading rapidly. Too much marketing fluff.",
            "frustration": 0.25
        },
        {
            "step": "cta_button",
            "action": AgentAction.HOVER,
            "coords": [450, 420, 200, 50],
            "log": "Looking for the primary 'Get Started' button. The contrast is poor. Hovering to verify if it is interactive.",
            "frustration": 0.40
        },
        {
            "step": "onboarding_modal",
            "action": AgentAction.CLICK,
            "coords": [450, 420, 200, 50],
            "log": "Clicked the button. Modal popped up. Asking for too much information (12 input fields). This is annoying.",
            "frustration": 0.65
        },
        {
            "step": "email_input",
            "action": AgentAction.HOVER,
            "coords": [320, 280, 400, 40],
            "log": "Staring at the email field. Auto-fill didn't trigger. I do not want to type my work email manually.",
            "frustration": 0.85
        },
        {
            "step": "abandon_page",
            "action": AgentAction.ABANDON,
            "coords": [0, 0, 0, 0],
            "log": "Friction threshold reached. Frustration is 0.95. Abandoning the simulation onboarding workflow.",
            "frustration": 0.95
        }
    ],
    PersonaType.ANALYTICAL: [
        {
            "step": "landing_hero",
            "action": AgentAction.READ,
            "coords": [100, 200, 800, 150],
            "log": "Analyzing header copy. Value proposition is somewhat clear, but lacks technical architecture description.",
            "frustration": 0.10
        },
        {
            "step": "features_section",
            "action": AgentAction.SCROLL,
            "coords": [0, 800, 1920, 600],
            "log": "Scrolling down to inspect security features, compliance standards, and pricing details. Methodical review.",
            "frustration": 0.15
        },
        {
            "step": "pricing_table_pro",
            "action": AgentAction.HOVER,
            "coords": [750, 1100, 300, 450],
            "log": "Comparing 'Pro' vs 'Enterprise' tiers. Hovering over tooltips to inspect precise API limit exclusions.",
            "frustration": 0.20
        },
        {
            "step": "terms_and_conditions",
            "action": AgentAction.CLICK,
            "coords": [880, 1580, 160, 30],
            "log": "Clicking terms of service link to verify data processing agreement. Loading legal policy.",
            "frustration": 0.30
        },
        {
            "step": "onboarding_modal",
            "action": AgentAction.CLICK,
            "coords": [450, 420, 200, 50],
            "log": "Entering standard analytical onboarding. Checking inputs methodically. Proceeding successfully.",
            "frustration": 0.25
        }
    ],
    PersonaType.FRUSTRATED: [
        {
            "step": "cookie_banner",
            "action": AgentAction.CLICK,
            "coords": [50, 850, 1820, 150],
            "log": "Gigantic cookie modal blocking 80% of view. No obvious 'Decline All' option. Frustration starting at baseline 0.4.",
            "frustration": 0.45
        },
        {
            "step": "email_input",
            "action": AgentAction.HOVER,
            "coords": [320, 280, 400, 40],
            "log": "Clicking email input. Placeholder copy says 'john.doe@company.domain'. Very long and confusing.",
            "frustration": 0.60
        },
        {
            "step": "submit_button",
            "action": AgentAction.CLICK,
            "coords": [400, 600, 240, 50],
            "log": "Attempted to click submit. Validation error is generic: 'Invalid Input'. Which field? Why? Cognitive fatigue setting in.",
            "frustration": 0.88
        },
        {
            "step": "form_wrapper",
            "action": AgentAction.SCROLL,
            "coords": [250, 150, 600, 600],
            "log": "Scrolling back up to find validation errors. None highlighted in red. Crucial UX failure.",
            "frustration": 0.98
        },
        {
            "step": "exit_viewport",
            "action": AgentAction.ABANDON,
            "coords": [0, 0, 0, 0],
            "log": "Maximum cognitive load exceeded. Frustration matrix hit 1.0. Hard drop.",
            "frustration": 1.0
        }
    ]
}

async def event_generator(simulation_id: str, persona: PersonaType, calibrated: bool = False) -> AsyncGenerator[str, None]:
    """
    Simulates user actions chronologically according to selected Persona.
    Streams telemetry state mutations to Next.js Client via SSE.
    """
    try:
        steps = SIMULATION_SCENARIOS.get(persona, SIMULATION_SCENARIOS[PersonaType.ANALYTICAL])
        
        # Adjust steps dynamically if model calibration is activated
        if calibrated:
            if persona == PersonaType.IMPATIENT:
                steps = [
                    {
                        "step": "landing_hero",
                        "action": AgentAction.READ,
                        "coords": [100, 200, 800, 150],
                        "log": "Arrived on landing page. Scanning text block. Attention span is adjusted (+12% Impatient profile calibrated). Reading copy.",
                        "frustration": 0.20
                    },
                    {
                        "step": "cta_button",
                        "action": AgentAction.HOVER,
                        "coords": [450, 420, 200, 50],
                        "log": "Looking for the primary button. Scanning visual contrast. Proceeding.",
                        "frustration": 0.30
                    },
                    {
                        "step": "onboarding_modal",
                        "action": AgentAction.CLICK,
                        "coords": [450, 420, 200, 50],
                        "log": "Clicked primary button. Opening onboarding form overlay.",
                        "frustration": 0.45
                    },
                    {
                        "step": "email_input",
                        "action": AgentAction.HOVER,
                        "coords": [320, 280, 400, 40],
                        "log": "Typing email. Calibration has reduced false positive validations by 4.2%. Form validation passes.",
                        "frustration": 0.50
                    },
                    {
                        "step": "submit_button",
                        "action": AgentAction.CLICK,
                        "coords": [400, 600, 240, 50],
                        "log": "Clicking submit. Form submitted successfully. Cognitive friction has been optimized.",
                        "frustration": 0.52
                    }
                ]
            elif persona == PersonaType.FRUSTRATED:
                steps = [
                    {
                        "step": "cookie_banner",
                        "action": AgentAction.CLICK,
                        "coords": [50, 850, 1820, 150],
                        "log": "Dismissing cookie banner. Banner is visible but easily closeable under calibrated profile.",
                        "frustration": 0.35
                    },
                    {
                        "step": "email_input",
                        "action": AgentAction.HOVER,
                        "coords": [320, 280, 400, 40],
                        "log": "Staring at the email field. Typing email address slowly.",
                        "frustration": 0.45
                    },
                    {
                        "step": "submit_button",
                        "action": AgentAction.CLICK,
                        "coords": [400, 600, 240, 50],
                        "log": "Form submitted. Email validation is calibrated, bypassing false positives. Success!",
                        "frustration": 0.50
                    }
                ]

        agent_id = f"eidolon_{simulation_id[-4:] if len(simulation_id) > 4 else '09'}"
        
        for index, item in enumerate(steps):
            # Simulate processing delay representing human cognition/action speed
            await asyncio.sleep(1.2)
            
            state = EidolonState(
                agent_id=agent_id,
                persona=persona,
                current_step=item["step"],
                frustration_matrix=item["frustration"],
                last_action=item["action"],
                target_coordinates=item["coords"],
                cognitive_log=item["log"]
            )
            
            yield f"event: state_mutation\ndata: {state.model_dump_json()}\n\n"

        # Send end event to signal successful stream completion cleanly
        yield "event: end\ndata: done\n\n"
            
    except asyncio.CancelledError:
        # Graceful cleanup when EventSource closes connection
        pass

@app.get("/api/simulations/{simulation_id}/stream")
async def stream_simulation_telemetry(
    simulation_id: str, 
    persona: PersonaType = PersonaType.ANALYTICAL,
    calibrated: bool = False
):
    """
    SSE stream of simulation events for the specified cohorted persona.
    """
    return StreamingResponse(
        event_generator(simulation_id, persona, calibrated),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "*"
        }
    )

@app.get("/api/proxy")
def proxy_url(url: str):
    """
    High-fidelity HTML proxy server bypassing X-Frame-Options/CORS blocks
    to embed real live target applications for high-wow testing.
    """
    import urllib.request
    import urllib.parse
    import re
    from fastapi import Response
    
    try:
        # Standardize URL schema
        target_url = url if url.startswith(('http://', 'https://')) else f"https://{url}"
        
        req = urllib.request.Request(
            target_url, 
            headers={'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}
        )
        
        with urllib.request.urlopen(req, timeout=8) as response:
            html_bytes = response.read()
            content_charset = response.headers.get_content_charset() or 'utf-8'
            try:
                html = html_bytes.decode(content_charset, errors='ignore')
            except:
                html = html_bytes.decode('utf-8', errors='ignore')
                
            base_url = response.geturl()
            
            # Rewrite relative asset paths (src/href) to absolute URL paths
            def rewrite_asset_url(match):
                attr = match.group(1)
                quote = match.group(2)
                link = match.group(3)
                if not link.startswith(('http:', 'https:', 'data:', 'javascript:', '#')):
                    absolute_link = urllib.parse.urljoin(base_url, link)
                    return f'{attr}={quote}{absolute_link}{quote}'
                return match.group(0)
                
            pattern = re.compile(r'(href|src)\s*=\s*(["\'])(.*?)\2', re.IGNORECASE)
            html = pattern.sub(rewrite_asset_url, html)
            
            # Inject a small script to map DOM elements and handle actions from parent window
            injection = """
            <script>
              // Prevent frame-busting scripts
              window.onbeforeunload = function() { return; };
              
              let mappedElements = [];

              function scanElements() {
                const elements = [];
                const selector = 'button, input, a, select, textarea, [role="button"], [contenteditable="true"]';
                const elList = Array.from(document.querySelectorAll(selector));
                
                elList.forEach((el, index) => {
                  const rect = el.getBoundingClientRect();
                  if (rect.width > 0 && rect.height > 0) {
                    elements.push({
                      index: index,
                      tag: el.tagName.toLowerCase(),
                      type: el.type || '',
                      text: (el.innerText || el.value || el.placeholder || el.title || el.ariaLabel || '').substring(0, 50).trim(),
                      id: el.id || '',
                      className: el.className || '',
                      rect: {
                        x: rect.left,
                        y: rect.top,
                        width: rect.width,
                        height: rect.height
                      }
                    });
                  }
                });
                
                mappedElements = elList;
                window.parent.postMessage({
                  type: 'PROMETHEUS_DOM_MAP',
                  elements: elements
                }, '*');
              }

              // Listen for action instructions from parent
              window.addEventListener('message', (event) => {
                if (event.data && event.data.type === 'PROMETHEUS_ACTION') {
                  const { action, index, value } = event.data;
                  const el = mappedElements[index];
                  if (!el) return;

                  if (action === 'CLICK') {
                    el.focus();
                    el.click();
                    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                  } else if (action === 'HOVER') {
                    el.focus();
                    el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
                    el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
                  } else if (action === 'TYPE') {
                    el.focus();
                    el.value = value;
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                  } else if (action === 'SCROLL_TO_ELEMENT') {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    setTimeout(scanElements, 600);
                  }
                }
              });

              // Force all target blank anchors to open in self to maintain overlay control
              document.addEventListener('DOMContentLoaded', () => {
                document.querySelectorAll('a').forEach(a => {
                  if (a.getAttribute('target') === '_blank') {
                    a.setAttribute('target', '_self');
                  }
                });
              });

              window.addEventListener('load', () => {
                scanElements();
                setInterval(scanElements, 1500);
              });
              window.addEventListener('scroll', scanElements);
              window.addEventListener('resize', scanElements);
            </script>
            """
            html = html.replace("</head>", f"{injection}</head>")
            
            return Response(
                content=html, 
                media_type="text/html",
                headers={
                    "Access-Control-Allow-Origin": "*",
                    "Cache-Control": "no-cache",
                    "X-Frame-Options": "ALLOW-FROM *",
                    "Content-Security-Policy": "frame-ancestors *"
                }
            )
    except Exception as e:
        return Response(
            content=f"<html><body style='font-family:sans-serif;padding:40px;color:#cbd5e1;background:#0f172a;text-align:center;'><h2>Proxy Connection Failed</h2><p style='color:#94a3b8;'>Unable to establish a secure bridge with: {url}</p><p style='font-size:11px;color:#64748b;'>{str(e)}</p></body></html>",
            media_type="text/html",
            status_code=200
        )


# ─── Health Check ─────────────────────────────────────────────────────────────

@app.get("/health")
async def health_check():
    """Simple health check endpoint for uptime monitoring."""
    return {"status": "ok", "version": "1.0.0"}


# ─── Visitor Registration (lightweight auth) ───────────────────────────────────

class VisitorRegisterRequest(BaseModel):
    email: str
    display_name: Optional[str] = ""

@app.post("/api/visitors/register")
async def register_visitor(body: VisitorRegisterRequest):
    """
    Register or retrieve a visitor by email.
    Returns a deterministic visitor_id derived from the email.
    """
    import hashlib
    raw = body.email.strip().lower()
    visitor_id = "usr_" + hashlib.sha256(raw.encode()).hexdigest()[:9]
    now = datetime.now(timezone.utc).isoformat()
    async with aiosqlite.connect(DB_PATH) as db:
        # Insert if not exists (email is unique)
        await db.execute(
            """
            INSERT INTO visitors (visitor_id, email, display_name, created_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(email) DO UPDATE SET display_name = excluded.display_name
            """,
            (visitor_id, raw, body.display_name or "", now)
        )
        await db.commit()
        # Fetch the stored record
        async with db.execute(
            "SELECT visitor_id, email, display_name, created_at FROM visitors WHERE email = ?",
            (raw,)
        ) as cursor:
            row = await cursor.fetchone()
    return {
        "visitor_id": row[0],
        "email": row[1],
        "display_name": row[2],
        "created_at": row[3],
        "account_id": raw.split("@")[-1] if "@" in raw else "unknown"
    }


# ─── Simulation Results Persistence ───────────────────────────────────────────

class SimulationResultRequest(BaseModel):
    visitor_id: str
    persona: str
    ux_debt_score: int
    grade: str
    success_rate: int
    max_frustration: float
    steps_count: int
    is_calibrated: bool = False
    target_url: str = ""

@app.post("/api/simulations/{simulation_id}/results")
async def save_simulation_results(simulation_id: str, body: SimulationResultRequest):
    """Persist simulation results to SQLite for history and shareable reports."""
    now = datetime.now(timezone.utc).isoformat()
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """
            INSERT INTO simulations (
                simulation_id, visitor_id, persona, ux_debt_score, grade,
                success_rate, max_frustration, steps_count, is_calibrated, target_url, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(simulation_id) DO NOTHING
            """,
            (
                simulation_id, body.visitor_id, body.persona, body.ux_debt_score,
                body.grade, body.success_rate, body.max_frustration, body.steps_count,
                1 if body.is_calibrated else 0, body.target_url, now
            )
        )
        await db.commit()
    return {"status": "saved", "simulation_id": simulation_id}


# ─── Shareable Report ──────────────────────────────────────────────────────────

@app.get("/api/simulations/{simulation_id}/report")
async def get_simulation_report(simulation_id: str):
    """Return a simulation report for the shareable /report/[id] page."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            """
            SELECT s.simulation_id, s.persona, s.ux_debt_score, s.grade,
                   s.success_rate, s.max_frustration, s.steps_count, s.created_at,
                   v.display_name, v.email
            FROM simulations s
            LEFT JOIN visitors v ON s.visitor_id = v.visitor_id
            WHERE s.simulation_id = ?
            """,
            (simulation_id,)
        ) as cursor:
            row = await cursor.fetchone()
    if not row:
        return JSONResponse({"error": "Report not found"}, status_code=404)
    return dict(row)


# ─── Visitor Simulation History ────────────────────────────────────────────────

@app.get("/api/simulations/visitor/{visitor_id}")
async def get_visitor_history(visitor_id: str):
    """Return all past simulations for a given visitor (for history reload on mount)."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            """
            SELECT simulation_id, persona, ux_debt_score, grade,
                   success_rate, max_frustration, steps_count, is_calibrated, target_url, created_at
            FROM simulations
            WHERE visitor_id = ?
            ORDER BY created_at DESC
            LIMIT 50
            """,
            (visitor_id,)
        ) as cursor:
            rows = await cursor.fetchall()
    return [dict(r) for r in rows]


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)

