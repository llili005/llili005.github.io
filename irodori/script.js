/* ===== COLOR CODE — interactions ===== */
(() => {
  'use strict';

  /* ---------------- loader ---------------- */
  const loader = document.getElementById('loader');
  const ldBar = loader?.querySelector('.ld-bar i');
  if (ldBar) requestAnimationFrame(() => { ldBar.style.transition = 'width 1s cubic-bezier(.16,1,.3,1)'; ldBar.style.width = '100%'; });
  window.addEventListener('load', () => setTimeout(() => loader?.classList.add('done'), 650));

  /* ---------------- nav ---------------- */
  const nav = document.getElementById('nav');
  const ham = document.getElementById('ham');
  const menu = document.getElementById('menu');
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 40);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
  ham?.addEventListener('click', () => { ham.classList.toggle('on'); menu.classList.toggle('open'); });
  menu?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => { ham.classList.remove('on'); menu.classList.remove('open'); }));

  /* ---------------- reveal on scroll ---------------- */
  const io = new IntersectionObserver((es) => {
    es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.14, rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.rv').forEach(el => io.observe(el));
  setTimeout(() => document.querySelectorAll('.rvh').forEach(el => el.classList.add('in')), 700);

  /* ---------------- count up ---------------- */
  const cio = new IntersectionObserver((es) => {
    es.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target, to = +el.dataset.to, t0 = performance.now(), dur = 1400;
      const tick = (t) => {
        const p = Math.min((t - t0) / dur, 1);
        el.textContent = Math.round((1 - Math.pow(1 - p, 3)) * to);
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      cio.unobserve(el);
    });
  }, { threshold: 0.6 });
  document.querySelectorAll('.count').forEach(el => cio.observe(el));

  /* ---------------- FAQ accordion ---------------- */
  document.querySelectorAll('.faq-item').forEach(item => {
    const q = item.querySelector('.faq-q');
    const a = item.querySelector('.faq-a');
    q.addEventListener('click', () => {
      const open = item.classList.contains('on');
      document.querySelectorAll('.faq-item.on').forEach(o => { o.classList.remove('on'); o.querySelector('.faq-a').style.maxHeight = null; });
      if (!open) { item.classList.add('on'); a.style.maxHeight = a.scrollHeight + 'px'; }
    });
  });

  /* ---------------- pointer (mouse + finger) ---------------- */
  const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
  // target in 0..1 (y down); moved flag toggles the idle auto-drift off
  const P = { tx: .5, ty: .5, interacted: false };
  const setTarget = (cx, cy) => { P.tx = cx / innerWidth; P.ty = cy / innerHeight; P.interacted = true; };
  window.addEventListener('pointermove', (e) => setTarget(e.clientX, e.clientY), { passive: true });
  window.addEventListener('touchmove', (e) => { const t = e.touches[0]; if (t) setTarget(t.clientX, t.clientY); }, { passive: true });

  /* ---------------- iridescent cursor-trail (WebGL feedback buffers) ---------------- */
  const glCanvas = document.getElementById('gl');
  let ok = false;
  if (!reduce) ok = initTrail(glCanvas);
  if (!ok) glCanvas.style.background =
    'radial-gradient(60% 60% at 30% 25%,rgba(255,143,192,.30),transparent 60%),' +
    'radial-gradient(55% 55% at 75% 65%,rgba(143,220,255,.28),transparent 60%),#ffffff';

  function initTrail(canvas) {
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
    if (!gl) return false;

    /* --- shaders --- */
    const VS = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;

    // UPDATE: decay + diffuse previous frame, then inject a rainbow splat along the cursor path
    const FS_UPDATE = `
      precision highp float;
      uniform sampler2D u_tex;
      uniform vec2 u_res;         // sim resolution (px)
      uniform float u_time;
      uniform vec2 u_p;           // current pointer (0..1, y up)
      uniform vec2 u_pp;          // previous pointer
      uniform float u_amt;        // injection strength (speed based)
      uniform float u_hue;        // moving hue offset
      // softer pastel palette (reduced amplitude -> gentler rainbow)
      vec3 pal(float t){return 0.6+0.4*cos(6.28318*(vec3(1.0)*t+vec3(0.0,0.33,0.67)));}
      float segDist(vec2 p, vec2 a, vec2 b){
        vec2 pa=p-a, ba=b-a;
        float h=clamp(dot(pa,ba)/max(dot(ba,ba),1e-6),0.,1.);
        return length(pa-ba*h);
      }
      void main(){
        vec2 uv=gl_FragCoord.xy/u_res;
        vec2 px=1.0/u_res;
        // diffuse (soft spread) + decay -> smoky dissipation
        vec3 c = texture2D(u_tex,uv).rgb*0.68;
        c += texture2D(u_tex,uv+vec2(px.x,0.)).rgb*0.08;
        c += texture2D(u_tex,uv-vec2(px.x,0.)).rgb*0.08;
        c += texture2D(u_tex,uv+vec2(0.,px.y)).rgb*0.08;
        c += texture2D(u_tex,uv-vec2(0.,px.y)).rgb*0.08;
        c *= 0.982;               // fade speed (lower = disappears faster); brewgood-like lingering

        // aspect-corrected distance to the cursor stroke (prev -> current)
        float ar = u_res.x/u_res.y;
        vec2  fp = vec2(uv.x*ar, uv.y);
        vec2  a  = vec2(u_pp.x*ar, u_pp.y);
        vec2  b  = vec2(u_p.x*ar,  u_p.y);
        float d  = segDist(fp, a, b);
        float radius = 0.075;
        float splat  = exp(-(d*d)/(radius*radius)) * u_amt;

        // rainbow hue varies along the stroke + over time -> multicolor smear
        float hue = u_hue + (u_p.x*1.3 + u_p.y*0.9);
        vec3  col = pal(hue);
        c += col * splat * 0.55;   // gentle injection -> pale build-up

        gl_FragColor = vec4(min(c, 1.2), 1.0);
      }`;

    // DISPLAY: composite the accumulated rainbow ink softly over white
    const FS_SHOW = `
      precision highp float;
      uniform sampler2D u_tex;
      uniform vec2 u_res;
      void main(){
        vec2 uv=gl_FragCoord.xy/u_res;
        vec3 ink=texture2D(u_tex,uv).rgb;
        float a=clamp(max(ink.r,max(ink.g,ink.b))*0.9, 0.0, 1.0);
        vec3 c=clamp(ink/max(a,1e-4), 0.0, 1.0);      // recover hue
        c=mix(c, vec3(1.0), 0.42);                     // softer, paler pastel
        vec3 col=mix(vec3(1.0), c, a*0.72);            // over white
        gl_FragColor=vec4(col,1.0);
      }`;

    const compile = (type, src) => {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; }
      return s;
    };
    const link = (fsSrc) => {
      const v = compile(gl.VERTEX_SHADER, VS), f = compile(gl.FRAGMENT_SHADER, fsSrc);
      if (!v || !f) return null;
      const pr = gl.createProgram(); gl.attachShader(pr, v); gl.attachShader(pr, f); gl.linkProgram(pr);
      if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { console.warn(gl.getProgramInfoLog(pr)); return null; }
      return pr;
    };
    const progUpdate = link(FS_UPDATE), progShow = link(FS_SHOW);
    if (!progUpdate || !progShow) return false;

    // fullscreen triangle
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    [progUpdate, progShow].forEach(pr => {
      const loc = gl.getAttribLocation(pr, 'p');
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    });

    const U = {
      u_tex: gl.getUniformLocation(progUpdate, 'u_tex'),
      u_res: gl.getUniformLocation(progUpdate, 'u_res'),
      u_time: gl.getUniformLocation(progUpdate, 'u_time'),
      u_p: gl.getUniformLocation(progUpdate, 'u_p'),
      u_pp: gl.getUniformLocation(progUpdate, 'u_pp'),
      u_amt: gl.getUniformLocation(progUpdate, 'u_amt'),
      u_hue: gl.getUniformLocation(progUpdate, 'u_hue'),
    };
    const S = { u_tex: gl.getUniformLocation(progShow, 'u_tex'), u_res: gl.getUniformLocation(progShow, 'u_res') };

    // ping-pong targets (byte RGBA — universally renderable)
    let simW, simH, dispW, dispH, A, B;
    const makeTarget = (w, h) => {
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const fbo = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
      return { tex, fbo };
    };
    const alloc = () => {
      const mobile = innerWidth <= 820;
      const ddpr = Math.min(devicePixelRatio || 1, mobile ? 1 : 1.5);   // cap DPR on phones
      const simScale = mobile ? 0.34 : 0.5;                              // lighter sim on phones
      dispW = Math.floor(innerWidth * ddpr); dispH = Math.floor(innerHeight * ddpr);
      canvas.width = dispW; canvas.height = dispH;
      simW = Math.max(2, Math.floor(innerWidth * simScale));   // low-res sim -> naturally soft "もや"
      simH = Math.max(2, Math.floor(innerHeight * simScale));
      A = makeTarget(simW, simH); B = makeTarget(simW, simH);
    };
    alloc();
    let resizeT;
    addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(alloc, 150); });

    // pointer state in sim space (y up)
    const pt = { x: .5, y: .5 };              // smoothed current
    let prevX = .5, prevY = .5;
    let running = true;
    document.addEventListener('visibilitychange', () => { running = !document.hidden; if (running) requestAnimationFrame(loop); });

    const start = performance.now();
    let lastDraw = 0;
    function loop(now) {
      if (!running) return;
      requestAnimationFrame(loop);
      // throttle to ~30fps on phones to keep scrolling smooth
      if (innerWidth <= 820 && now - lastDraw < 32) return;
      lastDraw = now;
      const time = (now - start) / 1000;

      // resolve target: idle auto-drift until the user moves, then follow pointer
      let targetX, targetY;
      if (P.interacted) { targetX = P.tx; targetY = 1 - P.ty; }
      else {
        targetX = 0.5 + 0.30 * Math.sin(time * 0.55);
        targetY = 0.5 + 0.22 * Math.sin(time * 0.90 + 1.3);
      }
      // smooth follow for a flowing stroke
      pt.x += (targetX - pt.x) * 0.18;
      pt.y += (targetY - pt.y) * 0.18;

      const speed = Math.hypot(pt.x - prevX, pt.y - prevY);
      const amt = Math.min(speed * 9.0, 1.0);           // paint only where the cursor moves

      // --- UPDATE pass: render into B, reading A ---
      gl.useProgram(progUpdate);
      gl.bindFramebuffer(gl.FRAMEBUFFER, B.fbo);
      gl.viewport(0, 0, simW, simH);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, A.tex);
      gl.uniform1i(U.u_tex, 0);
      gl.uniform2f(U.u_res, simW, simH);
      gl.uniform1f(U.u_time, time);
      gl.uniform2f(U.u_p, pt.x, pt.y);
      gl.uniform2f(U.u_pp, prevX, prevY);
      gl.uniform1f(U.u_amt, amt);
      gl.uniform1f(U.u_hue, time * 0.14);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      // --- DISPLAY pass: B -> screen over white ---
      gl.useProgram(progShow);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, dispW, dispH);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, B.tex);
      gl.uniform1i(S.u_tex, 0);
      gl.uniform2f(S.u_res, dispW, dispH);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      prevX = pt.x; prevY = pt.y;
      const t = A; A = B; B = t;                          // swap
    }
    requestAnimationFrame(loop);
    return true;
  }
})();
