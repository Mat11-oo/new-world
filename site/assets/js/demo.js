/* ==========================================================================
   交互演示：用真实项目数据模拟一次六阶段流水线
   全部在浏览器内完成，不请求任何后端 / 模型
   ========================================================================== */
(function () {
  'use strict';

  var STEPS = [
    { key: 'script', label: '剧本' },
    { key: 'cast', label: '角色与场景' },
    { key: 'storyboard', label: '分镜' },
    { key: 'frames', label: '画面' },
    { key: 'video', label: '视频' },
    { key: 'final', label: '成片' }
  ];

  var stageEl = document.getElementById('stage');
  var stepsEl = document.getElementById('stepper');
  var actionsEl = document.getElementById('actions');
  var toastsEl = document.getElementById('toasts');
  var wrapEl = document.getElementById('stageWrap');

  var D = null;
  var state = null;
  var timers = [];
  var genTimers = [];
  var player = null;
  var finalTrack = null;

  /* ------------------------------------------------------------ utils --- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function later(fn, ms) { var t = setTimeout(fn, ms); timers.push(t); return t; }
  function every(fn, ms) { var t = setInterval(fn, ms); timers.push(t); return t; }
  function clearTimers() {
    timers.forEach(function (t) { clearTimeout(t); clearInterval(t); });
    timers = [];
    genTimers.forEach(function (t) { clearTimeout(t); });
    genTimers = [];
    if (state) { state.videoRunning = false; }
    if (player) { player.stop(); player = null; }
  }
  function toast(msg) {
    var el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    toastsEl.appendChild(el);
    setTimeout(function () {
      el.style.transition = 'opacity .4s';
      el.style.opacity = '0';
      setTimeout(function () { el.remove(); }, 400);
    }, 2600);
  }
  function fmt(sec) {
    sec = Math.max(0, Math.round(sec));
    return String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0');
  }

  var lb = document.getElementById('lightbox');
  var lbImg = document.getElementById('lightboxImg');
  function zoom(src, alt) {
    lbImg.src = src; lbImg.alt = alt || '';
    lb.classList.add('open');
  }
  document.getElementById('lightboxClose').addEventListener('click', function () {
    lb.classList.remove('open'); lbImg.removeAttribute('src');
  });
  lb.addEventListener('click', function (e) {
    if (e.target === lb) { lb.classList.remove('open'); lbImg.removeAttribute('src'); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { lb.classList.remove('open'); lbImg.removeAttribute('src'); }
  });

  /* ------------------------------------------------------------- state --- */
  function initState() {
    return {
      view: 0,            // 0 = 灵感输入，1..6 = 六个阶段
      reached: 0,         // 最远到达的阶段
      editedTitle: null,
      editedLogline: null,
      regen: 0,           // 剧本重新生成次数
      frameVersion: {},   // 画面：每个片段当前展示的版本
      frameSelected: {},  // 画面：是否选中
      clips: {},          // 视频：片段状态 idle | running | done
      clipsStarted: false,
      videoRunning: false,
      videoProgress: 0,
      videoDone: false,
      finalSeen: false
    };
  }

  /* ---------------------------------------------------------- rendering --- */
  function render() {
    renderStepper();
    var view = state.view;
    if (view === 0) { stageEl.innerHTML = viewIdea(); bindIdea(); actionsEl.innerHTML = actionsIdea(); bindActionsIdea(); }
    if (view === 1) { stageEl.innerHTML = viewScript(); bindScript(); actionsEl.innerHTML = actionsScript(); bindActionsScript(); }
    if (view === 2) { stageEl.innerHTML = viewCast(); bindCast(); actionsEl.innerHTML = actionsSimple('确认角色与场景，进入分镜 →'); bindActionsSimple(2); }
    if (view === 3) { stageEl.innerHTML = viewStoryboard(); bindShots(); actionsEl.innerHTML = actionsSimple('确认分镜，生成画面 →'); bindActionsSimple(3); }
    if (view === 4) { stageEl.innerHTML = viewFrames(); bindFrames(); actionsEl.innerHTML = actionsFrames(); bindActionsFrames(); }
    if (view === 5) { stageEl.innerHTML = viewVideo(); bindVideo(); actionsEl.innerHTML = actionsVideo(); bindActionsVideo(); }
    if (view === 6) { stageEl.innerHTML = viewFinal(); bindFinal(); actionsEl.innerHTML = actionsFinal(); bindActionsFinal(); }
    wrapEl.scrollTop = 0;
  }

  function renderStepper() {
    var html = '';
    STEPS.forEach(function (s, i) {
      var n = i + 1;
      var cls = 'step';
      if (state.view === n) cls += ' active';
      else if (state.view > n) cls += ' done';
      html += '<button class="' + cls + '" data-step="' + n + '"' + (n > state.reached ? ' disabled style="opacity:.35;cursor:not-allowed"' : '') + '>' +
        '<span class="num">' + (state.view > n ? '✓' : n) + '</span>' + s.label + '</button>';
      if (i < STEPS.length - 1) html += '<span class="step-line"></span>';
    });
    stepsEl.innerHTML = html;
    stepsEl.querySelectorAll('.step:not([disabled])').forEach(function (b) {
      b.addEventListener('click', function () {
        clearTimers();
        state.view = +b.getAttribute('data-step');
        render();
      });
    });
  }

  /* --------------------------------------------------------------- idea --- */
  function viewIdea() {
    return '' +
      '<div class="stage">' +
      '<div class="idea-title">把想象，<em style="font-style:normal;color:#fff">变成新世界</em></div>' +
      '<p class="idea-sub">写下故事、商品或目的地，系统会拆成一条多阶段流水线。下面是这个演示项目当时的真实输入——一个真实跑通过的「亳州旅游宣传片」。</p>' +
      '<div class="idea-box">' +
      '<textarea id="ideaInput" spellcheck="false">' + esc(D.idea) + '</textarea>' +
      '<div class="idea-meta">' +
      '<span class="pill">场景 <b>' + esc(D.scenario.name) + '</b></span>' +
      '<span class="pill">LLM <b>' + esc(D.models.llm) + '</b></span>' +
      '<span class="pill">集数 <b>1</b></span>' +
      '<span class="pill">比例 <b>16:9</b></span>' +
      '<span class="pill">片段时长 <b>5s</b></span>' +
      '</div>' +
      '</div>' +
      '<div class="preset-row">' +
      ['换个输入：敦煌莫高窟', '换个输入：湘西凤凰古城', '换个输入：景德镇陶瓷'].map(function (t, i) {
        return '<button class="pill" data-preset="' + i + '">' + t + '</button>';
      }).join('') +
      '</div>' +
      '<p class="pipeline-note">演示环境固定使用这一份预生成结果，换输入不会真的调用模型；真实项目里这里会调用你配置的任意 LLM。</p>' +
      '</div>';
  }
  function bindIdea() {
    document.querySelectorAll('[data-preset]').forEach(function (b) {
      b.addEventListener('click', function () {
        toast('演示环境固定使用「亳州」这个案例，真机上这里会换掉整条流水线的输入。');
      });
    });
  }
  function actionsIdea() {
    return '<span class="hint">当前：灵感输入 · 工作人员可随时中止</span>' +
      '<button class="btn btn-primary" id="startBtn">开始生成剧本 →</button>';
  }
  function bindActionsIdea() {
    document.getElementById('startBtn').addEventListener('click', function (e) {
      e.currentTarget.disabled = true;
      runOverlay('正在调用 LLM 生成剧本', 'script_generation · deepseek-chat', 1500, function () {
        state.view = 1; state.reached = Math.max(state.reached, 1); render();
        toast('剧本已生成，可以查看、修改或重新生成。');
      });
    });
  }

  /* ------------------------------------------------------------- script --- */
  function scriptTitle() { return state.editedTitle || D.script.title; }
  function scriptLogline() {
    var alts = [
      D.script.logline,
      '从砖雕到药市，从地下运兵道到百年窖池——用一天时间，走进亳州三百年的市井烟火。',
      '一折老戏、一味草药、一口陈酒：跟着镜头，看看亳州人把日子过成了什么味道。'
    ];
    if (state.editedLogline) return state.editedLogline;
    return alts[state.regen % alts.length];
  }

  function viewScript() {
    var ep = D.script.episode;
    var html = '' +
      '<div class="stage">' +
      '<div class="stage-head"><div><h2>剧本生成</h2><p>多轮 LLM 交互，输出结构化剧本：标题、梗概、角色、场景与分集剧本</p></div>' +
      '<span class="status-pill ok"><span class="dot" style="width:6px;height:6px"></span>剧本完成</span></div>' +
      '<div class="card">' +
      '<div class="script-title">' + esc(scriptTitle()) + '</div>' +
      '<p class="logline">' + esc(scriptLogline()) + '</p>' +
      '<div class="tags">' + D.script.genre.map(function (g) { return '<span class="tagpill">' + esc(g) + '</span>'; }).join('') +
      '<span class="tagpill">' + esc(D.script.mood) + '</span><span class="tagpill">realistic</span></div>' +
      '</div>' +

      '<div class="card"><p class="card-title">角色 · ' + D.script.characters.length + '</p>' +
      '<div class="person-grid">' + D.script.characters.map(function (c) {
        return '<div class="person"><img src="' + c.img + '" alt="' + esc(c.name) + '" data-zoom="' + c.img + '" />' +
          '<div class="p-body"><b>' + esc(c.name) + '</b><p>' + esc(c.description) + '</p></div></div>';
      }).join('') + '</div></div>' +

      '<div class="card"><p class="card-title">场景 · ' + D.script.settings.length + '</p>' +
      '<div class="setting-grid">' + D.script.settings.slice(0, 3).map(function (s) {
        return '<div class="setting"><img src="' + s.img + '" alt="' + esc(s.name) + '" data-zoom="' + s.img + '" />' +
          '<div class="s-label">' + esc(s.name) + '</div></div>';
      }).join('') + '</div>' +
      '<p style="margin:12px 0 0;font-size:11.5px;color:var(--faint)">另有 ' + (D.script.settings.length - 3) + ' 个场景：' +
      D.script.settings.slice(3).map(function (s) { return esc(s.name); }).join('、') + '</p></div>' +

      '<div class="card"><p class="card-title">第 ' + ep.number + ' 集 · ' + esc(ep.title) + '</p>' +
      ep.scenes.map(function (sc) {
        return '<div class="scene"><div class="scene-ctx">' + esc(sc.ctx) + '</div>' +
          '<div class="scene-people">人物：<b>' + sc.people.map(esc).join('、') + '</b></div>' +
          sc.blocks.map(function (b) {
            if (b.type === 'action') return '<div class="line-action">' + esc(b.text) + '</div>';
            if (b.type === 'dialog') return '<div class="line-dialog"><span class="who">' + esc(b.who) + '</span><span class="emo">（' + esc(b.emotion) + '）</span><span class="say">' + esc(b.text) + '</span></div>';
            return '<div class="line-action">' + esc(b.text) + '</div>';
          }).join('') + '</div>';
      }).join('') + '</div>' +
      '</div>';
    html += '<div class="gen-overlay" id="genOverlay"><div><div class="ring"></div><div class="txt" id="genTxt"></div><div class="sub" id="genSub"></div></div></div>';
    return html;
  }
  function bindScript() {
    stageEl.querySelectorAll('[data-zoom]').forEach(function (img) {
      img.addEventListener('click', function () { zoom(img.getAttribute('data-zoom'), img.alt); });
    });
  }
  function actionsScript() {
    return '<span class="hint">剧本阶段完成 · 你可以修改标题 / 梗概，或让模型重写一版</span>' +
      '<button class="btn" id="editBtn">修改</button>' +
      '<button class="btn" id="regenBtn">重新生成</button>' +
      '<button class="btn btn-primary" id="nextBtn">确认并继续 →</button>';
  }
  function bindActionsScript() {
    document.getElementById('editBtn').addEventListener('click', function () {
      var t = prompt('标题', scriptTitle());
      if (t === null) return;
      var l = prompt('一句话梗概', scriptLogline());
      if (l === null) return;
      state.editedTitle = t.trim() || D.script.title;
      state.editedLogline = l.trim() || D.script.logline;
      render();
      toast('已保存修改，下游阶段会被标记为需要重新生成。');
    });
    document.getElementById('regenBtn').addEventListener('click', function () {
      runOverlay('正在重新生成剧本', 'script_generation · 第 ' + (state.regen + 2) + ' 版', 1400, function () {
        state.regen += 1;
        render();
        toast('已生成第 ' + (state.regen + 1) + ' 版梗概，可直接对比。');
      });
    });
    document.getElementById('nextBtn').addEventListener('click', function () { go(2); });
  }

  /* --------------------------------------------------------------- cast --- */
  function viewCast() {
    return '' +
      '<div class="stage">' +
      '<div class="stage-head"><div><h2>角色与场景</h2><p>把剧本里的文字描述变成可复用的视觉资产，后续每个镜头都引用它们</p></div>' +
      '<span class="status-pill ok"><span class="dot" style="width:6px;height:6px"></span>3 角色 · 6 场景</span></div>' +
      '<div class="card"><p class="card-title">角色</p><div class="person-grid">' +
      D.script.characters.map(function (c) {
        return '<div class="person"><img src="' + c.img + '" alt="' + esc(c.name) + '" data-zoom="' + c.img + '" />' +
          '<div class="p-body"><b>' + esc(c.name) + '</b><p>' + esc(c.description) + '</p></div></div>';
      }).join('') + '</div></div>' +
      '<div class="card"><p class="card-title">场景</p><div class="setting-grid">' +
      D.script.settings.map(function (s) {
        return '<div class="setting"><img src="' + s.img + '" alt="' + esc(s.name) + '" data-zoom="' + s.img + '" />' +
          '<div class="s-label">' + esc(s.name) + '</div></div>';
      }).join('') + '</div></div>' +
      '<p class="pipeline-note">真实项目里，每个资产都能单独重新生成、替换；被替换的角色会自动同步到所有引用它的画面。</p>' +
      '</div>';
  }
  function bindCast() {
    stageEl.querySelectorAll('[data-zoom]').forEach(function (img) {
      img.addEventListener('click', function () { zoom(img.getAttribute('data-zoom'), img.alt); });
    });
  }

  /* --------------------------------------------------------- storyboard --- */
  function viewStoryboard() {
    var sb = D.storyboard;
    var shots = sb.segments.reduce(function (n, s) { return n + s.shots.length; }, 0);
    var dur = sb.segments.reduce(function (n, s) { return n + s.duration; }, 0);
    return '' +
      '<div class="stage">' +
      '<div class="stage-head"><div><h2>分镜</h2><p>被确认的剧本会被拆成可拍摄的镜头表：景别、机位、时长、台词</p></div>' +
      '<span class="status-pill ok"><span class="dot" style="width:6px;height:6px"></span>' + sb.segments.length + ' 片段 · ' + shots + ' 镜头 · ' + dur + 's</span></div>' +
      sb.segments.map(function (s) {
        return '<div class="seg"><div class="seg-head"><b>' + esc(s.name) + '</b>' +
          '<span class="tagpill">' + esc(s.location) + '</span>' +
          '<span class="tagpill">' + s.characters.map(esc).join(' / ') + '</span>' +
          '<span class="meta">' + esc(s.ctx) + ' · ' + s.duration + 's</span></div>' +
          s.shots.map(function (sh) {
            return '<div class="shot"><span class="n">#' + sh.no + '</span>' +
              '<span class="c"><span class="shot-type">' + esc(sh.type) + '</span>' + esc(sh.content) + '</span>' +
              '<span class="d">' + sh.duration + 's</span></div>';
          }).join('') + '</div>';
      }).join('') +
      '</div>';
  }
  function bindShots() {}

  /* ------------------------------------------------------------- frames --- */
  function frameVersion(id) {
    if (state.frameVersion[id] == null) state.frameVersion[id] = 0;
    return state.frameVersion[id];
  }
  function viewFrames() {
    return '' +
      '<div class="stage">' +
      '<div class="stage-head"><div><h2>画面</h2><p>按分镜逐片段生成参考画面，每个片段都可以比较多个版本再定稿</p></div>' +
      '<span class="status-pill ok"><span class="dot" style="width:6px;height:6px"></span>已生成 ' + D.frames.length + ' / ' + D.clips.length + ' 片段</span></div>' +
      '<div class="frame-grid">' + D.frames.map(function (f, i) {
        var v = frameVersion(f.id);
        var ver = f.versions[v];
        return '<div class="frame-card' + (state.frameSelected[f.id] ? ' selected' : '') + '" data-frame="' + f.id + '">' +
          '<div class="frame-img" data-zoom="' + ver.img + '"><img src="' + ver.img + '" alt="' + esc(f.name) + ' 版本 ' + (v + 1) + '" />' +
          '<span class="idx">' + String(i + 1).padStart(2, '0') + ' · ' + esc(f.name) + '</span></div>' +
          '<div class="frame-body"><p>' + esc(f.description) + '</p>' +
          '<div class="versions">' + f.versions.map(function (vv, vi) {
            return '<button class="vbtn' + (vi === v ? ' on' : '') + '" data-frame="' + f.id + '" data-ver="' + vi + '">v' + (vi + 1) + '</button>';
          }).join('') +
          (state.frameSelected[f.id] ? '<span style="margin-left:auto;font-size:11px;color:var(--ok)">已选中</span>' : '') +
          '</div></div></div>';
      }).join('') + '</div>' +
      '<p class="pipeline-note">演示环境预生成了前 3 个片段（共 ' + D.clips.length + ' 个），所以你可以在 v1 / v2 / v3 之间真实切换对比——这正是项目里“单项重新生成”的样子。</p>' +
      '</div>';
  }
  function bindFrames() {
    stageEl.querySelectorAll('[data-ver]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        var id = b.getAttribute('data-frame');
        state.frameVersion[id] = +b.getAttribute('data-ver');
        render();
        toast('已切换到 v' + (state.frameVersion[id] + 1) + '，其余片段不受影响。');
      });
    });
    stageEl.querySelectorAll('.frame-img').forEach(function (el) {
      el.addEventListener('click', function () { zoom(el.getAttribute('data-zoom'), ''); });
    });
    stageEl.querySelectorAll('.frame-card').forEach(function (card) {
      card.addEventListener('click', function () {
        var id = card.getAttribute('data-frame');
        state.frameSelected[id] = true;
        render();
        toast('已选中该版本，进入视频生成时会使用它作为首帧。');
      });
    });
  }
  function actionsFrames() {
    return '<span class="hint">画面阶段 · 每个片段独立定稿，互不影响</span>' +
      '<button class="btn" id="batchBtn">批量重新生成</button>' +
      '<button class="btn btn-primary" id="nextBtn">确认并继续 →</button>';
  }
  function bindActionsFrames() {
    document.getElementById('batchBtn').addEventListener('click', function () {
      runOverlay('正在批量重新生成画面', 'reference_generation · wan2.7-image', 1500, function () {
        D.frames.forEach(function (f) { state.frameVersion[f.id] = (frameVersion(f.id) + 1) % f.versions.length; });
        render();
        toast('3 个片段都已更新到下一版。');
      });
    });
    document.getElementById('nextBtn').addEventListener('click', function () { go(5); });
  }

  /* -------------------------------------------------------------- video --- */
  function clipImg(i) {
    var f = D.frames[i];
    if (!f) return D.frames[0].versions[0].img;
    return f.versions[frameVersion(f.id)].img;
  }
  function viewVideo() {
    return '' +
      '<div class="stage">' +
      '<div class="stage-head"><div><h2>视频</h2><p>以定稿画面为首帧，逐片段生成视频；完成后自动衔接成片</p></div>' +
      '<span class="status-pill ' + (state.videoDone ? 'ok' : state.videoRunning ? 'run' : '') + '" id="vStatus">' +
      (state.videoDone ? '<span class="dot" style="width:6px;height:6px"></span>3 个片段已完成'
        : state.videoRunning ? '<span class="spin"></span>片段 ' + state.videoProgress + ' / 3 生成中'
          : '等待生成') + '</span></div>' +
      '<div id="clipList">' + D.clips.map(function (c, i) {
        var st = state.clips[c.id] || 'idle';
        var done = st === 'done';
        return '<div class="seg" data-clip="' + c.id + '">' +
          '<div class="seg-head"><b>片段 ' + (i + 1) + '</b>' +
          '<span class="tagpill">' + c.duration + 's</span>' +
          (i === 0 ? '<span class="tagpill">首帧驱动</span>' : '') +
          '<span class="meta">' + (done ? '<span style="color:var(--ok)">✓ 已生成</span>' : st === 'running' ? '生成中…' : '排队中') + '</span></div>' +
          (done ? '<div class="shot" style="grid-template-columns:120px 1fr 60px;align-items:center">' +
            '<img src="' + clipImg(i) + '" alt="" style="width:120px;aspect-ratio:16/9;object-fit:cover;border-radius:6px;cursor:zoom-in" data-zoom="' + clipImg(i) + '" />' +
            '<span class="c">' + esc(c.description.slice(0, 88)) + '…</span><span class="d">' + c.duration + 's</span></div>'
            : '') +
          '</div>';
      }).join('') + '</div>' +
      '<p class="pipeline-note">演示只跑前 3 个片段；真实项目会把全部片段并发提交给视频模型，失败可单独重试。</p>' +
      '</div>';
  }
  function bindVideo() {
    stageEl.querySelectorAll('[data-zoom]').forEach(function (img) {
      img.addEventListener('click', function () { zoom(img.getAttribute('data-zoom'), '视频片段首帧'); });
    });
  }
  function actionsVideo() {
    if (state.videoDone) {
      return '<span class="hint">视频阶段完成 · 可以进入成片预览</span>' +
        '<button class="btn" id="replayVideoBtn">重跑一遍</button>' +
        '<button class="btn btn-primary" id="nextBtn">确认并进入成片 →</button>';
    }
    if (state.videoRunning) {
      return '<span class="hint">视频阶段 · 正在逐片段生成，请稍候</span>' +
        '<button class="btn btn-primary" disabled>生成中…</button>';
    }
    return '<span class="hint">视频阶段 · 前 3 个片段会依次生成</span>' +
      '<button class="btn btn-primary" id="genVideoBtn">开始生成视频</button>';
  }
  function bindActionsVideo() {
    var b = document.getElementById('genVideoBtn');
    if (b) b.addEventListener('click', function () { clearTimers(); startVideoGen(); });
    var r = document.getElementById('replayVideoBtn');
    if (r) r.addEventListener('click', function () {
      clearTimers();
      state.clips = {}; state.videoDone = false; state.clipsStarted = false;
      state.videoProgress = 0;
      render(); startVideoGen();
    });
    var n = document.getElementById('nextBtn');
    if (n) n.addEventListener('click', function () {
      clearTimers();
      state.view = 6; state.reached = Math.max(state.reached, 6); render();
    });
  }
  function startVideoGen() {
    if (state.videoRunning || state.videoDone) return;
    state.videoRunning = true;
    state.clipsStarted = true;
    var targets = D.clips.slice(0, 3);
    var i = 0;
    function step() {
      if (i >= targets.length) {
        state.videoRunning = false;
        state.videoDone = true;
        render();
        toast('3 个片段生成完成，可以进入成片。');
        return;
      }
      var id = targets[i].id;
      state.clips[id] = 'running';
      state.videoProgress = i + 1;
      i += 1;
      render();
      genTimers.push(setTimeout(function () {
        state.clips[id] = 'done';
        step();
      }, 1400));
    }
    step();
  }

  /* -------------------------------------------------------------- final --- */
  function viewFinal() {
    var track = [];
    D.frames.forEach(function (f, i) {
      var img = f.versions[frameVersion(f.id)].img;
      track.push({ img: img, sub: D.narration[i * 2] || '' });
      track.push({ img: img, sub: D.narration[i * 2 + 1] || '' });
    });
    finalTrack = track;
    return '' +
      '<div class="stage">' +
      '<div class="stage-head"><div><h2>成片</h2><p>片段拼接、字幕、配乐之后的可播放结果</p></div>' +
      '<span class="status-pill ok"><span class="dot" style="width:6px;height:6px"></span>已完成 · 1 集</span></div>' +
      '<div class="player" id="player">' +
      track.map(function (t, i) {
        return '<img src="' + t.img + '" alt="" class="' + (i === 0 ? 'show' : '') + '" data-i="' + i + '" />';
      }).join('') +
      '<div class="veil"></div>' +
      '<div class="sub" id="sub">' + esc(track[0].sub) + '</div>' +
      '<div class="player-bar"><button class="play-btn" id="playBtn">❚❚</button>' +
      '<span class="tc" id="tcNow">00:00</span>' +
      '<div class="track"><i id="prog"></i></div>' +
      '<span class="tc" id="tcAll">00:00</span></div>' +
      '</div>' +
      '<div class="summary">' +
      '<div class="sum-item"><b>1</b><span>集 · 亳州三百年戏药酒</span></div>' +
      '<div class="sum-item"><b>6</b><span>场 · 花戏楼 / 运兵道 / 药市 / 酒坊 / 涡河</span></div>' +
      '<div class="sum-item"><b>' + D.clips.length + '</b><span>片段 · 合计 ' + D.clips.reduce(function (n, c) { return n + c.duration; }, 0) + ' 秒</span></div>' +
      '<div class="sum-item"><b>3</b><span>演示画面 · 可逐帧替换</span></div>' +
      '</div>' +
      '<p class="pipeline-note">这套数据来自一个真实跑通的项目；演示为了纯静态托管，只带了 3 张画面与字幕，完整成片需要在你自己的环境里生成。</p>' +
      '</div>';
  }
  function bindFinal() {
    var imgs = Array.prototype.slice.call(stageEl.querySelectorAll('.player img'));
    var sub = document.getElementById('sub');
    var prog = document.getElementById('prog');
    var now = document.getElementById('tcNow');
    var all = document.getElementById('tcAll');
    var playBtn = document.getElementById('playBtn');
    var track = finalTrack || [];
    var SEG = 3200;
    var total = (track.length - 1) * SEG;
    all.textContent = fmt(total / 1000);
    var start = performance.now();
    var paused = false;
    var pausedAt = 0;
    var elapsedBase = 0;
    var raf;

    function paint(ms) {
      var idx = Math.min(track.length - 1, Math.floor(ms / SEG));
      imgs.forEach(function (im, i) { im.classList.toggle('show', i === idx); });
      if (sub.textContent !== track[idx].sub) sub.textContent = track[idx].sub;
      var pct = Math.min(100, (ms / total) * 100);
      prog.style.width = pct + '%';
      now.textContent = fmt(Math.floor(ms / 1000));
    }
    function tick() {
      if (paused) return;
      var ms = elapsedBase + (performance.now() - start);
      if (ms >= total) {
        paint(total);
        playBtn.textContent = '▶';
        paused = true;
        return;
      }
      paint(ms);
      raf = requestAnimationFrame(tick);
    }
    playBtn.addEventListener('click', function () {
      if (paused) {
        if (elapsedBase >= total) elapsedBase = 0;
        paused = false;
        start = performance.now();
        playBtn.textContent = '❚❚';
        raf = requestAnimationFrame(tick);
      } else {
        paused = true;
        elapsedBase += performance.now() - start;
        cancelAnimationFrame(raf);
        playBtn.textContent = '▶';
      }
    });
    player = {
      stop: function () { cancelAnimationFrame(raf); paused = true; }
    };
    paint(0);
    raf = requestAnimationFrame(tick);
    state.finalSeen = true;
  }
  function actionsFinal() {
    return '<span class="hint">成片已完成 · 全流程演示结束</span>' +
      '<button class="btn" id="againBtn">从灵感重新开始</button>' +
      '<a class="btn btn-primary" href="./">看看项目介绍 →</a>';
  }
  function bindActionsFinal() {
    document.getElementById('againBtn').addEventListener('click', reset);
  }

  /* ---------------------------------------------------------- overlays --- */
  function runOverlay(title, sub, ms, done) {
    var ov = document.createElement('div');
    ov.className = 'gen-overlay on';
    ov.innerHTML = '<div><div class="ring"></div><div class="txt"></div><div class="sub"></div></div>';
    ov.querySelector('.txt').textContent = title;
    ov.querySelector('.sub').textContent = sub;
    document.body.appendChild(ov);
    later(function () {
      ov.remove();
      done();
    }, ms);
  }

  /* ---------------------------------------------------------- actions --- */
  function actionsSimple(label) {
    return '<span class="hint">' + label.replace(' →', '') + ' · 每个阶段都要人工确认</span>' +
      '<button class="btn" id="backBtn">返回上一步</button>' +
      '<button class="btn btn-primary" id="okBtn">' + label + '</button>';
  }
  function bindActionsSimple(view) {
    document.getElementById('backBtn').addEventListener('click', function () { state.view = view - 1; render(); });
    document.getElementById('okBtn').addEventListener('click', function () { go(view + 1); });
  }
  function go(view) {
    clearTimers();
    if (view > 6) view = 6;
    var prev = state.view;
    state.view = view;
    state.reached = Math.max(state.reached, view);
    runOverlay(
      view === 2 ? '正在生成角色与场景资产' : view === 3 ? '正在拆分分镜' : view === 4 ? '正在生成画面' : view === 5 ? '准备工作' : '正在整理产出',
      STEPS[Math.min(view, 6) - 1].label + ' · 演示数据直接载入',
      800,
      function () {
        render();
        if (view === 3) toast('分镜已拆好：' + D.storyboard.segments.length + ' 个片段。');
        if (view === 4) toast('画面已生成，可切换 v1 / v2 / v3 对比。');
        if (prev === 3) window.scrollTo(0, 0);
      }
    );
  }

  function reset() {
    clearTimers();
    state = initState();
    render();
    toast('已回到灵感输入。');
  }

  /* -------------------------------------------------------------- boot --- */
  function boot() {
    fetch('assets/data/travel.json')
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (data) {
        D = data;
        state = initState();
        render();
        // 支持 #step-4 这类链接直接跳到某个阶段（方便分享与截图）
        var m = /^#step-([1-6])$/.exec(location.hash);
        if (m) {
          state.view = +m[1];
          state.reached = state.view;
          render();
        }
        document.getElementById('resetBtn').addEventListener('click', reset);
      })
      .catch(function (err) {
        stageEl.innerHTML = '<div class="stage"><div class="card"><p class="card-title">加载失败</p>' +
          '<p style="color:var(--muted)">无法读取演示数据（' + esc(err.message) + '）。' +
          '请通过 HTTP 访问这个页面，例如 <code>python3 -m http.server</code>，直接双击打开文件会被浏览器的跨域策略拦住。</p></div></div>';
        actionsEl.innerHTML = '<span class="hint">用本地服务器打开页面即可</span>';
      });
  }

  boot();
})();
