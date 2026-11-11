/* ============================================================
   函数绘图室 · graph.js
   1) 数学引擎：词法 → 语法树 → 编译为 JS 闭包
   2) 绘图引擎：网格 / 坐标轴 / 曲线 / 缩放平移
   3) 自由组装：拖点 → 多项式拟合 → 生成解析式
   4) 虚拟键盘 / 科学计算器
   ============================================================ */

(function () {
  'use strict';

  /* ============================================================
     一、数学引擎
     ============================================================ */

  var CONSTS = {
    pi: Math.PI,
    '\u03c0': Math.PI,   // π
    e: Math.E,
    tau: Math.PI * 2
  };

  /* 函数表：a = 允许的参数个数 */
  var FN = {
    sin:   { a: [1], f: Math.sin },
    cos:   { a: [1], f: Math.cos },
    tan:   { a: [1], f: Math.tan },
    asin:  { a: [1], f: Math.asin },
    acos:  { a: [1], f: Math.acos },
    atan:  { a: [1], f: Math.atan },
    sec:   { a: [1], f: null },
    csc:   { a: [1], f: null },
    cot:   { a: [1], f: null },
    sinh:  { a: [1], f: null },
    cosh:  { a: [1], f: null },
    tanh:  { a: [1], f: null },
    ln:    { a: [1], f: Math.log },
    lg:    { a: [1], f: null },
    log:   { a: [1, 2], f: null },
    log2:  { a: [1], f: null },
    sqrt:  { a: [1], f: Math.sqrt },
    cbrt:  { a: [1], f: Math.cbrt },
    abs:   { a: [1], f: Math.abs },
    exp:   { a: [1], f: Math.exp },
    floor: { a: [1], f: Math.floor },
    ceil:  { a: [1], f: Math.ceil },
    round: { a: [1], f: Math.round },
    sign:  { a: [1], f: Math.sign },
    min:   { a: [1, 2, 3, 4, 5], f: null },
    max:   { a: [1, 2, 3, 4, 5], f: null },
    mod:   { a: [2], f: null },
    pow:   { a: [2], f: null },
    atan2: { a: [2], f: null }
  };

  /* 阶乘（整数用循环，非整数用 Lanczos Gamma） */
  function gamma(z) {
    var C = [
      0.99999999999980993, 676.5203681218851, -1259.1392167224028,
      771.32342877765313, -176.61502916214059, 12.507343278686905,
      -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7
    ];
    if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z));
    z -= 1;
    var x = C[0];
    for (var i = 1; i < 9; i++) x += C[i] / (z + i);
    var t = z + 7.5;
    return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
  }

  function factorial(v) {
    if (!isFinite(v)) return NaN;
    if (v < 0 && Math.abs(v - Math.round(v)) < 1e-9) return NaN;
    if (Math.abs(v - Math.round(v)) < 1e-9 && v < 171) {
      var r = 1;
      for (var i = 2; i <= v; i++) r *= i;
      return r;
    }
    return gamma(v + 1);
  }

  /* 数字与符号规范化 */
  function normalize(src) {
    return String(src)
      .replace(/[\u00d7\u00b7]/g, '*')     // × ·
      .replace(/\u00f7/g, '/')             // ÷
      .replace(/[\u2212\u2013\u2014]/g, '-') // − – —
      .replace(/\uff08/g, '(')
      .replace(/\uff09/g, ')')
      .replace(/\uff0c/g, ',')
      .replace(/\u00a0/g, ' ')
      .replace(/\s+/g, '');
  }

  /* 词法分析 */
  function tokenize(s) {
    var toks = [];
    var i = 0;

    while (i < s.length) {
      var c = s.charAt(i);

      if ((c >= '0' && c <= '9') || c === '.') {
        var st = i, dot = false;
        while (i < s.length) {
          var ch = s.charAt(i);
          if (ch >= '0' && ch <= '9') { i++; continue; }
          if (ch === '.') {
            if (dot) break;
            dot = true; i++; continue;
          }
          break;
        }
        var numStr = s.slice(st, i);
        if (i < s.length && (s.charAt(i) === 'e' || s.charAt(i) === 'E')) {
          var save = i, j = i + 1;
          if (s.charAt(j) === '+' || s.charAt(j) === '-') j++;
          if (j < s.length && s.charAt(j) >= '0' && s.charAt(j) <= '9') {
            while (j < s.length && s.charAt(j) >= '0' && s.charAt(j) <= '9') j++;
            numStr += s.slice(save, j);
            i = j;
          }
        }
        var val = parseFloat(numStr);
        if (!isFinite(val)) throw new Error('数字不合法：' + numStr);
        toks.push({ t: 'num', v: val });
        continue;
      }

      if ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '\u03c0') {
        if (c === '\u03c0') { i++; toks.push({ t: 'id', v: '\u03c0' }); continue; }
        var st2 = i;
        while (i < s.length) {
          var ch2 = s.charAt(i);
          if ((ch2 >= 'a' && ch2 <= 'z') || (ch2 >= 'A' && ch2 <= 'Z') ||
              (ch2 >= '0' && ch2 <= '9') || ch2 === '_') { i++; continue; }
          break;
        }
        toks.push({ t: 'id', v: s.slice(st2, i) });
        continue;
      }

      if (c === '(') { toks.push({ t: '(' }); i++; continue; }
      if (c === ')') { toks.push({ t: ')' }); i++; continue; }
      if (c === ',') { toks.push({ t: ',' }); i++; continue; }
      if (c === '|') { toks.push({ t: '|' }); i++; continue; }
      if (c === '!') { toks.push({ t: '!' }); i++; continue; }
      if (c === '+' || c === '-' || c === '*' || c === '/' || c === '^' || c === '%') {
        toks.push({ t: 'op', v: c }); i++; continue;
      }

      throw new Error('无法识别的字符：' + c);
    }
    return toks;
  }

  /* 语法分析（递归下降） */
  function parse(src) {
    var toks = tokenize(normalize(src));
    var pos = 0;

    function peek() { return toks[pos]; }
    function next() { return toks[pos++]; }
    function expect(t, msg) {
      if (!toks[pos] || toks[pos].t !== t) throw new Error(msg || ('缺少 ' + t));
      return toks[pos++];
    }

    function startsPrimary(tk) {
      if (!tk) return false;
      return tk.t === 'num' || tk.t === 'id' || tk.t === '(' || tk.t === '|';
    }

    function parseExpr() { return parseAdd(); }

    function parseAdd() {
      var node = parseMul();
      while (true) {
        var tk = peek();
        if (!tk || tk.t !== 'op' || (tk.v !== '+' && tk.v !== '-')) break;
        var op = next().v;
        node = { type: 'bin', op: op, a: node, b: parseMul() };
      }
      return node;
    }

    function parseMul() {
      var node = parseUnary();
      while (true) {
        var tk = peek();
        if (!tk) break;
        if (tk.t === 'op' && (tk.v === '*' || tk.v === '/' || tk.v === '%')) {
          var op = next().v;
          node = { type: 'bin', op: op, a: node, b: parseUnary() };
          continue;
        }
        /* 隐式乘法：2x、3(x+1)、x sin(x)、(x+1)(x-1) */
        if (startsPrimary(tk)) {
          node = { type: 'bin', op: '*', a: node, b: parseUnary() };
          continue;
        }
        break;
      }
      return node;
    }

    function parseUnary() {
      var tk = peek();
      if (tk && tk.t === 'op' && (tk.v === '-' || tk.v === '+')) {
        next();
        var operand = parseUnary();
        return tk.v === '-' ? { type: 'un', op: '-', a: operand } : operand;
      }
      return parsePower();
    }

    function parsePower() {
      var base = parsePostfix();
      var tk = peek();
      if (tk && tk.t === 'op' && tk.v === '^') {
        next();
        var exp = parseUnary();   /* 右结合，且支持 2^-1 */
        return { type: 'bin', op: '^', a: base, b: exp };
      }
      return base;
    }

    function parsePostfix() {
      var node = parsePrimary();
      while (peek() && peek().t === '!') {
        next();
        node = { type: 'fact', a: node };
      }
      return node;
    }

    function parsePrimary() {
      var tk = peek();
      if (!tk) throw new Error('表达式不完整');

      if (tk.t === 'num') { next(); return { type: 'num', v: tk.v }; }

      if (tk.t === 'id') {
        next();
        var name = tk.v;
        var low = name.toLowerCase();

        var known = FN[low] || low === 'x' || CONSTS[low] !== undefined;
        if (!known) throw new Error('未知名称：' + name);

        if (peek() && peek().t === '(') {
          if (!FN[low]) throw new Error(name + ' 不是函数');
          next();
          var args = [];
          if (peek() && peek().t === ')') {
            next();
          } else {
            args.push(parseExpr());
            while (peek() && peek().t === ',') { next(); args.push(parseExpr()); }
            expect(')', '缺少右括号');
          }
          var spec = FN[low];
          if (spec.a.indexOf(args.length) < 0) {
            throw new Error(name + ' 需要 ' + spec.a.join(' 或 ') + ' 个参数');
          }
          return { type: 'call', name: low, args: args };
        }

        if (low === 'x') return { type: 'var', name: 'x' };
        if (CONSTS[low] !== undefined) return { type: 'num', v: CONSTS[low] };
        throw new Error(name + ' 后面缺少括号');
      }

      if (tk.t === '(') {
        next();
        var inner = parseExpr();
        expect(')', '缺少右括号');
        return inner;
      }

      if (tk.t === '|') {
        next();
        var v = parseExpr();
        expect('|', '绝对值缺少右竖线');
        return { type: 'call', name: 'abs', args: [v] };
      }

      throw new Error('无法解析：' + (tk.v || tk.t));
    }

    var ast = parseExpr();
    if (pos < toks.length) {
      var left = toks[pos];
      throw new Error('多余的符号：' + (left.v || left.t));
    }
    return ast;
  }

  /* 编译为可执行闭包 */
  function buildCall(name, args, K, INV) {
    var f0 = args[0], f1 = args[1];

    switch (name) {
      case 'sin':  return function (x) { return Math.sin(K * f0(x)); };
      case 'cos':  return function (x) { return Math.cos(K * f0(x)); };
      case 'tan':  return function (x) { return Math.tan(K * f0(x)); };
      case 'asin': return function (x) { return INV * Math.asin(f0(x)); };
      case 'acos': return function (x) { return INV * Math.acos(f0(x)); };
      case 'atan': return function (x) { return INV * Math.atan(f0(x)); };

      case 'sec':  return function (x) { return 1 / Math.cos(K * f0(x)); };
      case 'csc':  return function (x) { return 1 / Math.sin(K * f0(x)); };
      case 'cot':  return function (x) { return 1 / Math.tan(K * f0(x)); };

      case 'sinh': return function (x) { var v = f0(x); return (Math.exp(v) - Math.exp(-v)) / 2; };
      case 'cosh': return function (x) { var v = f0(x); return (Math.exp(v) + Math.exp(-v)) / 2; };
      case 'tanh': return function (x) { var v = f0(x); var a = Math.exp(v), b = Math.exp(-v); return (a - b) / (a + b); };

      case 'lg':   return function (x) { return Math.log(f0(x)) / Math.LN10; };
      case 'log2': return function (x) { return Math.log(f0(x)) / Math.LN2; };
      case 'log':
        return args.length === 2
          ? function (x) { return Math.log(f0(x)) / Math.log(f1(x)); }
          : function (x) { return Math.log(f0(x)) / Math.LN10; };

      case 'min':
        return function (x) {
          var m = f0(x);
          for (var i = 1; i < args.length; i++) m = Math.min(m, args[i](x));
          return m;
        };
      case 'max':
        return function (x) {
          var m = f0(x);
          for (var i = 1; i < args.length; i++) m = Math.max(m, args[i](x));
          return m;
        };

      case 'mod':   return function (x) { return f0(x) % f1(x); };
      case 'pow':   return function (x) { return Math.pow(f0(x), f1(x)); };
      case 'atan2': return function (x) { return Math.atan2(f0(x), f1(x)); };

      default:
        var f = FN[name].f;
        return function (x) { return f(f0(x)); };
    }
  }

  function compileAst(node, K, INV) {
    switch (node.type) {
      case 'num':
        var v = node.v;
        return function () { return v; };

      case 'var':
        return function (x) { return x; };

      case 'un':
        var a0 = compileAst(node.a, K, INV);
        return function (x) { return -a0(x); };

      case 'fact':
        var a1 = compileAst(node.a, K, INV);
        return function (x) { return factorial(a1(x)); };

      case 'bin':
        var fa = compileAst(node.a, K, INV);
        var fb = compileAst(node.b, K, INV);
        switch (node.op) {
          case '+': return function (x) { return fa(x) + fb(x); };
          case '-': return function (x) { return fa(x) - fb(x); };
          case '*': return function (x) { return fa(x) * fb(x); };
          case '/': return function (x) { return fa(x) / fb(x); };
          case '%': return function (x) { return fa(x) % fb(x); };
          case '^': return function (x) { return Math.pow(fa(x), fb(x)); };
        }
        break;

      case 'call':
        var argFns = [];
        for (var i = 0; i < node.args.length; i++) {
          argFns.push(compileAst(node.args[i], K, INV));
        }
        return buildCall(node.name, argFns, K, INV);
    }
    throw new Error('表达式结构异常');
  }

  var MathCore = {
    compile: function (src, opts) {
      var deg = !!(opts && opts.deg);
      var K = deg ? Math.PI / 180 : 1;
      var INV = deg ? 180 / Math.PI : 1;
      var ast = parse(src);
      return compileAst(ast, K, INV);
    },
    evaluate: function (src, x, opts) {
      return this.compile(src, opts)(x);
    }
  };

  /* ============================================================
     二、应用状态
     ============================================================ */

  var COLORS = ['#6ec8ff', '#ff6b9d', '#ffd93d', '#6ee7b7', '#c084fc', '#ff9f43', '#4ade80', '#f472b6'];

  var state = {
    exprs: [],
    mode: 'plot',
    pts: [],
    fitCoef: null,
    dragIdx: -1,
    panning: false,
    candidateAdd: false,
    pointerStart: null,
    activeInput: null
  };

  var view = { cx: 0, cy: 0, scale: 46 };
  var cv = null, ctx = null;
  var W = 0, H = 0, DPR = 1;

  var PALETTE = {
    dark: {
      bg: '#1a1625',
      minor: 'rgba(255,255,255,.045)',
      major: 'rgba(255,255,255,.10)',
      axis: '#857b9c',
      text: '#8f8577',
      curve: '#6ec8ff',
      point: '#ff6b9d',
      fit: '#ffd93d',
      labelBg: 'rgba(26,22,37,.85)'
    },
    light: {
      bg: '#f4efe4',
      minor: 'rgba(0,0,0,.045)',
      major: 'rgba(0,0,0,.09)',
      axis: '#8a8070',
      text: '#6b6358',
      curve: '#2a7fb8',
      point: '#d6457a',
      fit: '#b8860b',
      labelBg: 'rgba(244,239,228,.88)'
    }
  };

  function pal() {
    return document.body.getAttribute('data-theme') === 'light' ? PALETTE.light : PALETTE.dark;
  }

  /* ============================================================
     三、工具函数
     ============================================================ */

  function $(id) { return document.getElementById(id); }

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  function fmtNum(v) {
    if (!isFinite(v)) return '';
    if (Math.abs(v) < 1e-10) return '0';
    var a = Math.abs(v);
    if (a >= 1e6 || a < 1e-4) return v.toExponential(1);
    var s = v.toFixed(3);
    if (s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
    return s;
  }

  function fmtCoef(v) {
    var s = v.toFixed(3);
    if (s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
    return s;
  }

  var toastTimer = null;
  function toast(msg) {
    var el = $('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 1700);
  }

  /* ============================================================
     四、坐标变换
     ============================================================ */

  function xToPx(x) { return W / 2 + (x - view.cx) * view.scale; }
  function yToPx(y) { return H / 2 - (y - view.cy) * view.scale; }
  function pxToX(px) { return view.cx + (px - W / 2) / view.scale; }
  function pxToY(py) { return view.cy - (py - H / 2) / view.scale; }

  /* 1-2-5 取整 */
  function niceStep(targetPx) {
    var raw = targetPx / view.scale;
    if (!isFinite(raw) || raw <= 0) return 1;
    var p = Math.pow(10, Math.floor(Math.log10(raw)));
    var n = raw / p;
    var m = n <= 1 ? 1 : (n <= 2 ? 2 : (n <= 5 ? 5 : 10));
    return m * p;
  }

  /* ============================================================
     五、绘制
     ============================================================ */

  function resize() {
    var stage = $('stage');
    if (!stage || !cv) return;
    var rect = stage.getBoundingClientRect();
    W = Math.max(1, Math.round(rect.width));
    H = Math.max(1, Math.round(rect.height));
    DPR = window.devicePixelRatio || 1;
    cv.width = Math.round(W * DPR);
    cv.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    draw();
  }

  function drawGrid() {
    var p = pal();
    var major = niceStep(82);
    var minor = major / 5;

    var xMin = pxToX(0), xMax = pxToX(W);
    var yMin = pxToY(H), yMax = pxToY(0);

    /* 次网格 */
    ctx.lineWidth = 1;
    ctx.strokeStyle = p.minor;
    ctx.beginPath();
    var step = minor;
    var startX = Math.ceil(xMin / step) * step;
    for (var x = startX; x <= xMax; x += step) {
      var px = Math.round(xToPx(x)) + 0.5;
      ctx.moveTo(px, 0); ctx.lineTo(px, H);
    }
    var startY = Math.ceil(yMin / step) * step;
    for (var y = startY; y <= yMax; y += step) {
      var py = Math.round(yToPx(y)) + 0.5;
      ctx.moveTo(0, py); ctx.lineTo(W, py);
    }
    ctx.stroke();

    /* 主网格 */
    ctx.strokeStyle = p.major;
    ctx.beginPath();
    var sx = Math.ceil(xMin / major) * major;
    for (var x2 = sx; x2 <= xMax; x2 += major) {
      var px2 = Math.round(xToPx(x2)) + 0.5;
      ctx.moveTo(px2, 0); ctx.lineTo(px2, H);
    }
    var sy = Math.ceil(yMin / major) * major;
    for (var y2 = sy; y2 <= yMax; y2 += major) {
      var py2 = Math.round(yToPx(y2)) + 0.5;
      ctx.moveTo(0, py2); ctx.lineTo(W, py2);
    }
    ctx.stroke();

    /* 坐标轴 */
    var axisY = clamp(yToPx(0), 0, H);
    var axisX = clamp(xToPx(0), 0, W);

    ctx.strokeStyle = p.axis;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, Math.round(axisY) + 0.5);
    ctx.lineTo(W, Math.round(axisY) + 0.5);
    ctx.moveTo(Math.round(axisX) + 0.5, 0);
    ctx.lineTo(Math.round(axisX) + 0.5, H);
    ctx.stroke();

    /* 刻度文字 */
    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.fillStyle = p.text;

    /* x 轴数字 */
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    var labelY = clamp(axisY + 5, 0, H - 14);
    for (var xv = sx; xv <= xMax; xv += major) {
      if (Math.abs(xv) < major * 1e-6) continue;
      var lx = xToPx(xv);
      if (lx < 18 || lx > W - 18) continue;
      drawLabel(fmtNum(xv), lx, labelY, 'center', 'top', p);
    }

    /* y 轴数字 */
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    var labelX = clamp(axisX - 6, 26, W);
    for (var yv = sy; yv <= yMax; yv += major) {
      if (Math.abs(yv) < major * 1e-6) continue;
      var ly = yToPx(yv);
      if (ly < 10 || ly > H - 10) continue;
      drawLabel(fmtNum(yv), labelX, ly, 'right', 'middle', p);
    }

    /* 原点 */
    if (axisX > 12 && axisX < W - 12 && axisY > 12 && axisY < H - 12) {
      drawLabel('0', clamp(axisX - 7, 4, W - 10), clamp(axisY + 5, 0, H - 14), 'right', 'top', p);
    }
  }

  function drawLabel(text, x, y, align, baseline, p) {
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    var w = ctx.measureText(text).width;
    var pad = 3;
    var bx = x, by = y;
    if (align === 'center') bx = x - w / 2;
    else if (align === 'right') bx = x - w;

    ctx.fillStyle = p.labelBg;
    ctx.fillRect(bx - pad, (baseline === 'middle' ? y - 7 : y) - 1, w + pad * 2, 14);
    ctx.fillStyle = p.text;
    ctx.fillText(text, x, y);
  }

  function drawCurve(fn, color, width) {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = width || 2.2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    var stepPx = 1;
    var started = false;
    var prevPy = null;
    var jumpLimit = H * 3;

    for (var px = 0; px <= W; px += stepPx) {
      var x = pxToX(px);
      var y;
      try { y = fn(x); } catch (e) { y = NaN; }

      if (!isFinite(y)) { started = false; prevPy = null; continue; }

      var py = yToPx(y);
      if (!isFinite(py) || py < -1e6 || py > 1e6) { started = false; prevPy = null; continue; }

      if (started && prevPy !== null && Math.abs(py - prevPy) > jumpLimit) {
        started = false;   /* 视为间断点，断开曲线 */
      }

      if (!started) {
        ctx.moveTo(px, py);
        started = true;
      } else {
        ctx.lineTo(px, py);
      }
      prevPy = py;
    }
    ctx.stroke();
  }

  function drawAssemblePoints() {
    var p = pal();
    for (var i = 0; i < state.pts.length; i++) {
      var px = xToPx(state.pts[i].x);
      var py = yToPx(state.pts[i].y);

      ctx.beginPath();
      ctx.arc(px, py, 7, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,107,157,.22)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.fillStyle = p.point;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(i + 1), px, py + 0.5);
    }
  }

  function draw() {
    if (!ctx) return;
    var p = pal();

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, W, H);

    drawGrid();

    /* 普通函数曲线 */
    for (var i = 0; i < state.exprs.length; i++) {
      var e = state.exprs[i];
      if (!e.visible || !e.fn) continue;
      drawCurve(e.fn, e.color, 2.2);
    }

    /* 自由组装 */
    if (state.mode === 'assemble') {
      if (state.fitCoef && state.fitCoef.length) {
        drawCurve(polyFn(state.fitCoef), p.fit, 2.6);
      }
      drawAssemblePoints();
    }
  }

  /* ============================================================
     六、表达式列表
     ============================================================ */

  function recompile() {
    for (var i = 0; i < state.exprs.length; i++) {
      var e = state.exprs[i];
      e.error = '';
      e.fn = null;
      var src = String(e.src || '')
        .replace(/^\s*y\s*=\s*/i, '')
        .replace(/^\s*f\s*\(\s*x\s*\)\s*=\s*/i, '')
        .trim();
      if (!src) continue;
      try {
        e.fn = MathCore.compile(src, { deg: false });
      } catch (err) {
        e.error = err.message;
      }
    }
    updateErrors();
    draw();
  }

  function updateErrors() {
    var list = $('exprList');
    if (!list) return;
    var rows = list.querySelectorAll('.expr');
    for (var i = 0; i < rows.length; i++) {
      var id = rows[i].getAttribute('data-id');
      var item = null;
      for (var j = 0; j < state.exprs.length; j++) {
        if (state.exprs[j].id === id) { item = state.exprs[j]; break; }
      }
      if (!item) continue;
      var errEl = rows[i].querySelector('.expr__error');
      if (item.error) {
        rows[i].classList.add('is-error');
        if (errEl) errEl.textContent = item.error;
      } else {
        rows[i].classList.remove('is-error');
        if (errEl) errEl.textContent = '';
      }
    }
  }

  function renderExprList() {
    var list = $('exprList');
    if (!list) return;
    list.innerHTML = '';

    for (var i = 0; i < state.exprs.length; i++) {
      var e = state.exprs[i];

      var row = document.createElement('div');
      row.className = 'expr' + (e.error ? ' is-error' : '');
      row.setAttribute('data-id', e.id);

      var color = document.createElement('span');
      color.className = 'expr__color';
      color.style.setProperty('--c', e.color);

      var eq = document.createElement('span');
      eq.className = 'expr__eq';
      eq.textContent = 'y=';

      var input = document.createElement('input');
      input.className = 'expr__input';
      input.type = 'text';
      input.spellcheck = false;
      input.autocomplete = 'off';
      input.placeholder = '例如 sin(x)';
      input.value = e.src;

      var eye = document.createElement('button');
      eye.className = 'expr__eye' + (e.visible ? '' : ' off');
      eye.type = 'button';
      eye.textContent = e.visible ? '👁' : '🚫';
      eye.title = '显示 / 隐藏';

      var del = document.createElement('button');
      del.className = 'expr__del';
      del.type = 'button';
      del.textContent = '✕';
      del.title = '删除';

      var err = document.createElement('div');
      err.className = 'expr__error';

      row.appendChild(color);
      row.appendChild(eq);
      row.appendChild(input);
      row.appendChild(eye);
      row.appendChild(del);
      row.appendChild(err);
      list.appendChild(row);

      bindExprRow(row, e, input, eye, del, color);
    }
  }

  function bindExprRow(row, item, input, eye, del, color) {
    input.addEventListener('input', function () {
      item.src = input.value;
      recompile();
    });

    input.addEventListener('focus', function () {
      state.activeInput = input;
    });

    eye.addEventListener('click', function () {
      item.visible = !item.visible;
      eye.textContent = item.visible ? '👁' : '🚫';
      eye.classList.toggle('off', !item.visible);
      draw();
    });

    del.addEventListener('click', function () {
      var next = [];
      for (var i = 0; i < state.exprs.length; i++) {
        if (state.exprs[i].id !== item.id) next.push(state.exprs[i]);
      }
      state.exprs = next;
      renderExprList();
      recompile();
    });

    color.addEventListener('click', function () {
      var idx = COLORS.indexOf(item.color);
      item.color = COLORS[(idx + 1) % COLORS.length];
      color.style.setProperty('--c', item.color);
      draw();
    });
  }

  function addExpr(text, colorIndex, silent) {
    var idx = colorIndex === undefined ? state.exprs.length : colorIndex;
    var item = {
      id: 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      color: COLORS[idx % COLORS.length],
      src: text || '',
      visible: true,
      fn: null,
      error: ''
    };
    state.exprs.push(item);
    renderExprList();
    recompile();

    if (!silent) {
      var list = $('exprList');
      if (list) {
        var rows = list.querySelectorAll('.expr__input');
        var last = rows[rows.length - 1];
        if (last) { last.focus(); state.activeInput = last; }
      }
    }
    return item;
  }

  /* ============================================================
     七、多项式拟合（最小二乘 / 精确插值）
     ============================================================ */

  function solveLinear(A, b) {
    var n = b.length;
    var i, j, k;

    for (i = 0; i < n; i++) {
      var pivot = i;
      for (k = i + 1; k < n; k++) {
        if (Math.abs(A[k][i]) > Math.abs(A[pivot][i])) pivot = k;
      }
      if (Math.abs(A[pivot][i]) < 1e-12) return null;

      if (pivot !== i) {
        var tmp = A[i]; A[i] = A[pivot]; A[pivot] = tmp;
        var tb = b[i]; b[i] = b[pivot]; b[pivot] = tb;
      }

      for (k = i + 1; k < n; k++) {
        var factor = A[k][i] / A[i][i];
        if (!isFinite(factor)) return null;
        for (j = i; j < n; j++) A[k][j] -= factor * A[i][j];
        b[k] -= factor * b[i];
      }
    }

    var x = new Array(n);
    for (i = n - 1; i >= 0; i--) {
      var sum = b[i];
      for (j = i + 1; j < n; j++) sum -= A[i][j] * x[j];
      x[i] = sum / A[i][i];
      if (!isFinite(x[i])) return null;
    }
    return x;
  }

  function fitPolynomial(points, degree) {
    var n = points.length;
    if (n === 0) return null;

    var d;
    if (degree > 0) d = Math.min(degree, n - 1);
    else d = Math.min(n - 1, 6);
    if (d < 0) d = 0;

    var m = d + 1;
    var A = [], b = [];
    var i, r, c;

    for (r = 0; r < m; r++) {
      A.push(new Array(m));
      for (c = 0; c < m; c++) A[r][c] = 0;
      b.push(0);
    }

    for (i = 0; i < n; i++) {
      var x = points[i].x, y = points[i].y;
      var pw = [];
      var v = 1;
      for (var k = 0; k < 2 * m - 1; k++) { pw.push(v); v *= x; }
      for (r = 0; r < m; r++) {
        for (c = 0; c < m; c++) A[r][c] += pw[r + c];
        b[r] += y * pw[r];
      }
    }

    var coef = solveLinear(A, b);
    if (!coef) return null;
    return coef;
  }

  function polyFn(coef) {
    return function (x) {
      var v = 0;
      for (var i = coef.length - 1; i >= 0; i--) v = v * x + coef[i];
      return v;
    };
  }

  function polyToString(coef) {
    var parts = [];
    for (var i = coef.length - 1; i >= 0; i--) {
      var c = coef[i];
      if (Math.abs(c) < 1e-8) continue;
      var sign = c < 0 ? '-' : '+';
      var a = Math.abs(c);
      var body;
      if (i === 0) {
        body = fmtCoef(a);
      } else {
        var coefStr = Math.abs(a - 1) < 1e-8 ? '' : fmtCoef(a);
        body = coefStr + (i === 1 ? 'x' : 'x^' + i);
      }
      parts.push({ sign: sign, body: body });
    }
    if (!parts.length) return '0';

    var out = (parts[0].sign === '-' ? '-' : '') + parts[0].body;
    for (var j = 1; j < parts.length; j++) {
      out += ' ' + parts[j].sign + ' ' + parts[j].body;
    }
    return out;
  }

  function refit() {
    var degEl = $('fitDeg');
    var deg = degEl ? parseInt(degEl.value, 10) : 0;

    /* 保证 x 唯一（同 x 取平均） */
    var sorted = state.pts.slice().sort(function (a, b) { return a.x - b.x; });
    var uniq = [];
    for (var i = 0; i < sorted.length; i++) {
      var last = uniq[uniq.length - 1];
      if (last && Math.abs(last.x - sorted[i].x) < 1e-9) {
        last.y = (last.y + sorted[i].y) / 2;
      } else {
        uniq.push({ x: sorted[i].x, y: sorted[i].y });
      }
    }

    state.fitCoef = null;

    var outEl = $('fitOut');
    var infoEl = $('ptsInfo');

    if (uniq.length === 0) {
      if (outEl) outEl.textContent = '— 还没有端点 —';
      if (infoEl) infoEl.textContent = '';
      draw();
      return;
    }

    var coef = fitPolynomial(uniq, deg);
    if (!coef) {
      if (outEl) outEl.textContent = '无法拟合（端点 x 过于集中）';
      if (infoEl) infoEl.textContent = '端点数量：' + state.pts.length;
      draw();
      return;
    }

    state.fitCoef = coef;
    var txt = 'y = ' + polyToString(coef);
    if (outEl) outEl.textContent = txt;
    if (infoEl) infoEl.textContent = '端点数量：' + state.pts.length + ' · 次数：' + (coef.length - 1);
    draw();
  }

  /* ============================================================
     八、画布交互
     ============================================================ */

  function nearestPointIndex(px, py) {
    var best = -1, bestD = 14;
    for (var i = 0; i < state.pts.length; i++) {
      var dx = xToPx(state.pts[i].x) - px;
      var dy = yToPx(state.pts[i].y) - py;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d < bestD) { bestD = d; best = i; }
    }
    return best;
  }

  function bindCanvas() {
    cv.addEventListener('pointerdown', function (ev) {
      try { cv.setPointerCapture(ev.pointerId); } catch (e) {}
      var rect = cv.getBoundingClientRect();
      var px = ev.clientX - rect.left;
      var py = ev.clientY - rect.top;

      state.pointerStart = { px: px, py: py, clientX: ev.clientX, clientY: ev.clientY, moved: false };

      if (state.mode === 'assemble' && ev.button === 0) {
        var idx = nearestPointIndex(px, py);
        if (idx >= 0) {
          state.dragIdx = idx;
          state.candidateAdd = false;
        } else {
          state.dragIdx = -1;
          state.candidateAdd = true;
        }
      } else {
        state.panning = true;
        state.candidateAdd = false;
        cv.style.cursor = 'grabbing';
      }
    });

    cv.addEventListener('pointermove', function (ev) {
      var rect = cv.getBoundingClientRect();
      var px = ev.clientX - rect.left;
      var py = ev.clientY - rect.top;

      updateCoords(px, py);

      if (state.dragIdx >= 0) {
        state.pts[state.dragIdx] = { x: pxToX(px), y: pxToY(py) };
        refit();
        return;
      }

      if (state.panning && state.pointerStart) {
        var dx = ev.clientX - state.pointerStart.clientX;
        var dy = ev.clientY - state.pointerStart.clientY;
        if (Math.abs(dx) + Math.abs(dy) > 3) state.pointerStart.moved = true;
        view.cx -= dx / view.scale;
        view.cy += dy / view.scale;
        state.pointerStart.clientX = ev.clientX;
        state.pointerStart.clientY = ev.clientY;
        draw();
        return;
      }

      if (state.candidateAdd && state.pointerStart) {
        var ddx = px - state.pointerStart.px;
        var ddy = py - state.pointerStart.py;
        if (Math.sqrt(ddx * ddx + ddy * ddy) > 6) {
          state.candidateAdd = false;
          state.panning = true;
          state.pointerStart.clientX = ev.clientX;
          state.pointerStart.clientY = ev.clientY;
        }
      }
    });

    cv.addEventListener('pointerup', function (ev) {
      if (state.candidateAdd) {
        var rect = cv.getBoundingClientRect();
        var px = ev.clientX - rect.left;
        var py = ev.clientY - rect.top;
        if (px >= 0 && px <= W && py >= 0 && py <= H) {
          state.pts.push({ x: pxToX(px), y: pxToY(py) });
          refit();
        }
      }
      state.dragIdx = -1;
      state.panning = false;
      state.candidateAdd = false;
      cv.style.cursor = state.mode === 'assemble' ? 'crosshair' : 'grab';
    });

    cv.addEventListener('pointercancel', function () {
      state.dragIdx = -1;
      state.panning = false;
      state.candidateAdd = false;
    });

    /* 右键删除端点 */
    cv.addEventListener('contextmenu', function (ev) {
      if (state.mode !== 'assemble') return;
      ev.preventDefault();
      var rect = cv.getBoundingClientRect();
      var idx = nearestPointIndex(ev.clientX - rect.left, ev.clientY - rect.top);
      if (idx >= 0) {
        state.pts.splice(idx, 1);
        refit();
      }
    });

    /* 滚轮缩放 */
    cv.addEventListener('wheel', function (ev) {
      ev.preventDefault();
      var rect = cv.getBoundingClientRect();
      var mx = ev.clientX - rect.left;
      var my = ev.clientY - rect.top;

      var wx = pxToX(mx), wy = pxToY(my);
      var factor = Math.exp(-ev.deltaY * 0.0013);
      var ns = clamp(view.scale * factor, 3, 600);
      if (ns === view.scale) return;

      view.scale = ns;
      view.cx = wx - (mx - W / 2) / view.scale;
      view.cy = wy + (my - H / 2) / view.scale;

      draw();
      updateCoords(mx, my);
    }, { passive: false });

    /* 双击复位 */
    cv.addEventListener('dblclick', function () {
      resetView();
    });
  }

  function updateCoords(px, py) {
    var el = $('coords');
    if (!el) return;
    el.textContent = 'x = ' + pxToX(px).toFixed(2) + ', y = ' + pxToY(py).toFixed(2);
  }

  function resetView() {
    view.cx = 0;
    view.cy = 0;
    view.scale = 46;
    draw();
    toast('视图已复位');
  }

  function zoomBy(factor) {
    var wx = view.cx, wy = view.cy;
    view.scale = clamp(view.scale * factor, 3, 600);
    view.cx = wx;
    view.cy = wy;
    draw();
  }

  /* ============================================================
     九、虚拟键盘
     ============================================================ */

  var KB_MAIN = [
    { l: 'x', i: 'x' }, { l: 'π', i: 'π' }, { l: 'e', i: 'e' },
    { l: '(', i: '(' }, { l: ')', i: ')' }, { l: ',', i: ',' },

    { l: '+', i: '+', c: 'op' }, { l: '−', i: '-', c: 'op' }, { l: '×', i: '*', c: 'op' },
    { l: '÷', i: '/', c: 'op' }, { l: '^', i: '^', c: 'op' }, { l: '⌫', a: 'back', c: 'act' },

    { l: '7', i: '7', c: 'num' }, { l: '8', i: '8', c: 'num' }, { l: '9', i: '9', c: 'num' },
    { l: 'sin', i: 'sin(', c: 'fn' }, { l: 'cos', i: 'cos(', c: 'fn' }, { l: 'tan', i: 'tan(', c: 'fn' },

    { l: '4', i: '4', c: 'num' }, { l: '5', i: '5', c: 'num' }, { l: '6', i: '6', c: 'num' },
    { l: 'sin⁻¹', i: 'asin(', c: 'fn' }, { l: 'cos⁻¹', i: 'acos(', c: 'fn' }, { l: 'tan⁻¹', i: 'atan(', c: 'fn' },

    { l: '1', i: '1', c: 'num' }, { l: '2', i: '2', c: 'num' }, { l: '3', i: '3', c: 'num' },
    { l: 'ln', i: 'ln(', c: 'fn' }, { l: 'log', i: 'log(', c: 'fn' }, { l: '√', i: 'sqrt(', c: 'fn' },

    { l: '0', i: '0', c: 'num' }, { l: '.', i: '.', c: 'num' }, { l: '|x|', i: 'abs(', c: 'fn' },
    { l: 'x²', i: '^2', c: 'op' }, { l: 'x³', i: '^3', c: 'op' }, { l: 'C', a: 'clear', c: 'act' }
  ];

  var KB_MORE = [
    { l: 'sinh', i: 'sinh(', c: 'fn' }, { l: 'cosh', i: 'cosh(', c: 'fn' }, { l: 'tanh', i: 'tanh(', c: 'fn' },
    { l: 'exp', i: 'exp(', c: 'fn' }, { l: 'floor', i: 'floor(', c: 'fn' }, { l: 'ceil', i: 'ceil(', c: 'fn' },
    { l: 'round', i: 'round(', c: 'fn' }, { l: 'sign', i: 'sign(', c: 'fn' }, { l: 'log₂', i: 'log2(', c: 'fn' },
    { l: 'min', i: 'min(', c: 'fn' }, { l: 'max', i: 'max(', c: 'fn' }, { l: '!', i: '!', c: 'op' }
  ];

  var kbExpanded = false;

  function buildKeyboard() {
    var box = $('kb');
    if (!box) return;
    box.innerHTML = '';

    var all = KB_MAIN.slice();
    if (kbExpanded) all = all.concat(KB_MORE);

    for (var i = 0; i < all.length; i++) {
      var k = all[i];
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'kb-btn' + (k.c ? ' kb-btn--' + k.c : '');
      btn.textContent = k.l;
      bindKey(btn, k);
      box.appendChild(btn);
    }

    var more = document.createElement('button');
    more.type = 'button';
    more.className = 'kb-btn kb-btn--more';
    more.textContent = kbExpanded ? '收起更多符号 ▲' : '更多函数 ▼';
    more.addEventListener('click', function () {
      kbExpanded = !kbExpanded;
      buildKeyboard();
    });
    box.appendChild(more);
  }

  function bindKey(btn, k) {
    btn.addEventListener('mousedown', function (ev) { ev.preventDefault(); });
    btn.addEventListener('click', function () {
      var target = state.activeInput;
      if (!target) {
        var first = document.querySelector('.expr__input');
        if (first) { target = first; state.activeInput = first; }
      }
      if (!target) return;

      if (k.a === 'back') { doBackspace(target); return; }
      if (k.a === 'clear') { doClear(target); return; }
      insertText(target, k.i);
    });
  }

  function insertText(el, text) {
    var start = (el.selectionStart === null || el.selectionStart === undefined) ? el.value.length : el.selectionStart;
    var end = (el.selectionEnd === null || el.selectionEnd === undefined) ? el.value.length : el.selectionEnd;
    el.value = el.value.slice(0, start) + text + el.value.slice(end);
    var caret = start + text.length;
    el.focus();
    try { el.setSelectionRange(caret, caret); } catch (e) {}
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function doBackspace(el) {
    var start = (el.selectionStart === null || el.selectionStart === undefined) ? el.value.length : el.selectionStart;
    var end = (el.selectionEnd === null || el.selectionEnd === undefined) ? el.value.length : el.selectionEnd;
    if (start === end && start > 0) start -= 1;
    el.value = el.value.slice(0, start) + el.value.slice(end);
    el.focus();
    try { el.setSelectionRange(start, start); } catch (e) {}
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function doClear(el) {
    el.value = '';
    el.focus();
    try { el.setSelectionRange(0, 0); } catch (e) {}
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }

  /* ============================================================
     十、科学计算器
     ============================================================ */

  var calcState = {
    deg: false,
    second: false,
    history: []
  };

  var CALC_KEYS = [
    { l: '2nd', a: 'second', c: 'act' },
    { l: 'DEG', a: 'deg', c: 'act' },
    { l: '⌫', a: 'back', c: 'act' },
    { l: 'C', a: 'clear', c: 'act' },
    { l: '(', i: '(', c: 'op' },
    { l: ')', i: ')', c: 'op' },

    { l: 'sin', i: 'sin(', c: 'fn', alt: { l: 'sin⁻¹', i: 'asin(' } },
    { l: 'cos', i: 'cos(', c: 'fn', alt: { l: 'cos⁻¹', i: 'acos(' } },
    { l: 'tan', i: 'tan(', c: 'fn', alt: { l: 'tan⁻¹', i: 'atan(' } },
    { l: '7', i: '7', c: 'num' },
    { l: '8', i: '8', c: 'num' },
    { l: '9', i: '9', c: 'num' },

    { l: 'ln', i: 'ln(', c: 'fn', alt: { l: 'eˣ', i: 'exp(' } },
    { l: 'log', i: 'log(', c: 'fn', alt: { l: '10ˣ', i: '10^' } },
    { l: '√', i: 'sqrt(', c: 'fn', alt: { l: '∛', i: 'cbrt(' } },
    { l: '4', i: '4', c: 'num' },
    { l: '5', i: '5', c: 'num' },
    { l: '6', i: '6', c: 'num' },

    { l: 'x²', i: '^2', c: 'fn' },
    { l: 'x³', i: '^3', c: 'fn' },
    { l: 'xʸ', i: '^', c: 'fn' },
    { l: '1', i: '1', c: 'num' },
    { l: '2', i: '2', c: 'num' },
    { l: '3', i: '3', c: 'num' },

    { l: 'π', i: 'π', c: 'fn' },
    { l: 'e', i: 'e', c: 'fn' },
    { l: '!', i: '!', c: 'fn' },
    { l: '0', i: '0', c: 'num' },
    { l: '.', i: '.', c: 'num' },
    { l: '=', a: 'eq', c: 'eq' },

    { l: '1/x', i: '1/(', c: 'fn' },
    { l: '|x|', i: 'abs(', c: 'fn' },
    { l: '+', i: '+', c: 'op' },
    { l: '−', i: '-', c: 'op' },
    { l: '×', i: '*', c: 'op' },
    { l: '÷', i: '/', c: 'op' }
  ];

  function buildCalc() {
    var box = $('calcKeys');
    if (!box) return;
    box.innerHTML = '';

    for (var i = 0; i < CALC_KEYS.length; i++) {
      var k = CALC_KEYS[i];
      var btn = document.createElement('button');
      btn.type = 'button';

      var label = k.l;
      var ins = k.i;
      if (calcState.second && k.alt) {
        label = k.alt.l;
        ins = k.alt.i;
      }

      var cls = 'calc-btn' + (k.c ? ' calc-btn--' + k.c : '');
      if ((k.a === 'deg' && calcState.deg) || (k.a === 'second' && calcState.second)) {
        cls += ' is-on';
      }
      if (k.a === 'deg') label = calcState.deg ? 'DEG' : 'RAD';

      btn.className = cls;
      btn.textContent = label;

      (function (key, insert) {
        btn.addEventListener('mousedown', function (ev) { ev.preventDefault(); });
        btn.addEventListener('click', function () { handleCalcKey(key, insert); });
      })(k, ins);

      box.appendChild(btn);
    }
  }

  function handleCalcKey(k, ins) {
    var input = $('calcInput');
    if (!input) return;

    if (k.a === 'second') {
      calcState.second = !calcState.second;
      buildCalc();
      return;
    }
    if (k.a === 'deg') {
      calcState.deg = !calcState.deg;
      buildCalc();
      calcPreview();
      return;
    }
    if (k.a === 'back') { doBackspace(input); return; }
    if (k.a === 'clear') { doClear(input); return; }
    if (k.a === 'eq') { calcEvaluate(); return; }

    insertText(input, ins);
    calcPreview();
  }

  function calcPreview() {
    var input = $('calcInput');
    var out = $('calcResult');
    if (!input || !out) return;

    var src = input.value.trim();
    if (!src) {
      out.textContent = '= 0';
      out.classList.remove('is-error');
      return;
    }

    try {
      var fn = MathCore.compile(src, { deg: calcState.deg });
      var v = fn(0);
      if (typeof v !== 'number' || !isFinite(v)) {
        out.textContent = '= 无法求值';
        out.classList.add('is-error');
        return;
      }
      out.textContent = '= ' + fmtCalc(v);
      out.classList.remove('is-error');
    } catch (err) {
      out.textContent = '= ' + err.message;
      out.classList.add('is-error');
    }
  }

  function fmtCalc(v) {
    if (!isFinite(v)) return '∞';
    if (Math.abs(v) < 1e-12) return '0';
    var a = Math.abs(v);
    if (a >= 1e12 || a < 1e-6) return v.toExponential(6);
    var s = String(parseFloat(v.toPrecision(10)));
    return s;
  }

  function calcEvaluate() {
    var input = $('calcInput');
    var out = $('calcResult');
    if (!input || !out) return;

    var src = input.value.trim();
    if (!src) return;

    try {
      var fn = MathCore.compile(src, { deg: calcState.deg });
      var v = fn(0);
      if (!isFinite(v)) throw new Error('结果不是有限数');

      var shown = fmtCalc(v);
      out.textContent = '= ' + shown;
      out.classList.remove('is-error');

      calcState.history.unshift({ expr: src, result: shown });
      if (calcState.history.length > 8) calcState.history.length = 8;
      renderCalcHistory();

      input.value = shown;
      try { input.setSelectionRange(shown.length, shown.length); } catch (e) {}
    } catch (err) {
      out.textContent = '= ' + err.message;
      out.classList.add('is-error');
    }
  }

  function renderCalcHistory() {
    var box = $('calcHistory');
    if (!box) return;
    box.innerHTML = '';
    for (var i = 0; i < calcState.history.length; i++) {
      (function (h) {
        var d = document.createElement('div');
        d.className = 'hist-item';
        d.textContent = h.expr + ' = ' + h.result;
        d.title = '点击填入';
        d.addEventListener('click', function () {
          var input = $('calcInput');
          if (!input) return;
          input.value = h.expr;
          input.focus();
          try { input.setSelectionRange(h.expr.length, h.expr.length); } catch (e) {}
          state.activeInput = input;
          calcPreview();
        });
        box.appendChild(d);
      })(calcState.history[i]);
    }
  }

  /* ============================================================
     十一、主题 / 面板 / 模式
     ============================================================ */

  var THEME_KEY = 'paperink-v2-theme';

  function applyTheme(theme) {
    if (theme === 'light') document.body.setAttribute('data-theme', 'light');
    else document.body.removeAttribute('data-theme');
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
    var btn = $('themeBtn');
    if (btn) btn.textContent = theme === 'light' ? '☀️' : '🌙';
    draw();
  }

  function initTheme() {
    var t = 'dark';
    try { t = localStorage.getItem(THEME_KEY) || 'dark'; } catch (e) {}
    applyTheme(t);

    var btn = $('themeBtn');
    if (btn) {
      btn.addEventListener('click', function () {
        var cur = document.body.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
        applyTheme(cur);
      });
    }
  }

  function setMode(mode) {
    state.mode = mode;

    var btns = document.querySelectorAll('.mode-btn');
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle('active', btns[i].getAttribute('data-mode') === mode);
    }

    var sec = $('assembleSec');
    if (sec) sec.hidden = mode !== 'assemble';

    var hint = $('modeHint');
    if (hint) {
      hint.textContent = mode === 'assemble'
        ? '单击添加端点 · 拖动端点 · 右键删除'
        : '滚轮缩放 · 拖拽平移 · 双击复位';
    }

    if (cv) cv.style.cursor = mode === 'assemble' ? 'crosshair' : 'grab';

    if (mode === 'assemble') refit();
    draw();
  }

  function initPanelToggle() {
    var toggle = $('panelToggle');
    var panel = $('panel');
    var mask = $('panelMask');
    if (!toggle || !panel || !mask) return;

    toggle.addEventListener('click', function () {
      panel.classList.toggle('open');
      mask.classList.toggle('show', panel.classList.contains('open'));
    });

    mask.addEventListener('click', function () {
      panel.classList.remove('open');
      mask.classList.remove('show');
    });
  }

  /* ============================================================
     十二、初始化
     ============================================================ */

  function init() {
    cv = $('plot');
    if (!cv) return;
    ctx = cv.getContext('2d');

    initTheme();
    initPanelToggle();

    /* 模式切换 */
    var modeBtns = document.querySelectorAll('.mode-btn');
    for (var i = 0; i < modeBtns.length; i++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          setMode(btn.getAttribute('data-mode'));
          if (window.innerWidth <= 760) {
            $('panel').classList.remove('open');
            $('panelMask').classList.remove('show');
          }
        });
      })(modeBtns[i]);
    }

    /* 表达式 */
    renderExprList();
    addExpr('sin(x)', 0, true);
    addExpr('0.3x^2 - 2', 1, true);

    var addBtn = $('addExpr');
    if (addBtn) addBtn.addEventListener('click', function () { addExpr('', undefined, false); });

    /* 虚拟键盘 */
    buildKeyboard();
    var kbToggle = $('kbToggle');
    if (kbToggle) {
      kbToggle.addEventListener('click', function () {
        var box = $('kb');
        if (!box) return;
        var hidden = box.style.display === 'none';
        box.style.display = hidden ? '' : 'none';
        kbToggle.textContent = hidden ? '收起' : '展开';
      });
    }

    /* 计算器 */
    buildCalc();
    var calcInput = $('calcInput');
    if (calcInput) {
      calcInput.addEventListener('focus', function () { state.activeInput = calcInput; });
      calcInput.addEventListener('input', calcPreview);
      calcInput.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter') { ev.preventDefault(); calcEvaluate(); }
      });
    }
    var calcToggle = $('calcToggle');
    if (calcToggle) {
      calcToggle.addEventListener('click', function () {
        var box = $('calc');
        if (!box) return;
        var hidden = box.style.display === 'none';
        box.style.display = hidden ? '' : 'none';
        calcToggle.textContent = hidden ? '收起' : '展开';
      });
    }

    /* 自由组装按钮 */
    var applyBtn = $('applyFit');
    if (applyBtn) {
      applyBtn.addEventListener('click', function () {
        if (!state.fitCoef) { toast('还没有端点可以拟合'); return; }
        var txt = polyToString(state.fitCoef);
        addExpr(txt, undefined, true);
        toast('已生成解析式：y = ' + txt);
      });
    }

    var clearBtn = $('clearPts');
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        state.pts = [];
        refit();
        toast('端点已清空');
      });
    }

    var degSel = $('fitDeg');
    if (degSel) degSel.addEventListener('change', refit);

    /* 画布 */
    bindCanvas();
    resize();

    if (window.ResizeObserver) {
      var ro = new ResizeObserver(function () { resize(); });
      ro.observe($('stage'));
    } else {
      window.addEventListener('resize', resize);
    }

    /* HUD 按钮 */
    var zi = $('zoomIn'), zo = $('zoomOut'), rv = $('resetView');
    if (zi) zi.addEventListener('click', function () { zoomBy(1.25); });
    if (zo) zo.addEventListener('click', function () { zoomBy(0.8); });
    if (rv) rv.addEventListener('click', resetView);

    /* 默认激活第一个输入框 */
    var firstInput = document.querySelector('.expr__input');
    if (firstInput) state.activeInput = firstInput;

    setMode('plot');

    /* 便于调试 / 自动化测试的只读入口 */
    window.__GRAPH__ = {
      state: state,
      view: view,
      addExpr: addExpr,
      refit: refit,
      draw: draw,
      setMode: setMode
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
