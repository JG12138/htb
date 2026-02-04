(() => {
  const $ = (s) => document.querySelector(s);

  /* ====== 配置 ====== */
  const FISHING_URL = "./side_index.html";

  const MAP_LABEL = {
    lake: "有石头滩的湖边",
    falls: "林子附近的瀑布",
    wetland: "半山腰的缓坡湿地",
    forest: "斜坡上的深林",
  };
  const DB = {
    "橙知": { gender: "M", map: "lake" },
    "丹": { gender: "M", map: "forest" },
    "Eric": { gender: "M", map: "falls" },
    "Ethan": { gender: "M", map: "wetland" },
    "阿基米德": { gender: "M", map: "forest" },
    "Friedrich": { gender: "M", map: "lake" },
    "Honey": { gender: "M", map: "wetland" },
    "J.O.": { gender: "M", map: "falls" },
    "Kazares": { gender: "M", map: "forest" },
    "奥利弗": { gender: "M", map: "lake" },
    "Matt": { gender: "M", map: "wetland" },
    "Mubiru": { gender: "M", map: "falls" },
    "Samuel": { gender: "M", map: "forest" },
    "Thomas": { gender: "M", map: "lake" },
    "卡莱比": { gender: "M", map: "wetland" },
    "叶澄希": { gender: "M", map: "falls" },

    "Amber": { gender: "F", map: "lake" },
    "Cela": { gender: "F", map: "falls" },
    "Jeffrey": { gender: "F", map: "wetland" },
    "玛顿": { gender: "F", map: "forest" },
    "Maya": { gender: "F", map: "lake" },
    "马塞拉": { gender: "F", map: "falls" },
    "Melusine": { gender: "F", map: "wetland" },
    "Naya": { gender: "F", map: "forest" },
    "Romaine": { gender: "F", map: "lake" },
    "向木林": { gender: "F", map: "wetland" },
    "奈芙": { gender: "F", map: "forest" },
    "Zurabia": { gender: "F", map: "falls" },
    "Moira": { gender: "F", map: "lake" },
    "Erla": { gender: "F", map: "wetland" },
    "Josephine": { gender: "F", map: "forest" },
    "Oliven": { gender: "F", map: "falls" },
  };

  /* ====== DOM ====== */
  const nameIn = $("#nameIn");
  const openPickerBtn = $("#openPickerBtn");
  const startBtn = $("#startBtn");
  const assignOut = $("#assignOut");
  const mapTitle = $("#mapTitle");
  const mapSub = $("#mapSub");
  const hintOut = $("#hintOut");

  const rollBtn = $("#rollBtn");
  const restartBtn = $("#restartBtn");
  const leaveBtn = $("#leaveBtn");
  const diceOut = $("#diceOut");
  const posOut = $("#posOut");

  const picker = $("#namePicker");
  const zhBox = $("#nameListZh");
  const enBox = $("#nameListEn");

  const gameBoardWrap = $(".game-area");
  const boards = Array.from(document.querySelectorAll(".board[data-map]"));

  /* ====== 状态 ====== */
  let caughtCount = 0;        // 本局成功拍到动物次数
  let role = "normal";        // normal | photographer | biologist
  let lastAnimalTruth = null; // 生物学家 reveal 用

  // 你原逻辑：造谣格固定 pos=8；终点 pos=20
  const SPECIAL_POS = 8;
  const END_POS = 20;

  let currentName = null;
  let currentMapId = null;

  let pos = 1;
  let isAnimating = false;
  let timer = null;

  let isTrapped = false;      // 是否处于陷阱状态（被困住，不能roll）
  let trappedHelper = null;   // 呼救选中的嘉宾名字（可为空）

  let currentBoardEl = null;  // ✅ 当前显示的棋盘 DOM

  /* ====== 小工具 ====== */
  function lockRoll(msg = "你现在被困住了…") {
    if (!rollBtn) return;
    rollBtn.disabled = true;
    rollBtn.textContent = msg;
  }
  function unlockRoll() {
    if (!rollBtn) return;
    rollBtn.disabled = false;
    rollBtn.textContent = "Roll";
  }

  const isEnglishName = (n) => /^[A-Za-z]/.test(n || "");
  function normalizeName(raw) { return (raw || "").trim(); }

  function hasMap(name) {
    return !!(DB[name] && DB[name].map && MAP_LABEL[DB[name].map]);
  }

  function setHint(text) {
    if (hintOut) hintOut.textContent = text || "";
  }
  function setMapSub(text) {
    if (mapSub) mapSub.textContent = text || "";
  }

  function setPanel(title, bodyHtml, actions = []) {
    if (mapTitle) mapTitle.textContent = title || "";
    if (mapSub) mapSub.innerHTML = bodyHtml || "";

    const panel = document.querySelector("#infoPanel");
    if (!panel) return;

    let box = panel.querySelector(".panelActions");
    if (!box) {
      box = document.createElement("div");
      box.className = "panelActions";
      panel.appendChild(box);
    }
    box.innerHTML = "";

    actions.forEach((a) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = a.label;
      if (a.kind === "primary") b.style.background = "rgba(255,255,255,.14)";
      b.addEventListener("click", a.onClick);
      box.appendChild(b);
    });
  }

  function getSameMapNames(mapId) {
    const names = Object.keys(DB).filter((n) => DB[n]?.map === mapId);
    return names.filter((n) => n !== currentName);
  }

  function inferRoleByName(name) {
    const s = (name || "").toLowerCase();
    if (s.includes("photo") || name.includes("摄")) return "photographer";
    if (s.includes("bio") || name.includes("生物")) return "biologist";
    return "normal";
  }

  function getShootThreshold() {
    // 1-10，<= threshold 成功
    let base = 4;
    if (role === "photographer") base += 3;
    return Math.min(10, base);
  }

  /* ====== Gate 锁定/解锁 ====== */
  function lockGate() {
    if (nameIn) nameIn.disabled = true;
    if (openPickerBtn) openPickerBtn.disabled = true;
    if (startBtn) {
      startBtn.disabled = true;
      startBtn.textContent = "已进入";
    }
  }
  function unlockGate() {
    if (nameIn) nameIn.disabled = false;
    if (openPickerBtn) openPickerBtn.disabled = false;
    if (startBtn) {
      startBtn.disabled = false;
      startBtn.textContent = "进入路线";
    }
  }

  /* ====== Picker: show/hide ====== */
  function showNamePicker() {
    if (!picker) return;
    picker.hidden = false;
    picker.inert = false;
    const closeBtn = picker.querySelector(".pickerClose");
    if (closeBtn) closeBtn.focus({ preventScroll: true });
  }
  function hideNamePicker() {
    if (!picker) return;
    if (picker.contains(document.activeElement)) document.activeElement.blur();
    picker.hidden = true;
  }
  if (picker) {
    picker.addEventListener("click", (e) => {
      if (e.target === picker) hideNamePicker();
    });
  }

  function buildNamePicker() {
    if (!picker || !zhBox || !enBox) return;

    const names = Object.keys(DB).filter(hasMap);

    const zh = names
      .filter((n) => !isEnglishName(n))
      .sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));

    const en = names
      .filter(isEnglishName)
      .sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));

    const makeChip = (name) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip";
      btn.textContent = name;
      btn.addEventListener("click", () => {
        nameIn.value = name;
        hideNamePicker();
        nameIn.focus({ preventScroll: true });
      });
      return btn;
    };

    zhBox.innerHTML = "";
    enBox.innerHTML = "";
    zh.forEach((n) => zhBox.appendChild(makeChip(n)));
    en.forEach((n) => enBox.appendChild(makeChip(n)));

    picker.querySelectorAll("[data-close='1']").forEach((el) => {
      el.onclick = hideNamePicker;
    });
  }

  /* =========================
     ✅ Board switching (static boards in HTML)
     ========================= */
  function showBoard(mapId) {
    boards.forEach((b) => {
      const on = b.dataset.map === mapId;
      b.hidden = !on;
      // 进入路线后不再 empty
      b.classList.toggle("is-empty", !on);
    });
    currentBoardEl = document.querySelector(`.board[data-map="${mapId}"]`);
  }

  function clearActiveInAllBoards() {
    boards.forEach((b) => b.querySelectorAll(".cell.is-active").forEach((c) => c.classList.remove("is-active")));
  }

  /* ====== 棋盘：高亮格子（只在 currentBoardEl 内） ====== */
  function setActive(newPos) {
    if (!currentBoardEl) return;

    const prev = currentBoardEl.querySelector(".cell.is-active");
    if (prev) prev.classList.remove("is-active");

    const next = currentBoardEl.querySelector(`.cell[data-pos="${newPos}"]`);
    if (next) next.classList.add("is-active");

    pos = newPos;
    if (posOut) posOut.textContent = String(pos);
  }

  function pulseCell(p) {
    if (!currentBoardEl) return;
    const cell = currentBoardEl.querySelector(`.cell[data-pos="${p}"]`);
    if (!cell || !cell.animate) return;
    cell.animate(
      [{ transform: "scale(1)" }, { transform: "scale(1.08)" }, { transform: "scale(1)" }],
      { duration: 260 }
    );
  }

  function finishIfEnd() {
    pulseCell(pos);

    if (pos >= END_POS) {
      if (rollBtn) {
        rollBtn.disabled = true;
        rollBtn.textContent = "已到终点";
      }
      if (restartBtn) restartBtn.style.display = "inline-block";
      if (leaveBtn) leaveBtn.style.display = "inline-block";
      setHint("已到终点。你可以再来一次或离开。");
      return true;
    }
    return false;
  }

  /* =========================
     文案池
     ========================= */
  function scenicText(mapId) {
    const pool = {
      lake: "水面很平，远处有白色的碎浪声。你鞋底踩到湿砂，留下一串浅浅脚印。",
      falls: "瀑声把人思绪冲得很空。树叶上有亮闪闪的水珠，像没人收走的碎玻璃。",
      wetland: "湿地的风很软，草丛里有细小的摩擦声。泥地边缘像被谁反复踩过。",
      forest: "林子里光线断断续续，树皮纹路像某种不耐烦的暗号。",
    };
    return pool[mapId] || "你继续往前走，周围的景色没有太大变化。";
  }

  function blurredAnimalDesc(mapId) {
    const pool = {
      lake: "你按下快门时，镜头里闪过一截银白的弧线，像是鳞片，也像是水面反光。",
      falls: "你听见近处有急促的拍打声，影子一闪而过，像翅膀扫过潮湿的空气。",
      wetland: "草丛里传来很轻的‘咔哒’声，你只拍到一团模糊的轮廓——像两只并排的小影子。",
      forest: "树根旁有东西迅速缩回阴影里，你只留下了一张“好像是眼睛”的高反光点。",
    };
    return pool[mapId] || "你似乎拍到了什么，但照片只有模糊的轮廓。";
  }

  function animalTruth(mapId) {
    if (mapId === "wetland") return "鸳鸯（Mandarin duck）";
    const pool = {
      lake: "不明水鸟",
      falls: "不明小型哺乳动物",
      forest: "不明林鸟",
    };
    return pool[mapId] || "未知物种";
  }

  /* =========================
     动物格
     ========================= */
  function handleAnimalCell() {
    const roll = Math.floor(Math.random() * 10) + 1; // 1-10
    const th = getShootThreshold();
    const ok = roll <= th;

    if (ok) {
      caughtCount += 1;
      lastAnimalTruth = animalTruth(currentMapId);

      const base = `
        <div style="margin-bottom:8px;"><b>拍摄成功。</b>（1-10：你掷出了 <b>${roll}</b>，成功阈值 ≤ <b>${th}</b>）</div>
        <div style="opacity:.92; line-height:1.6;">${blurredAnimalDesc(currentMapId)}</div>
        <div style="margin-top:10px; color: rgba(255,255,255,.78); font-size:12px;">
          不管拍到什么，节目组都只给你这段“模糊描述”。要不你去问问更了解的人？或者干脆以此为由去找你的心动嘉宾？
        </div>
      `;

      const actions = [];
      if (role === "biologist") {
        actions.push({
          label: "Reveal 正确答案",
          kind: "primary",
          onClick: () => {
            setPanel(
              "正确答案已揭晓",
              `<div style="font-size:14px; line-height:1.7;">
                你从一些细节（羽缘/足迹/叫声）确认了：<b>${lastAnimalTruth}</b>。
               </div>`
            );
          },
        });
      }

      setPanel("动物格", base, actions);
    } else {
      const fail = `
        <div style="margin-bottom:8px;"><b>拍摄失败。</b>（1-10：你掷出了 <b>${roll}</b>，成功阈值 ≤ <b>${th}</b>）</div>
        <div style="opacity:.92; line-height:1.6;">你按下快门的瞬间，对方已经钻进了看不见的地方。</div>
        <div style="margin-top:10px; opacity:.9; line-height:1.6;">${scenicText(currentMapId)}</div>
      `;
      setPanel("动物格", fail);
    }
  }

  /* =========================
     陷阱格（你原版逻辑保留）
     ========================= */
  function trapFlavor(mapId) {
    const pool = {
      lake: {
        title: "碎石滩卡脚",
        intro:
          "你踩到一片看似稳固的碎石滩，石头突然往下一滑——脚踝被两块石头一前一后卡住，外加湿砂不断往里灌。",
        detail:
          "你每动一下，碎石就更贴合一点，像在认真学习你的脚型。",
        verb: "踢开碎石",
        callVerb: "喊人来搬开石头",
        sound: "你一喊，声音在水面上飘出去，像被浪花吞了半截。",
      },
      falls: {
        title: "藤蔓缠住",
        intro:
          "你为了绕开湿滑的苔藓踩进灌木里，下一秒脚腕一紧——几根藤蔓像提前排练过一样缠上来，把你牢牢拽住。",
        detail:
          "藤蔓不疼，但很烦，像有人把你的鞋带系成了死结。",
        verb: "扯断藤蔓",
        callVerb: "喊人来帮你解开",
        sound: "瀑声太大，你喊出来的字像被白噪音冲散。",
      },
      wetland: {
        title: "草丛沼陷",
        intro:
          "你踩到一片“看起来像草地”的地方，脚底一沉——其实是软沼。你没有立刻沉下去，但走也走不了。",
        detail:
          "越挣扎越像在给自己打地基。节目组在远处看得很认真。",
        verb: "小心抽腿",
        callVerb: "喊人来拉你",
        sound: "风把你的呼救吹了出去。",
      },
      forest: {
        title: "树根绊倒卡住",
        intro:
          "你跨过一段树根时鞋尖被勾住，整个人往前扑——好在没摔，但你的小腿被树根和灌木夹住，姿势很不体面。",
        detail:
          "你能动，但动得不帅。树根像在提醒：这里不欢迎大步流星。",
        verb: "挪开树根",
        callVerb: "喊人来扶你一把",
        sound: "林子里回声很近，听起来像你在跟自己吵架。",
      },
    };
    return pool[mapId] || pool.forest;
  }

  function renderTrapPanel(noteHtml = "") {
    const names = getSameMapNames(currentMapId);
    const f = trapFlavor(currentMapId);

    const listHtml = names.length
      ? names
          .map(
            (n) =>
              `<button type="button" class="chip trapChip" data-helper="${n}" style="
                padding:8px 10px; margin:4px 6px 0 0;
                border:1px solid rgba(255,255,255,.14);
                background:rgba(255,255,255,.06);
                font-weight:700;
              ">${n}</button>`
          )
          .join("")
      : `<span style="opacity:.8;">（本地图暂时没有其他嘉宾）</span>`;

    const body = `
      <div style="line-height:1.75; opacity:.92;">
        <b>${f.title}：</b>${f.intro}
        <div style="margin-top:8px; opacity:.9;">${f.detail}</div>
        <div style="margin-top:10px; font-size:12px; color: rgba(255,255,255,.78);">
          节目组提示：你可以<b>试图自己挣脱</b>（${f.verb}），或者<b>大声呼救</b>（${f.callVerb}）。
        </div>
      </div>

      ${
        noteHtml
          ? `<div style="margin-top:12px; padding:10px 12px; border:1px solid rgba(255,255,255,.12); background:rgba(255,255,255,.06); border-radius:12px; line-height:1.65;">
              ${noteHtml}
             </div>`
          : ""
      }

      <div style="margin-top:12px; font-size:12px; color: rgba(255,255,255,.75);">
        附近可能出现的嘉宾（点一下选择要叫谁）：
      </div>

      <div id="trapHelperList" style="margin-top:6px;">
        ${listHtml}
      </div>

      <div style="margin-top:10px; font-size:12px; color: rgba(255,255,255,.72);">
        你要叫来：<b id="trapPickedName">${trappedHelper ? trappedHelper : "（尚未选择）"}</b>
      </div>
    `;

    setPanel("陷阱格：你困住了", body, [
      { label: "试图自己挣脱", kind: "primary", onClick: () => trySelfEscape() },
      { label: "大声呼救（确认）", onClick: () => confirmCallHelp() },
    ]);

    // 事件委托
    const list = document.querySelector("#trapHelperList");
    if (list) {
      list.onclick = (e) => {
        const btn = e.target.closest("[data-helper]");
        if (!btn) return;

        trappedHelper = btn.dataset.helper || null;

        const out = document.querySelector("#trapPickedName");
        if (out) out.textContent = trappedHelper || "（尚未选择）";

        list.querySelectorAll("[data-helper]").forEach((b) => {
          b.style.background = "rgba(255,255,255,.06)";
          b.style.borderColor = "rgba(255,255,255,.14)";
        });
        btn.style.background = "rgba(255,255,255,.14)";
        btn.style.borderColor = "rgba(255,255,255,.28)";
      };
    }
  }

  function handleTrapCell() {
    isTrapped = true;
    trappedHelper = null;
    lockRoll("被困中…");
    setHint("你踩进了陷阱。先选择：挣脱 / 呼救。");
    renderTrapPanel();
  }

  function trySelfEscape() {
    const f = trapFlavor(currentMapId);
    const roll = Math.floor(Math.random() * 10) + 1;
    const th = 5;

    if (roll <= th) {
      isTrapped = false;
      trappedHelper = null;
      unlockRoll();
      setHint("你挣脱成功了。可以继续投骰。");

      setPanel(
        "脱困成功",
        `
        <div style="line-height:1.75; opacity:.92;">
          你深吸一口气，调整重心，开始认真执行“节目组建议动作”。
          <br/>（1-10：你掷出了 <b>${roll}</b>，成功阈值 ≤ <b>${th}</b>）
        </div>
        <div style="margin-top:10px; opacity:.9; line-height:1.6;">
          最后一下——你总算从困境里挣出来了。
          <br/>你拍了拍衣服，假装刚才只是“沉浸式体验”。
        </div>
        <div style="margin-top:10px; font-size:12px; color: rgba(255,255,255,.72);">
          （Roll 已解锁。）
        </div>
        `
      );
      return;
    }

    isTrapped = true;
    lockRoll("被困中…");
    setHint("没挣脱出来。你可以继续挣脱，或者呼救。");

    renderTrapPanel(`
      <b>挣脱失败。</b>
      （1-10：你掷出了 <b>${roll}</b>，成功阈值 ≤ <b>${th}</b>）
      <br/>你试图${f.verb}，结果只换来更尴尬的一点点位移。
      <br/>现在的问题是：继续硬撑，还是承认需要人？
    `);
  }

  function confirmCallHelp() {
    const names = getSameMapNames(currentMapId);
    const f = trapFlavor(currentMapId);

    if (!names.length) {
      setHint("这附近没人。只能继续自己处理。");
      setPanel(
        "呼救失败",
        `
        <div style="line-height:1.75; opacity:.92;">
          ${f.sound}
        </div>
        <div style="margin-top:10px; opacity:.9;">
          （本地图暂时没有其他嘉宾可来帮忙。）
        </div>
        <div style="margin-top:10px; font-size:12px; color: rgba(255,255,255,.72);">
          你仍然被困住，Roll 暂时不可用。
        </div>
        `,
        [
          { label: "再试一次挣脱", kind: "primary", onClick: () => trySelfEscape() },
          {
            label: "回到陷阱主面板",
            onClick: () =>
              renderTrapPanel(`<span style="opacity:.92;">你环顾四周：真没人。只能靠自己了。</span>`),
          },
        ]
      );
      return;
    }

    if (!trappedHelper) {
      setHint("你还没决定叫谁。");

      setPanel(
        "你要怎么喊？",
        `
        <div style="line-height:1.75; opacity:.92;">
          你清了清嗓子，话到嘴边又停住了：<b>要叫谁来</b>？
        </div>
        <div style="margin-top:10px; opacity:.9;">
          你可以选择：
          <br/>• <b>算了好丢人</b>：不喊了，继续自己挣脱
          <br/>• <b>随便谁都好</b>：节目组随机抓一个来救你
          <br/>• <b>我再想想喊谁</b>：回去从名单里点选
        </div>
        `,
        [
          {
            label: "算了好丢人",
            onClick: () => {
              isTrapped = true;
              lockRoll("被困中…");
              setHint("你决定先不喊。");
              renderTrapPanel(`<span style="opacity:.92;">你决定先不喊。脸可以丢，但不能丢得太快。</span>`);
            },
          },
          {
            label: "随便谁都好",
            kind: "primary",
            onClick: () => {
              const helper = names[Math.floor(Math.random() * names.length)];

              isTrapped = false;
              trappedHelper = null;
              unlockRoll();
              setHint("你脱困了。可以继续投骰。");

              setPanel(
                "呼救成功（随机）",
                `
                <div style="line-height:1.75; opacity:.92;">
                  你含糊地喊了一声“谁都行来一下——”，不久 <b>${helper}</b> 出现了。
                </div>
                <div style="margin-top:10px; opacity:.9; line-height:1.6;">
                  TA 没问原因，只是伸手把你往上拽。你顺势一蹬，总算脱困。
                  <br/>你们对视了一秒，默契地把“刚才的姿势”从记忆里删掉。
                </div>
                <div style="margin-top:10px; font-size:12px; color: rgba(255,255,255,.72);">
                  （Roll 已解锁。）
                </div>
                `
              );
            },
          },
          {
            label: "我再想想喊谁",
            onClick: () => {
              trappedHelper = null;
              renderTrapPanel(`<span style="opacity:.92;">你决定先重新选好名字再喊。</span>`);
            },
          },
        ]
      );
      return;
    }

    const helper = trappedHelper;

    isTrapped = false;
    trappedHelper = null;
    unlockRoll();
    setHint("你脱困了。可以继续投骰。");

    setPanel(
      "呼救成功",
      `
      <div style="line-height:1.75; opacity:.92;">
        你扯着嗓子喊了一声，<b>${helper}</b> 很快从旁边出现。
        <br/>${f.sound}
      </div>
      <div style="margin-top:10px; opacity:.9; line-height:1.6;">
        TA 伸手（或者干脆用力一拽）把你从困境里拉出来。
        <br/>你拍了拍衣服，轻声说了句“谢谢”，并决定以后走路少装酷一点。
      </div>
      <div style="margin-top:10px; font-size:12px; color: rgba(255,255,255,.72);">
        （你已脱困，Roll 已解锁。）
      </div>
      `
    );
  }

  /* =========================
     倒退格 / 特殊格 / 风景格 / 终点
     ========================= */
  function handleLostCell() {
    const back = 2;
    const newPos = Math.max(1, pos - back);
    setActive(newPos);

    setPanel(
      "倒退格",
      `
      <div style="line-height:1.7; opacity:.92;">
        你为了绕开地形走了回头路，倒退 <b>${back}</b> 格。
      </div>
      <div style="margin-top:10px; opacity:.9; line-height:1.6;">${scenicText(currentMapId)}</div>
      `
    );
  }

  function handleSpecialRumor() {
    const names = getSameMapNames(currentMapId);
    if (names.length < 2) {
      setPanel("造谣生事", "本地图嘉宾不足两人，节目组暂时造不了谣。");
      return;
    }

    const a = names[Math.floor(Math.random() * names.length)];
    let b = a;
    while (b === a) b = names[Math.floor(Math.random() * names.length)];

    setPanel(
      "造谣生事",
      `
      <div style="line-height:1.7; opacity:.92;">
        节目组开始乱点鸳鸯：<b>${a}</b> 和 <b>${b}</b> 被强制安排靠在一起“复盘”。
      </div>
      <div style="margin-top:10px; opacity:.9; line-height:1.6;">
        你听到一些似是而非的说法，但谁也没把话讲全。
      </div>
      `
    );
  }

  function handleScenicCell() {
    setPanel(
      "风景格",
      `<div style="line-height:1.7; opacity:.92;">${scenicText(currentMapId)}</div>`
    );
  }

  function softRestartRun() {
    if (timer) clearTimeout(timer);
    timer = null;
    isAnimating = false;

    if (diceOut) diceOut.textContent = "-";

    // ✅ 不换地图：回到当前棋盘的 1
    setActive(1);

    isTrapped = false;
    trappedHelper = null;

    if (restartBtn) restartBtn.style.display = "none";
    if (leaveBtn) leaveBtn.style.display = "none";

    unlockRoll();
    setHint("已重新开始本路线。继续投骰。");

    caughtCount = 0;
    lastAnimalTruth = null;
  }

  function handleEnd() {
    if (caughtCount <= 0) {
      const names = getSameMapNames(currentMapId);
      let a = names[0] || "（无人）";
      let b = names[1] || "（无人）";
      if (names.length >= 2) {
        a = names[Math.floor(Math.random() * names.length)];
        do { b = names[Math.floor(Math.random() * names.length)]; } while (b === a);
      }

      setPanel(
        "终点：节目组强制安排",
        `
        <div style="line-height:1.7; opacity:.92;">
          虽然本局没有成功拍到动物，但节目组强制安排：<b>随机抓两位同地图嘉宾靠在一起帮你复盘</b>。
        </div>
        <div style="margin-top:10px; opacity:.9;">本次复盘嘉宾：<b>${a}</b> ＋ <b>${b}</b></div>
        `,
        [
          {
            label: "再来一次",
            kind: "primary",
            onClick: () => {
              softRestartRun();
              handleScenicCell();
            },
          },
          {
            label: "离开",
            onClick: () => { window.location.href = FISHING_URL; },
          },
        ]
      );
      return;
    }

    setPanel(
      "终点：收官",
      `
      <div style="line-height:1.7; opacity:.92;">
        本局你成功拍到动物次数：<b>${caughtCount}</b>。节目组表示：不错，至少证明你没全程在看风景。
      </div>
      <div style="margin-top:10px; font-size:12px; color: rgba(255,255,255,.75);">
        （更多结算选项：随机抓俩 / 自选俩 / 自选一人+自拍 / 再来一次 —— 下一步补）
      </div>
      `,
      [
        {
          label: "再来一次",
          kind: "primary",
          onClick: () => { softRestartRun(); },
        },
        {
          label: "离开",
          onClick: () => { window.location.href = FISHING_URL; },
        },
      ]
    );
  }

  function onLand() {
    if (pos >= END_POS) { handleEnd(); return; }
    if (pos === SPECIAL_POS) { handleSpecialRumor(); return; }

    const cell = currentBoardEl?.querySelector(`.cell[data-pos="${pos}"]`);
    const type = cell?.dataset.type || "scenic";

    if (type === "animal") return handleAnimalCell();
    if (type === "trap") return handleTrapCell();
    if (type === "lost") return handleLostCell();

    return handleScenicCell();
  }

  /* ====== 动画：减速闪格（稳定：先落点事件，再决定是否解锁 Roll） ====== */
  function animateStepsEaseOut(steps) {
    if (steps <= 0) return;

    isAnimating = true;
    if (rollBtn) {
      rollBtn.disabled = true;
      rollBtn.textContent = "前进中…";
    }

    let i = 0;
    const startPos = pos;

    function tick() {
      i++;
      const nextPos = Math.min(END_POS, startPos + i);
      setActive(nextPos);

      if (i >= steps || pos >= END_POS) {
        isAnimating = false;

        const ended = finishIfEnd();
        onLand();

        if (!ended && !isTrapped) {
          unlockRoll();
          setHint("继续投骰。");
        } else if (!ended && isTrapped) {
          lockRoll("被困中…");
        }
        return;
      }

      const delay = 90 + i * 55;
      timer = setTimeout(tick, delay);
    }

    tick();
  }

  /* ====== 游戏流程：start / roll / restart / leave ====== */
  function isValidName(name) {
    const n = (name || "").trim();
    return !!(n && hasMap(n));
  }

  function startGame() {
    caughtCount = 0;
    lastAnimalTruth = null;

    isTrapped = false;
    trappedHelper = null;

    const name = normalizeName(nameIn.value);
    currentName = name;
    role = inferRoleByName(currentName);

    currentMapId = DB[name].map;
    const mapCn = MAP_LABEL[currentMapId] || currentMapId;

    // ✅ 只用你 HTML 里已有的 static board：forest / lake
    showBoard(currentMapId);
    clearActiveInAllBoards();
    setActive(1);

    if (assignOut) assignOut.textContent = `已匹配：${name}（${DB[name].gender}） → ${mapCn}`;
    if (mapTitle) mapTitle.textContent = mapCn;
    setMapSub("路线已分配。开始投骰。");
    setHint("投骰前进。");

    if (gameBoardWrap) gameBoardWrap.classList.remove("is-empty");

    lockGate();
    unlockRoll();
  }

  function hardResetBoardOnly() {
    if (timer) clearTimeout(timer);
    timer = null;
    isAnimating = false;

    if (diceOut) diceOut.textContent = "-";

    // 初始：隐藏全部棋盘，避免“两个 is-active 干扰”
    boards.forEach((b) => {
      b.hidden = true;
      b.classList.add("is-empty");
      b.querySelectorAll(".cell.is-active").forEach((c) => c.classList.remove("is-active"));
    });

    currentBoardEl = null;
    pos = 1;
    if (posOut) posOut.textContent = "1";

    isTrapped = false;
    trappedHelper = null;

    if (rollBtn) {
      rollBtn.disabled = true;
      rollBtn.textContent = "Roll";
    }
    if (restartBtn) restartBtn.style.display = "none";
    if (leaveBtn) leaveBtn.style.display = "none";

    if (gameBoardWrap) gameBoardWrap.classList.add("is-empty");
  }

  /* ====== 事件绑定 ====== */
  buildNamePicker();

  if (openPickerBtn) {
    openPickerBtn.addEventListener("click", () => showNamePicker());
  }

  if (startBtn) {
    startBtn.addEventListener("click", () => {
      const n = normalizeName(nameIn.value);

      if (!isValidName(n)) {
        if (assignOut) assignOut.textContent = "名字未匹配到路线名单，请重新选择。";
        setHint("请在弹出的列表中选择有效名字。");
        showNamePicker();
        if (nameIn) nameIn.value = "";
        return;
      }

      startGame();
    });
  }

  if (nameIn) {
    nameIn.addEventListener("keydown", (e) => {
      if (e.key === "Enter") startBtn?.click();
    });
  }

  if (rollBtn) {
    rollBtn.addEventListener("click", () => {
      if (isAnimating) return;

      if (isTrapped) {
        setHint("你还没脱困。先选择：挣脱 / 呼救。");
        return;
      }

      if (!currentMapId || !currentBoardEl) {
        setHint("请先进入路线。");
        return;
      }

      const dice = Math.floor(Math.random() * 6) + 1;
      if (diceOut) diceOut.textContent = String(dice);

      const steps = Math.min(dice, END_POS - pos);
      animateStepsEaseOut(steps);
    });
  }

  if (restartBtn) {
    restartBtn.addEventListener("click", () => {
      softRestartRun();
    });
  }

  if (leaveBtn) {
    leaveBtn.addEventListener("click", () => {
      window.location.href = FISHING_URL;
    });
  }

  /* ====== 初始化 ====== */
  hardResetBoardOnly();
  unlockGate();
  setHint("先输入名字并进入路线。");
})();
