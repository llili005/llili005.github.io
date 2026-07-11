'use strict';

/*---------- オープニング / ローダー ----------*/
const opening = document.querySelector('.js_opening');
const openingBar = opening?.querySelector('.m_opening_bar-inner');
if (openingBar) {
  requestAnimationFrame(() => {
    openingBar.style.transition = 'width 1s cubic-bezier(0.16, 1, 0.3, 1)';
    openingBar.style.width = '100%';
  });
}
window.addEventListener('load', () => {
  setTimeout(() => opening?.classList.add('is-hidden'), 650);
});

/*---------- ヘッダー（スクロール状態） ----------*/
const header = document.querySelector('.js_header');
const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 40);
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

/*---------- ハンバーガーメニュー ----------*/
const hamburger = document.querySelector('.js_hamburger');
const navigation = document.querySelector('.js_nav');
hamburger?.addEventListener('click', () => {
  hamburger.classList.toggle('is-active');
  navigation.classList.toggle('is-active');
});
navigation?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    hamburger.classList.remove('is-active');
    navigation.classList.remove('is-active');
  });
});

/*---------- フローティング・コンタクトボタン（contact 表示中は隠す） ----------*/
(() => {
  const floatBtn = document.querySelector('.js_contact-float');
  const contactSection = document.querySelector('#contact');
  if (!floatBtn || !contactSection) return;
  const contactObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        floatBtn.classList.toggle('is-hidden', entry.isIntersecting);
      });
    },
    { threshold: 0.25 }
  );
  contactObserver.observe(contactSection);
})();

/*---------- サービス下層：左ナビのスクロール連動（scrollspy） ----------*/
(() => {
  const links = [...document.querySelectorAll('.service_nav_link')];
  const sections = [...document.querySelectorAll('.service_item')];
  if (!links.length || !sections.length) return;
  const linkById = new Map(links.map((l) => [l.getAttribute('href').slice(1), l]));
  const spy = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((l) => l.classList.remove('is-active'));
        linkById.get(entry.target.id)?.classList.add('is-active');
      });
    },
    { rootMargin: '-45% 0px -50% 0px', threshold: 0 }
  );
  sections.forEach((s) => spy.observe(s));
})();

/*---------- スクロールで表示（reveal） ----------*/
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-in');
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.14, rootMargin: '0px 0px -8% 0px' }
);
document.querySelectorAll('.js_reveal').forEach((el) => revealObserver.observe(el));

/*---------- 数字のカウントアップ ----------*/
const countObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const to = Number(el.dataset.to);
      const t0 = performance.now();
      const dur = 1400;
      const tick = (t) => {
        const p = Math.min((t - t0) / dur, 1);
        el.textContent = Math.round((1 - Math.pow(1 - p, 3)) * to);
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      countObserver.unobserve(el);
    });
  },
  { threshold: 0.6 }
);
document.querySelectorAll('.js_count').forEach((el) => countObserver.observe(el));

/*---------- FAQ アコーディオン ----------*/
document.querySelectorAll('.js_faq').forEach((item) => {
  const question = item.querySelector('.top_faq_q');
  const answer = item.querySelector('.top_faq_a');
  question.addEventListener('click', () => {
    const isOpen = item.classList.contains('is-open');
    document.querySelectorAll('.js_faq.is-open').forEach((openItem) => {
      openItem.classList.remove('is-open');
      openItem.querySelector('.top_faq_a').style.maxHeight = null;
    });
    if (!isOpen) {
      item.classList.add('is-open');
      answer.style.maxHeight = answer.scrollHeight + 'px';
    }
  });
});

/*---------- 実績スライダー（自動送り + 指スワイプ / SP） ----------*/
(() => {
  const slider = document.querySelector('.js_works-slider');
  const track = slider?.querySelector('.top_works_track');
  const first = track?.querySelector('.top_works_item');
  const firstDup = track?.querySelector('.top_works_item[aria-hidden="true"]');
  if (!slider || !first || !firstDup) return;

  const isSP = () => matchMedia('(max-width: 820px)').matches;
  const loopW = () => Math.max(1, firstDup.offsetLeft - first.offsetLeft); // 1セット分の正確な幅
  const speed = 0.6; // px/frame
  let paused = false;
  let resumeTimer = 0;
  let run = true;

  const pause = () => {
    paused = true;
    clearTimeout(resumeTimer);
  };
  const resumeSoon = () => {
    clearTimeout(resumeTimer);
    resumeTimer = setTimeout(() => (paused = false), 1500);
  };
  slider.addEventListener('touchstart', pause, { passive: true });
  slider.addEventListener('touchend', resumeSoon, { passive: true });
  slider.addEventListener('touchcancel', resumeSoon, { passive: true });
  document.addEventListener('visibilitychange', () => {
    run = !document.hidden;
    if (run) requestAnimationFrame(tick);
  });

  function tick() {
    if (!run) return;
    if (isSP() && !paused) {
      // PC は CSS マーキー、SP は JS で scrollLeft を進める
      slider.scrollLeft += speed;
      const w = loopW();
      if (slider.scrollLeft >= w) slider.scrollLeft -= w;
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();

/*---------- ポインタ（マウス + 指） ----------*/
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const pointer = { tx: 0.5, ty: 0.5, interacted: false };
const setPointer = (cx, cy) => {
  pointer.tx = cx / innerWidth;
  pointer.ty = cy / innerHeight;
  pointer.interacted = true;
};
window.addEventListener('pointermove', (e) => setPointer(e.clientX, e.clientY), { passive: true });
window.addEventListener(
  'touchmove',
  (e) => {
    const t = e.touches[0];
    if (t) setPointer(t.clientX, t.clientY);
  },
  { passive: true }
);

/*---------- 虹色トレイル背景（WebGL フィードバックバッファ） ----------*/
const glCanvas = document.querySelector('.js_gl');
let glReady = false;
if (!reduceMotion) glReady = initTrail(glCanvas);
if (!glReady) {
  glCanvas.style.background =
    'radial-gradient(60% 60% at 30% 25%, rgba(255, 143, 192, 0.3), transparent 60%),' +
    'radial-gradient(55% 55% at 75% 65%, rgba(143, 220, 255, 0.28), transparent 60%), #ffffff';
}

function initTrail(canvas) {
  const gl = canvas.getContext('webgl', {
    antialias: false,
    alpha: false,
    depth: false,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: false,
  });
  if (!gl) return false;

  const VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';

  // 更新パス : 減衰 + 拡散したうえで、カーソル軌跡に虹色を注入
  const FS_UPDATE = `
    precision highp float;
    uniform sampler2D u_tex;
    uniform vec2 u_res;
    uniform float u_time;
    uniform vec2 u_p;
    uniform vec2 u_pp;
    uniform float u_amt;
    uniform float u_hue;
    vec3 pal(float t){return 0.6+0.4*cos(6.28318*(vec3(1.0)*t+vec3(0.0,0.33,0.67)));}
    float segDist(vec2 p, vec2 a, vec2 b){
      vec2 pa=p-a, ba=b-a;
      float h=clamp(dot(pa,ba)/max(dot(ba,ba),1e-6),0.,1.);
      return length(pa-ba*h);
    }
    void main(){
      vec2 uv=gl_FragCoord.xy/u_res;
      vec2 px=1.0/u_res;
      vec3 c = texture2D(u_tex,uv).rgb*0.68;
      c += texture2D(u_tex,uv+vec2(px.x,0.)).rgb*0.08;
      c += texture2D(u_tex,uv-vec2(px.x,0.)).rgb*0.08;
      c += texture2D(u_tex,uv+vec2(0.,px.y)).rgb*0.08;
      c += texture2D(u_tex,uv-vec2(0.,px.y)).rgb*0.08;
      c *= 0.982;
      float ar = u_res.x/u_res.y;
      vec2  fp = vec2(uv.x*ar, uv.y);
      vec2  a  = vec2(u_pp.x*ar, u_pp.y);
      vec2  b  = vec2(u_p.x*ar,  u_p.y);
      float d  = segDist(fp, a, b);
      float radius = 0.075;
      float splat  = exp(-(d*d)/(radius*radius)) * u_amt;
      float hue = u_hue + (u_p.x*1.3 + u_p.y*0.9);
      vec3  col = pal(hue);
      c += col * splat * 0.55;
      gl_FragColor = vec4(min(c, 1.2), 1.0);
    }`;

  // 表示パス : 溜まった虹インクを白背景に淡く合成
  const FS_SHOW = `
    precision highp float;
    uniform sampler2D u_tex;
    uniform vec2 u_res;
    void main(){
      vec2 uv=gl_FragCoord.xy/u_res;
      vec3 ink=texture2D(u_tex,uv).rgb;
      float a=clamp(max(ink.r,max(ink.g,ink.b))*0.9, 0.0, 1.0);
      vec3 c=clamp(ink/max(a,1e-4), 0.0, 1.0);
      c=mix(c, vec3(1.0), 0.42);
      vec3 col=mix(vec3(1.0), c, a*0.72);
      gl_FragColor=vec4(col,1.0);
    }`;

  const compile = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn(gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  };
  const link = (fsSrc) => {
    const v = compile(gl.VERTEX_SHADER, VS);
    const f = compile(gl.FRAGMENT_SHADER, fsSrc);
    if (!v || !f) return null;
    const pr = gl.createProgram();
    gl.attachShader(pr, v);
    gl.attachShader(pr, f);
    gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) {
      console.warn(gl.getProgramInfoLog(pr));
      return null;
    }
    return pr;
  };
  const progUpdate = link(FS_UPDATE);
  const progShow = link(FS_SHOW);
  if (!progUpdate || !progShow) return false;

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  [progUpdate, progShow].forEach((pr) => {
    const loc = gl.getAttribLocation(pr, 'p');
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  });

  const U = {
    tex: gl.getUniformLocation(progUpdate, 'u_tex'),
    res: gl.getUniformLocation(progUpdate, 'u_res'),
    time: gl.getUniformLocation(progUpdate, 'u_time'),
    p: gl.getUniformLocation(progUpdate, 'u_p'),
    pp: gl.getUniformLocation(progUpdate, 'u_pp'),
    amt: gl.getUniformLocation(progUpdate, 'u_amt'),
    hue: gl.getUniformLocation(progUpdate, 'u_hue'),
  };
  const S = {
    tex: gl.getUniformLocation(progShow, 'u_tex'),
    res: gl.getUniformLocation(progShow, 'u_res'),
  };

  let simW;
  let simH;
  let dispW;
  let dispH;
  let A;
  let B;
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
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    return { tex, fbo };
  };
  const alloc = () => {
    const mobile = innerWidth <= 820;
    const ddpr = Math.min(devicePixelRatio || 1, mobile ? 1 : 1.5);
    const simScale = mobile ? 0.34 : 0.5;
    dispW = Math.floor(innerWidth * ddpr);
    dispH = Math.floor(innerHeight * ddpr);
    canvas.width = dispW;
    canvas.height = dispH;
    simW = Math.max(2, Math.floor(innerWidth * simScale));
    simH = Math.max(2, Math.floor(innerHeight * simScale));
    A = makeTarget(simW, simH);
    B = makeTarget(simW, simH);
  };
  alloc();
  let resizeTimer;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(alloc, 150);
  });

  const pt = { x: 0.5, y: 0.5 };
  let prevX = 0.5;
  let prevY = 0.5;
  let running = true;
  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running) requestAnimationFrame(loop);
  });

  const start = performance.now();
  let lastDraw = 0;
  function loop(now) {
    if (!running) return;
    requestAnimationFrame(loop);
    // SP はスクロールを滑らかに保つため約30fpsに制限
    if (innerWidth <= 820 && now - lastDraw < 32) return;
    lastDraw = now;
    const time = (now - start) / 1000;

    let targetX;
    let targetY;
    if (pointer.interacted) {
      targetX = pointer.tx;
      targetY = 1 - pointer.ty;
    } else {
      targetX = 0.5 + 0.3 * Math.sin(time * 0.55);
      targetY = 0.5 + 0.22 * Math.sin(time * 0.9 + 1.3);
    }
    pt.x += (targetX - pt.x) * 0.18;
    pt.y += (targetY - pt.y) * 0.18;

    const speed = Math.hypot(pt.x - prevX, pt.y - prevY);
    const amt = Math.min(speed * 9.0, 1.0);

    gl.useProgram(progUpdate);
    gl.bindFramebuffer(gl.FRAMEBUFFER, B.fbo);
    gl.viewport(0, 0, simW, simH);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, A.tex);
    gl.uniform1i(U.tex, 0);
    gl.uniform2f(U.res, simW, simH);
    gl.uniform1f(U.time, time);
    gl.uniform2f(U.p, pt.x, pt.y);
    gl.uniform2f(U.pp, prevX, prevY);
    gl.uniform1f(U.amt, amt);
    gl.uniform1f(U.hue, time * 0.14);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.useProgram(progShow);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, dispW, dispH);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, B.tex);
    gl.uniform1i(S.tex, 0);
    gl.uniform2f(S.res, dispW, dispH);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    prevX = pt.x;
    prevY = pt.y;
    const swap = A;
    A = B;
    B = swap;
  }
  requestAnimationFrame(loop);
  return true;
}
