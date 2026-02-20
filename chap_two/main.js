(() => {
  const $ = (s) => document.querySelector(s);

  /* ====== 配置 ====== */
  const FISHING_URL = "./side_index.html";
  const MAIN_URL = "../index.html"

  const MAP_LABEL = {
    lake: "有石头滩的湖边",
    falls: "林子附近的瀑布",
    wetland: "半山腰的缓坡湿地",
    forest: "斜坡上的深林",
  };
  const DB = {

  /* ===== lake ===== */
  "J.O.": { gender: "M", map: "lake" },
  "Ethan": { gender: "M", map: "lake" },
  "Samuel": { gender: "M", map: "lake" },
  "玛顿": { gender: "F", map: "lake" },
  "Oliven": { gender: "F", map: "lake" },
  "Erla": { gender: "F", map: "lake" },

  /* ===== falls ===== */
  "Cela": { gender: "F", map: "falls" }, 
  "Mubiru": { gender: "M", map: "falls", role: "biologist"},
  "Zurabia": { gender: "F", map: "falls" },
  "丹": { gender: "M", map: "falls" },
  "Naya": { gender: "F", map: "falls" },
  "Matt": { gender: "M", map: "falls" },
  "Maya": { gender: "F", map: "falls" },
  "橙知": { gender: "M", map: "falls" },
  "向林木": { gender: "F", map: "falls" },
  "阿基米德": { gender: "M", map: "falls" },

  /* ===== forest ===== */
  "Amber": { gender: "F", map: "forest" },
  "Thomas": { gender: "M", map: "forest" },
  "Honey": { gender: "M", map: "forest" },
  "Jeffrey": { gender: "F", map: "forest" },
  "Josephine": { gender: "F", map: "forest" },

  /* ===== wetland ===== */
  "马塞拉": { gender: "F", map: "wetland" },
  "Kazares": { gender: "M", map: "wetland" },
  "Moira": { gender: "F", map: "wetland" },
  "Eric": { gender: "M", map: "wetland" },
  "Melusine": { gender: "F", map: "wetland" },
  "奥利弗": { gender: "M", map: "wetland" },

  /* ===== no map (not in list) ===== */
  "Friedrich": { gender: "M" },
  "卡莱比": { gender: "M" },
  "叶澄希": { gender: "M" },
  "Romaine": { gender: "F" },
  "奈芙": { gender: "F" },

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
  const fromDB = DB[name]?.role;
  if (fromDB) return fromDB; // "biologist" / "photographer" / "normal"

  const s = (name || "").toLowerCase();
  if (s.includes("photo") || name.includes("摄")) return "photographer";
  if (s.includes("bio") || name.includes("生物")) return "biologist";
  return "normal";
}

  function getShootThreshold() {
    // 1-10，<= threshold 成功
    let base = 5;
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
  picker.inert = true; // ✅ 对称：关掉时也 inert
}


  function buildNamePicker() {
  if (!picker || !zhBox || !enBox) return;

  const names = Object.keys(DB);

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
     ✅ 结算：随机/自选 嘉宾
     ========================= */


  function sampleK(arr, k) {
    const a = (arr || []).slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a.slice(0, Math.min(k, a.length));
  }

  // —— 结算用 picker（独立于入口 namePicker，避免互相干扰）——
  let endPickerEl = null;

  function ensureEndPicker() {
    if (endPickerEl) return endPickerEl;

    const overlay = document.createElement("div");
    overlay.className = "pickerOverlay";
    overlay.hidden = true;
    overlay.inert = true;
    overlay.innerHTML = `

      <div class="pickerModal" role="dialog" aria-modal="true">
        <div class="pickerTop">
          <div class="pickerTitle">选择嘉宾</div>
          <button class="pickerClose" type="button">关闭</button>
        </div>
        <div class="pickerHint">从同地图嘉宾中选择。</div>

        <div class="pickerCols">
          <div>
            <div class="pickerSub">候选</div>
            <div class="pickerList pickerPool"></div>
          </div>
          <div>
            <div class="pickerSub">已选</div>
            <div class="pickerList pickerPicked"></div>
          </div>
        </div>

        <div class="pickerBottom">
          <button class="pickerCancel" type="button">取消</button>
          <button class="pickerOK" type="button" disabled>确定</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

const close = () => {
  overlay.hidden = true;
  overlay.inert = true;
};

    endPickerEl = overlay;
    return overlay;
  }

function openEndPicker({ pool, maxPick, title, hint, requireOpposite = false }) {
  const overlay = ensureEndPicker();
  overlay.hidden = false;
  overlay.inert = false;

  overlay.querySelector(".pickerTitle").textContent = title || "选择嘉宾";
  overlay.querySelector(".pickerHint").textContent = hint || "从同地图嘉宾中选择。";

  const poolBox = overlay.querySelector(".pickerPool");
  const pickedBox = overlay.querySelector(".pickerPicked");
  const okBtn = overlay.querySelector(".pickerOK");
  const cancelBtn = overlay.querySelector(".pickerCancel");
  const closeBtn = overlay.querySelector(".pickerClose");

  const picked = [];

  function close() {
    overlay.hidden = true;
    overlay.inert = true;
  }

  function refresh() {
    poolBox.innerHTML = "";
    pickedBox.innerHTML = "";

    const pickedG0 = picked[0] ? getGender(picked[0]) : null;

    (pool || []).forEach((name) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip";
      chip.textContent = name;

      const already = picked.includes(name);

      let violateOpposite = false;
      if (requireOpposite && maxPick === 2 && picked.length >= 1) {
        const g = getGender(name);
        if (pickedG0 && g && g === pickedG0) violateOpposite = true;
      }

      chip.disabled = already || picked.length >= maxPick || violateOpposite;

      chip.addEventListener("click", () => {
        if (picked.length < maxPick && !picked.includes(name)) {
          picked.push(name);
          refresh();
        }
      });

      poolBox.appendChild(chip);
    });

    picked.forEach((name) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip";
      chip.textContent = name + " ×";
      chip.addEventListener("click", () => {
        const idx = picked.indexOf(name);
        if (idx >= 0) picked.splice(idx, 1);
        refresh();
      });
      pickedBox.appendChild(chip);
    });

    let ok = picked.length === maxPick;
    if (ok && requireOpposite && maxPick === 2) {
      const gA = getGender(picked[0]);
      const gB = getGender(picked[1]);
      ok = !!(gA && gB && gA !== gB);
    }
    okBtn.disabled = !ok;
  }

  refresh();
  closeBtn?.focus?.({ preventScroll: true });

  return new Promise((resolve) => {
    const cleanup = () => {
      okBtn.removeEventListener("click", onOK);
      cancelBtn?.removeEventListener("click", onCancel);
      closeBtn?.removeEventListener("click", onCancel);
      overlay.removeEventListener("click", onMask);
    };

    const onOK = () => {
      close();
      cleanup();
      resolve(picked.slice());
    };

    const onCancel = () => {
      close();
      cleanup();
      resolve(null);
    };

    const onMask = (e) => {
      if (e.target === overlay) onCancel();
    };

    okBtn.addEventListener("click", onOK);
    cancelBtn?.addEventListener("click", onCancel);
    closeBtn?.addEventListener("click", onCancel);
    overlay.addEventListener("click", onMask);
  });
}


  function renderClosingEvent(choice, pickedNames) {
    // choice: "random2" | "pick2" | "pick1selfie"
    const mapCn = MAP_LABEL[currentMapId] || currentMapId;

    if (choice === "pick1selfie") {
      const p1 = pickedNames[0] || "（无人）";
      return `
        <div style="line-height:1.75; opacity:.92;">
          你病急乱投医，拉住 <b>${p1}</b>就要别人和你拍照。
          <br/>闪光一亮，至此留下了你的罪证。</i>
          <div style="margin-top:10px; font-size:12px; color: rgba(255,255,255,.75);">
            地点：${mapCn}
          </div>
        </div>
      `;
    }

    const p1 = pickedNames[0] || "（无人）";
    const p2 = pickedNames[1] || "（无人）";
    return `
      <div style="line-height:1.75; opacity:.92;">
        你把 <b>${p1}</b> 和 <b>${p2}</b> 抓来帮忙。说一双一对是俩人也可以！ 
        <br/>不管怎么说，拍到一对动物。是什么你先别管。
      </div>
    `;
  }


function kickToFishing(name) {
  setPanel(
    "你没跟上啊！",
    `
    <div style="line-height:1.7; opacity:.92;">
      <b>${name}</b> 不在本章路线名单里。
      <br/>下次好好听广播！现在先去钓鱼吧!
    </div>
    `,
    [
      {
        label: "去钓鱼",
        kind: "primary",
        onClick: () => { window.location.href = FISHING_URL; }
      }
    ]
  );
  setHint("不在路线名单：去钓鱼。");
}



/* =========================
   ✅ 造谣：文案池 + 渲染
   ========================= */
function pickOne(arr){
  return arr[(Math.random() * arr.length) | 0];
}

// mode: "pair" | "self"
function rumorText(mode, A, B) {
  const poolPair = [
    `有人说 <b>${A}</b> 刚才替 <b>${B}</b> 把外套扣子扣上了——但镜头只拍到一只手。`,
    `工作人员“无意”放出一句：<b>${A}</b> 和 <b>${B}</b> 在非录制区待太久了。`,
    `路过的人听到 <b>${A}</b> 说“别走”，但没听清对象是不是 <b>${B}</b>。`,
    `传闻：<b>${A}</b> 给 <b>${B}</b> 指了条“更近的路”，结果两人一起消失了三分钟。`,
    `有人拍到 <b>${A}</b> 和 <b>${B}</b> 同时回头看了一眼——像约好的一样。`
  ];

  const poolSelf = [
    `你刚说完“我没事”，镜头就剪到 <b>${B}</b> 盯着你看了两秒——弹幕立刻开香槟。`,
    `主持人嘴欠的要命：你和 <b>${B}</b> 的距离刚好是能被误会的距离。`,
    `传闻：<b>${B}</b> 是第一个记住你路线的人——你否认，但没解释。`,
    `有人说 <b>${B}</b> 在找你的时候语气太急了。`,
  ];

  return pickOne(mode === "self" ? poolSelf : poolPair);
}

// choice: "random2" | "pick2" | "pick1selfie"
function renderRumorEvent(choice, pickedNames){
  const mapCn = MAP_LABEL[currentMapId] || currentMapId;

  if (choice === "pick1selfie") {
    const B = pickedNames[0] || "（无人）";
    return `
      <div style="line-height:1.75; opacity:.92;">
        <b>节目组造谣：</b>${rumorText("self", currentName, B)}
        <div style="margin-top:10px; font-size:12px; color: rgba(255,255,255,.75);">
          地点：${mapCn}（造谣格）
        </div>
      </div>
    `;
  }

  const A = pickedNames[0] || "（无人）";
  const B = pickedNames[1] || "（无人）";
  return `
    <div style="line-height:1.75; opacity:.92;">
      <b>节目组造谣：</b>${rumorText("pair", A, B)}
      <div style="margin-top:10px; font-size:12px; color: rgba(255,255,255,.75);">
        地点：${mapCn}（造谣格）
      </div>
    </div>
  `;
}


  /* =========================
     文案池
     ========================= */
function scenicText(mapId) {
  const pool = {
    lake: [
       "你站在湖边等了一会儿。什么也没有出现。",
      "湖边的风吹乱了倒影。你分不清那是不是别的东西。",
      "石头间似乎有什么移动。但很快又藏进了水里。",
      "你举起相机时，湖边只剩下风声。刚才的动静已经不见了。",
    ],
    falls: [
       "瀑布的水声盖过了其他动静。",
      "水雾遮住了你的视线。",
      "岩石后方好像有什么晃动，很快又被水雾吞没。",
      "瀑布旁的草丛轻轻摇了一下，随后恢复安静。"
    ],
    wetland: [
      "湿地的草轻轻晃动了一下。",
      "水面泛起一圈小小的波纹。",
      "你以为有什么从草间经过，却什么也没留下。",
      "泥水轻轻翻动了一下，你无法确认原因。"
    ],
    forest: [
      "你只听到了一阵树叶晃动的声音，却什么也没拍到。或许你应该找一位同区域嘉宾确认刚才发生了什么。",
      "你看到一道影子快速消失在树林深处。你无法确认那究竟是什么动物。",
      "你举起相机时，一切已经恢复了安静。只剩下风声和树影。",
    ],
  };

  const arr = pool[mapId];
  if (!arr || !arr.length) return "你继续往前走，周围的景色没有太大变化。";
  return pickOne(arr);
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

const WETLAND_ANIMALS = [
  {
    truth: "美洲河狸",
    desc: `你拍到了一对体型明显较大的动物，身体粗壮，四肢短而有力。<br><br>

它们的毛色呈深棕色，在湿地边缘的水中缓慢游动。<br>
当其中一只转身时，你清楚看到它那条又宽又扁的尾巴拍打水面。<br><br>

它们轮流浮出水面换气，又一前一后游向岸边的树枝堆。<br>
其中一只正在用前爪抱着树枝，另一只在旁边停留观察。<br><br>

你怀疑这是某种水边生活的啮齿类动物。<br>
也许是河狸？也可能是某种外形相近的大型水栖动物。<br><br>

要不去问问更了解湿地动物的人？`
  },

  {
    truth: "普通浣熊",
    desc: `你拍到了一对体型中等的哺乳动物。<br><br>
它们的身体圆润，四肢灵活，动作看起来非常熟练。<br>
毛色呈灰褐色，尾巴上有明显的深浅相间环状条纹。<br>
脸部有一圈深色的斑纹，看起来像戴着面罩。<br><br>

其中一只用前爪翻动湿地边缘的石头，另一只低头在水边寻找食物。<br>
它们时不时抬头彼此确认位置。<br><br>

你怀疑这是某种杂食性的湿地动物。<br>
也许是浣熊？也可能是某种外形相似的小型食肉动物。<br><br>

要不去问问更了解野生动物的人？`
  },

  {
    truth: "红翅黑鹂",
    desc: `你拍到了一对体型中等的小型鸟类。<br><br>
它们停在湿地的芦苇和低矮灌木上来回移动。<br>

其中一只全身羽毛呈黑色，翅膀边缘有一块鲜红色与黄色相间的斑块。<br>
另一只颜色更偏褐色，体态略显低调。<br><br>

它们在同一片芦苇丛中轮流鸣叫，又迅速飞到附近的枝条上。<br><br>

你不确定自己看到的是哪一种鸟类。<br>
或许可以去问问更了解鸟的人。`
  },

  {
    truth: "林鸳鸯",
    desc: `你拍到了一对体型中等的水鸟在湿地边缘缓慢游动。<br><br>

其中一只羽毛颜色非常丰富，头部有明显的绿色与紫色光泽，眼睛也是红色的，脸上带有清晰的白色条纹。<br>
另一只颜色较为朴素，整体呈灰褐色。<br><br>

它们像一对情侣鸟，一前一后游过水面，偶尔低头在水中寻找食物。<br><br>

你不确定自己看到的是哪一种鸟类。<br><br>

或许可以去问问更了解鸟的人。`
  },

  {
    truth: "路易斯安那水鶺鹠",
    desc: `你拍到了一对体型较小的鸟类。<br><br>
它们沿着浅水溪流边缘来回行走，而不是直接飞走。<br>

羽毛呈棕色与浅色相间，眼睛上方有一条明显的浅色线条。<br>
尾巴在停下时会轻轻上下摆动。<br><br>

它们在水边低头寻找昆虫，又迅速跳到附近的石头上。<br>
你怀疑这是某种与水边密切相关的小型鸟类。<br><br>

也许可以去问问更了解鸟类的人？`
  },

  {
    truth: "长嘴沼泽鹪鹩",
    desc: `你拍到了一对体型很小的鸟类。<br><br>

它们在芦苇与湿草之间快速穿梭，很少停在开阔地面。<br>
这种鸟类的上半身羽毛为棕色，腹部和侧面为浅棕色，喉部和胸部为白色。<br>
背部为黑色，有白色条纹。眼皮为黑色带有白线，啄短且薄，尾巴短而直立。<br><br>

两只鸟始终保持在同一片芦苇丛中活动，其中一只叫声十分响亮。<br><br>

你怀疑这是一种生活在沼泽中的小型鸣禽。<br>
去问问有相关经验或者专业的人可能是个好主意？`
  },

  {
    truth: "大白鹭",
    desc: `你拍到了一对体型很大的白色鸟类。<br><br>

它们站在浅水中，身体直立，脖子细长呈现出优雅的弯曲形态。<br>

羽毛几乎全为纯白色，在阳光下非常醒目。<br>
它们用长而尖的黄色喙对准水面，一动不动地等待猎物。<br>
当其中一只突然低头捕食时，另一只仍保持静止姿态。<br><br>

和你平时看见的天鹅完全不一样，你怀疑这是一种大型涉水鸟类。<br>
去问问喜欢观鸟的人说不定会有结果？`
  }
];

const FALLS_ANIMALS = [
  {
    truth: "春鸣蛙",
    desc: `你拍到了一对体型极小的蛙类。<br><br>

其中一只体型比旁边那只略小，喉部的皮肤颜色较深且有些松弛。<br>
你拍到它时，它的喉部正鼓起一个接近透明的半球形鸣囊，背部有一个清晰的、深色的“X”型标记。<br>
体型稍大的那只腹部看起来比较圆鼓。它的背部同样有“X”型标记，但喉部皮肤平整且颜色较浅。<br><br>

这两只小东西都停在瀑布旁的潮湿灌木枝条上，位置一高一低。<br><br>

虽然不知道具体是什么蛙类，但——小心有嘉宾害怕这个。`
  },

  {
    truth: "林蛙",
    desc: `你拍到了一对体型较小的蛙类。<br><br>

其中一只体型较小，前肢非常粗壮。它的背部边缘有两条明显的褶皱线。<br>
另一只体型明显更大，身体颜色偏向浅棕色。<br><br>

它们正穿过瀑布旁的潮湿落叶层，一只紧跟在另一只后方移动。<br><br>

虽然不知道具体是什么蛙类，但——小心有嘉宾害怕这个。`
  },

  {
    truth: "斑点蝾螈",
    desc: `在瀑布旁潮湿的岩石缝隙里，你意外抓拍到了两只滑溜溜的小东西。<br><br>

这种生物的皮肤是湿润的深黑色，背部有两排亮黄色的圆斑。<br>
体型较大的那只背部的黄色斑点也相对较大。<br><br>

它们正从瀑布边的岩石缝隙中爬出，身体表面覆盖着一层粘液，在阴影中反射光亮。<br><br>

这看起来像个带斑点的长尾巴青蛙，但又不太像，可能是蝾螈？<br>
这种黏糊糊的惊喜，不知道你的心动嘉宾会不会喜欢？`
  },

  {
    truth: "大蓝鹭",
    desc: `在瀑布下游的浅滩，你拍到了一对极其高大的水鸟。<br><br>

它们有着长长的、像S型弯曲的脖子，全身覆盖着灰蓝色的羽毛。<br>
它像一尊雕塑一样一动不动地站在水里，淡黄色的长喙垂向水面。<br>
另一只则突然对着水面发动袭击，用长喙叼起一条鱼。<br><br>

你不敢确定这到底是什么鹤还是鹭，这种孤傲的气质倒是挺适合分享给某人的。<br>
以此为话题去问问其他更了解的嘉宾吧？`
  },

  {
    truth: "卡罗莱纳山雀",
    desc: `你抓拍到了一对小巧玲珑、圆滚滚的鸟。<br><br>

它们的头顶和喉部是黑色的，脸颊则是显眼的白色，看起来像戴了个黑色的小头盔。<br>
它们在瀑布旁的枝头跳来跳去，一点也不怕人，嘴里还不停地发出“奇卡-地-地”的叫声。<br><br>

你不确定这是什么种类的鸟，但也许可以以此作为话题四处问问？`
  },

  {
    truth: "美洲知更鸟",
    desc: `你拍到了一对在瀑布旁灌木丛里跳跃的小鸟。<br><br>

它们有红砖色的胸脯，背部是深灰色的，眼周有细碎的白圈。<br>
它们在湿润的泥土里翻找着什么，偶尔发出一阵清脆的鸣叫。<br><br>

你怀疑这就是传说中报春的那种鸟，但又不确定。<br>
或许这可以作为你们聊天的一个开场白。`
  }
];


const LAKE_ANIMALS = [
  {
    truth: "加拿大雁",
    desc: `你抓拍到了一对体型很大的水鸟。<br><br>

它们有着标志性的长黑色脖子和头部，脸颊上有一块非常显眼的白色斑纹，背部和翅膀的羽毛主要是棕灰色的。<br>
它们在石头滩上并排走着，步态有些摇晃。<br>
当它们游进水里时，长长的脖子划出优雅的弧线。<br><br>

你怀疑这是某种大雁，也许可以去问问更了解野生动物的嘉宾？`
  },

  {
    truth: "绿头鸭",
    desc: `你拍到了一对在水面嬉戏的小型鸭子。<br><br>

其中一只的脖子有一道亮眼的白色条纹，眼睛周围和正脑袋是泛着金属反光的绿色羽毛，在阳光下闪着光。<br>
另一只则显得朴素很多，看起来像是普通的麻纹鸭子。<br><br>

它们在湖边的浅水区迅速地啄食水草，尾巴尖翘起，侧面有一块明显的白色块。<br><br>

这种花哨的颜色让你怀疑它是某种观赏鸭。<br>
要不拿这张照片去考考你的心动对象？`
  },

  {
    truth: "赤颈鸭",
    desc: `你拍到了一对在水面嬉戏的小型鸭子。<br><br>

它们游动的姿态非常轻盈，甚至有点贼头贼脑的。<br>
其中一只头部和颈部是浓郁的棕红色，额头有一块耀眼的金黄色。<br>
背部是以灰白色为底，上面全是细如发丝的暗褐色波浪横纹。<br>
尾巴则是饱满的黑色。另一只就显得朴素很多。<br><br>

它们在湖边的浅水区迅速地啄食水草，相伴而游。<br><br>

这种斑斓的颜色让你怀疑它是某种从谁家后花园溜出来的观赏鸭，或者某种野生的杂交种。<br>
要不拿这张照片去考考你的心动对象？`
  },

  {
    truth: "白尾鹿",
    desc: `你拍到了一对体型优美的食草动物，正轻手轻脚地在湖边的碎石滩上饮水。<br><br>

它们身上披着棕红色的短毛。<br><br>

当你试图靠近时，其中一只突然警觉地竖起了小短尾巴，露出了内侧像雪一样白的毛，像是在发出某种信号，随后它们迅速跃进了附近的树丛。<br><br>

你确定这是鹿，但具体不知道是哪一种。<br>
这种“白尾巴”的警示动作让你觉得挺有意思，或许可以拿去问问那位同样喜欢安静的嘉宾。`
  },

  {
    truth: "浣熊",
    desc: `你抓拍到了一对在石头缝里鬼鬼祟祟翻找东西的家伙。<br><br>

它们有着标志性的黑眼圈，看起来像戴了眼罩的小偷。<br>
尾巴长而蓬松，上面有一圈圈黑灰相间的环纹。<br><br>

最有趣的是，它们竟然像人一样用前爪在湖水里不停地揉搓着什么，动作显得专业又滑稽。<br><br>

这就是主持人提醒过要防范的“专业小偷”吧？<br>
你得赶紧确认一下自己的背包拉链有没有拉好。`
  },

  {
    truth: "双冠鸬鹚",
    desc: `你拍到了两只全身漆黑的大鸟。<br><br>

它们正站在湖边的枯木上，张开巨大的翅膀一动不动，像是在晾晒一件黑色的雨衣。<br>
它们的嘴很长，尖端带钩，喉咙处有一小块橙黄色的皮肤。<br><br>

它们潜入水中时非常安静，再冒头时已经在几十米外了。<br><br>

你分不清这是什么水鸟的亲戚还是某种水怪，或许该找个懂行的人问问。`
  },

  {
    truth: "白腹鱼狗",
    desc: `你拍到了一对头部比例都大得有些夸张的鸟，它正俯冲向湖面，激起一圈波纹。<br><br>

它的羽毛呈现出一种高级的板岩蓝，头顶有一丛像没梳理好的冠羽，显得乱糟糟的。<br>
胸前有一道宽阔的蓝色横带，腹部则是干净的白色。<br><br>

它发出的声音像一阵急促的木制响板。<br>
这小家伙捕鱼的架势非常专业，你怀疑它才是这片湖的主人。<br><br>

具体是哪种水鸟你可能还需要四处问问懂行的人。`
  }
];

const FOREST_ANIMALS = [
  {
    truth: "红狐",
    desc: `你拍到了一对体型较大的动物。<br><br>

它们的身体细长，尾巴下垂，看起来非常蓬松，几乎和身体一样长。<br>
毛色以红褐色为主，腹部和下巴是浅白色的。<br>
它们在斜坡下方一前一后缓慢移动，看起来彼此保持着一定距离。<br>
其中一只停下来抬头观察四周，另一只继续向前探索。<br><br>

你怀疑这是某种狐狸或豺狼，具体种类你不太清楚。<br>
要不去问问更了解野生动物的人？`
  },

  {
    truth: "花栗鼠",
    desc: `你抓拍到了一对体型很小、像老鼠一样的动物。<br><br>

它们在树根和落叶之间来回穿梭，动作非常迅速。<br>
身体上有明显的浅色与深色相间的纵向条纹，从头部一直延伸到尾巴。<br>
它们的尾巴较短但蓬松，停下来时会抬起头彼此对视，然后迅速分开钻进不同的方向。<br>
毛色以棕褐色为主，在它们用后肢站立的时候你可以看见它们腹部的浅色。<br><br>

你怀疑这是一种小型啮齿动物，但具体种类不太确定。<br>
也许是花栗鼠？也可能是某种地松鼠。<br>
要不去问问更了解自然的人？或者以这个为由去找你的心动嘉宾聊聊。`
  },

  {
    truth: "棉尾兔",
    desc: `你拍到了一对体型中等的兔子，身体圆润，四肢较短。<br><br>

它们贴着地面一跃一停，耳朵长而直立，始终保持警觉。<br>
毛色以灰褐色为主，背部略深，腹部颜色偏浅。<br>
当其中一只转身时，你注意到尾巴底部呈现出明显的白色。<br>
当你靠近时，其中一只突然停住抬头观察，另一只迅速跳进低矮的灌木后方。<br><br>

你怀疑这是一种野兔或家兔的近亲，但无法确定具体是哪一种。<br>
或许可以去问问更了解这些动物的人。`
  },

  {
    truth: "野火鸡",
    desc: `你拍到了一对体型明显比周围动物更大的鸟类。<br><br>

它们站在树林空地中缓慢行走，身体直立，步伐稳重。<br>
羽毛整体呈深棕色与黑色交错，在阳光下隐约反射出金属般的光泽。<br>
头部和颈部没有羽毛覆盖，裸露的皮肤看起来颜色红红的。<br>
它们低头在地面啄食时，会同时停下动作，像是在互相确认周围环境是否安全。<br><br>

你怀疑这是一种大型地面活动的鸟类，可能是感恩节吃的那个，也可能是别的东西，但无法确认具体种类。<br>
或许可以找人一起判断你刚刚看到的是什么。`
  },

  {
    truth: "红腹啄木鸟",
    desc: `你拍到了一对体型中等的鸟类。<br><br>

它们在树干之间跳跃，不断停下来用黑色的尖喙敲击树皮。<br>
你重新查看照片才发现这种鸟的面部及下体呈浅灰色；背部和尾部则有黑白相间条纹。<br>
其中一只颈部后方有红色的羽毛，另一只的红羽则覆盖到了脑后。<br><br>

你怀疑这是一种啄木鸟，毕竟它们一直在敲树干，但无法确认它们究竟属于哪一种。<br>
或许可以去问问更了解鸟的人。`
  },

  {
    truth: "绒啄木鸟",
    desc: `你拍到了一对巴掌大小的鸟类。<br><br>

它们一起从一个树洞里探出头四处张望。<br>
其中一只脑后有红斑的鸟率先飞了出来。<br>
你注意到这种鸟的翅膀主要是黑色的，夹杂着一些白色的半点。<br>
背部、喉部及腹部也是白色。<br>
仔细查看照片，你发现这种鸟的眼上与眼下各有一个白色条状花纹。<br><br>

你无法确认它们究竟属于哪一种鸟类。<br>
或许可以去问问更了解鸟的人。`
  },

  {
    truth: "暗眼灯草鹀",
    desc: `你拍到了一对体型很小的鸟类，看起来和麻雀差不多大小。<br><br>

它们在地面和低矮灌木之间跳跃移动，看起来总是保持着彼此不远的距离。<br>
这对鸟浑身都是灰色，唯独腹部呈现白色，白色外尾羽在飞行时和地面跳跃时闪烁。<br>
放大照片才能看见它们的鸟喙是浅粉红色的。<br><br>

你不确定自己看到的是哪一种鸟类。<br>
或许可以去问问更了解鸟的人。`
  }
];


  /* =========================
     动物格
     ========================= */
  function handleAnimalCell() {
    const roll = Math.floor(Math.random() * 10) + 1; // 1-10
    const th = getShootThreshold();
    const ok = roll <= th;

if (ok) {
  caughtCount += 1;

  let pickedAnimal = null;

  if (currentMapId === "forest") pickedAnimal = pickOne(FOREST_ANIMALS);
  else if (currentMapId === "lake") pickedAnimal = pickOne(LAKE_ANIMALS);
  else if (currentMapId === "falls") pickedAnimal = pickOne(FALLS_ANIMALS);
  else if (currentMapId === "wetland") pickedAnimal = pickOne(WETLAND_ANIMALS);

  lastAnimalTruth = pickedAnimal?.truth || animalTruth(currentMapId);


  const base = `
<div style="margin-bottom:8px;">
  <b>拍摄成功。</b>（1-10：你掷出了 <b>${roll}</b>，成功阈值 ≤ <b>${th}</b>）
</div>

    <div style="opacity:.92; line-height:1.6;">
      ${pickedAnimal ? pickedAnimal.desc : blurredAnimalDesc(currentMapId)}
    </div>
  `;


      const actions = [];
      if (role === "biologist") {
        actions.push({
          label: "专业知识——我知道这是什么(正确答案)",
          kind: "primary",
          onClick: () => {
            setPanel(
              "正确答案已揭晓",
              `<div style="font-size:14px; line-height:1.7;">
                基于你的专业知识，你从一些细节确认这个生物就是：<b>${lastAnimalTruth}</b>。
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
          "你每动一下，碎石就更贴合一点。",
        verb: "踢开碎石",
        callVerb: "喊人来搬开石头",
        sound: "你一喊，声音在水面上飘出去——",
      },
      falls: {
        title: "藤蔓缠住",
        intro:
          "你为了绕开湿滑的苔藓踩进灌木里，下一秒脚腕一紧。几根藤蔓像提前排练过一样缠上来，把你牢牢拽住。",
        detail:
          "藤蔓不疼，但很烦。",
        verb: "扯断藤蔓",
        callVerb: "喊人来帮你解开",
        sound: "瀑声太大，你喊出来的字像被白噪音冲散。",
      },
      wetland: {
        title: "草丛沼陷",
        intro:
          "你踩到一片看起来像草地的地方，脚底一沉——其实是软沼。你没有立刻沉下去，但走也走不了。",
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
          "你能动，但动得不是很自然。树根像在提醒：这里不欢迎大步流星。",
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
          你深吸一口气，调整重心。
          <br/>（1-10：你掷出了 <b>${roll}</b>，成功阈值 ≤ <b>${th}</b>）
        </div>
        <div style="margin-top:10px; opacity:.9; line-height:1.6;">
          最后一下——你总算从困境里挣出来了。
          <br/>你拍了拍衣服，假装刚才只是沉浸式体验。
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
      <br/>现在的问题是：继续硬撑，还是承认需要帮忙？
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
          <br/><b>算了好丢人。</b>：不喊了，继续自己挣脱
          <br/><b>随便谁都好！！</b>：节目组随机抓一个来救你
          <br/><b>我再想想喊谁。</b>：回去从名单里点选
        </div>
        `,
        [
          {
            label: "算了好丢人。",
            onClick: () => {
              isTrapped = true;
              lockRoll("被困中…");
              setHint("你决定先不喊。");
              renderTrapPanel(`<span style="opacity:.92;">你决定先不喊。脸可以丢，但不能丢得太快。</span>`);
            },
          },
          {
            label: "随便谁都好！！",
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
                  <br/>你们对视了一秒，默契地把刚才的姿势从记忆里删掉。
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
        <br/>你拍了拍衣服并道谢，以后走路少装酷一点。
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
  const pool = getSameMapNames(currentMapId);

  setPanel(
    "造谣生事",
    `
    <div style="line-height:1.7; opacity:.92;">
      你踩中了<b>造谣格</b>。
    </div>
    <div style="margin-top:10px; opacity:.9;">
      选择一个造谣方式（默认都要求<b>一男一女</b>）：
    </div>
    `,
    [
      {
        label: "随机抓俩（异性）",
        kind: "primary",
        onClick: () => {
          const picked = sampleOppositePair(pool);
          if (!picked) {
            setPanel(
              "造谣失败",
              `<div style="line-height:1.7; opacity:.92;">
                本地图凑不出<b>一男一女</b>组合（同地图缺少某个性别）。
              </div>`,
              [{ }]
            );
            return;
          }

          setPanel(
            "造谣事件：随机抓俩",
            renderRumorEvent("random2", picked),
            [{  }]
          );
        },
      },

      {
        label: "我来点名俩（异性）",
        onClick: async () => {
          if (pool.length < 2) {
            setPanel(
              "造谣失败",
              `<div style="line-height:1.7; opacity:.92;">本地图嘉宾不足两人，没法点名俩。</div>`,
              [{ }]
            );
            return;
          }

          const picked = await openEndPicker({
            pool,
            maxPick: 2,
            title: "点名两位嘉宾",
            hint: "从同地图嘉宾里选 2 个（必须一男一女）",
            requireOpposite: true,
          });

          if (!picked) return;

          setPanel(
            "造谣事件：点名俩",
            renderRumorEvent("pick2", picked),
            [{  }]
          );
        },
      },

      {
        label: "造我自己的谣。",
        onClick: async () => {
          const selfG = getGender(currentName);
          const poolOpp = pool.filter((n) => {
            const g = getGender(n);
            return selfG && g && g !== selfG;
          });

          if (!poolOpp.length) {
            setPanel(
              "造谣失败",
              `<div style="line-height:1.7; opacity:.92;">本地图没有与你<b>异性</b>的嘉宾可选。</div>`,
              [{ }]
            );
            return;
          }

          const picked = await openEndPicker({
            pool: poolOpp,
            maxPick: 1,
            title: "选一位异性嘉宾（你+TA）",
            hint: "从同地图嘉宾里选 1 位异性嘉宾。",
          });

          if (!picked) return;

          setPanel(
            "造谣事件：你+TA",
            renderRumorEvent("pick1selfie", picked),
            [{  }]
          );
        },
      },
    ]
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

  // 不换地图：回到当前棋盘的 1
  setActive(1);

  isTrapped = false;
  trappedHelper = null;

  if (restartBtn) restartBtn.style.display = "none";
  if (leaveBtn) leaveBtn.style.display = "none";

  unlockRoll();

  caughtCount = 0;
  lastAnimalTruth = null;


  const mapCn = MAP_LABEL[currentMapId] || currentMapId || "起点";
  setPanel(
    mapCn,
    `
      <div style="line-height:1.7; opacity:.92;">
        已重新开始本路线。你回到起点，准备继续投骰。
      </div>
    `,
    [] // 清空按钮区
  );

  setHint("已重新开始本路线。继续投骰。");
}




function handleEnd() {
  const pool = getSameMapNames(currentMapId);

  // count==0 才给三选一
  if (caughtCount <= 0) {
    setPanel(
      "终点：收官（本局0只动物）",
      `
      <div style="line-height:1.7; opacity:.92;">
        本局没有成功拍到动物（<b>${caughtCount}</b>）。
        <br/>但节目组说了<b>一对人也算动物</b>。 
        所以找两个嘉宾来帮忙也是完全可以的。或者抓人和你拍一张。
      </div>
      <div style="margin-top:10px; opacity:.9;">
        选择一个收官事件：
      </div>
      `,
      [
        {
          label: "随机抓俩",
          kind: "primary",
          onClick: () => {
            const picked = sampleOppositePair(pool);
            if (!picked) {
              setPanel(
                "收官事件：随机抓俩",
                `<div style="line-height:1.7; opacity:.92;">
                  本地图凑不出<b>一男一女</b>组合（同地图缺少某个性别）。
                 </div>`,
                [
                  { label: "再来一次", kind: "primary", onClick: () => softRestartRun() },
                  { label: "离开", onClick: () => { window.location.href = MAIN_URL; } },
                ]
              );
              return;
            }

            setPanel(
              "收官事件：随机抓俩",
              renderClosingEvent("random2", picked),
              [
                { label: "再来一次", kind: "primary", onClick: () => softRestartRun() },
                { label: "离开", onClick: () => { window.location.href = MAIN_URL; } },
              ]
            );
          },
        },

        {
          label: "自己选两个",
          onClick: async () => {
            if (pool.length < 2) {
              setPanel(
                "收官事件：自己选两个",
                `<div style="line-height:1.7; opacity:.92;">本地图嘉宾不足两人，没法自选两个。</div>`,
                [{ label: "返回结算", kind: "primary", onClick: () => handleEnd() }]
              );
              return;
            }

            const picked = await openEndPicker({
              pool,
              maxPick: 2,
              title: "自己选两个嘉宾",
              hint: "从同地图嘉宾里选 2 个（必须一男一女）。",
              requireOpposite: true,
            });

            if (!picked) return;

            setPanel(
              "收官事件：自选俩",
              renderClosingEvent("pick2", picked),
              [
                { label: "再来一次", kind: "primary", onClick: () => softRestartRun() },
                { label: "离开", onClick: () => { window.location.href = MAIN_URL; } },
              ]
            );
          },
        },

        {
          label: "我自己上！（再选一个异性）",
          onClick: async () => {
            const selfG = getGender(currentName);
            const poolOpp = pool.filter((n) => {
              const g = getGender(n);
              return selfG && g && g !== selfG;
            });

            if (!poolOpp.length) {
              setPanel(
                "双人合影",
                `<div style="line-height:1.7; opacity:.92;">
                  本地图没有与你<b>异性</b>的嘉宾可选。
                </div>`,
                [
                  { label: "再来一次", kind: "primary", onClick: () => softRestartRun() },
                  { label: "离开", onClick: () => { window.location.href = MAIN_URL; } },
                ]
              );
              return;
            }

            const picked = await openEndPicker({
              pool: poolOpp,
              maxPick: 1,
              title: "选一个人拍合照",
              hint: "从同地图嘉宾里选 1 位异性嘉宾。",
            });

            if (!picked) return;

            setPanel(
              "双人合影",
              renderClosingEvent("pick1selfie", picked),
              [
                { label: "再来一次", kind: "primary", onClick: () => softRestartRun() },
                { label: "离开", onClick: () => { window.location.href = MAIN_URL; } },
              ]
            );
          },
        },

        // ✅ 你说 count=0 才弹出三选一：那这里不需要再放“再来一次/离开”也行
        // 但放着也没坏处（用户不想选事件也能走）
        { label: "再来一次（保留地图）", onClick: () => softRestartRun() },
        { label: "离开", onClick: () => { window.location.href = MAIN_URL; } },
      ]
    );

    return; // ✅ 关键：0动物分支结束后直接退出
  }

  // count>0：只给再来一次 + 离开
  setPanel(
    "终点：正常结束",
    `
    <div style="line-height:1.7; opacity:.92;">
      本局你成功拍到动物次数：<b>${caughtCount}</b>。
      <br/>可以收工了！但想多转转也无妨。
    </div>
    `,
    [
      { label: "再来一次", kind: "primary", onClick: () => softRestartRun() },
      { label: "离开", onClick: () => { window.location.href = MAIN_URL; } },
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


function getGender(name){
  return DB[name]?.gender || null; // "M" | "F" | null
}

function splitByGender(names){
  const m = [], f = [];
  (names || []).forEach(n=>{
    const g = getGender(n);
    if (g === "M") m.push(n);
    else if (g === "F") f.push(n);
  });
  return { m, f };
}

// 随机抽 1男1女（顺序不重要）
function sampleOppositePair(names){
  const { m, f } = splitByGender(names);
  if (!m.length || !f.length) return null;
  const a = m[(Math.random()*m.length)|0];
  const b = f[(Math.random()*f.length)|0];
  return [a, b];
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


setPanel("", "", []);   // 会把 mapTitle/mapSub 清空，同时清空 actions
setHint("");

    // 名字不在 DB：让他去 picker 选
    if (!DB[n]) {
      if (assignOut) assignOut.textContent = "名字不在 DB 里，请从列表选择。";
      setHint("请在弹出的列表中选择名字。");
      showNamePicker();
      if (nameIn) nameIn.value = "";
      return;
    }

    // ✅ 只有这里才提示“你没跟上”并踹去钓鱼
    if (!hasMap(n)) {
      kickToFishing(n);
      return;
    }

    // 正常进入路线
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
      window.location.href = MAIN_URL;
    });
  }

if (picker) picker.inert = true;

  /* ====== 初始化 ====== */
if (picker) picker.inert = true;

  hardResetBoardOnly();
  unlockGate();
  setHint("先输入名字并进入路线。");


/*  window.TEST = {
  end0: () => {
    caughtCount = 0;
    setActive(END_POS);
    finishIfEnd();
    handleEnd();
  },
  end1: () => {
    caughtCount = 1;
    setActive(END_POS);
    finishIfEnd();
    handleEnd();
  }
};*/

window.TEST = window.TEST || {};
window.TEST.rumor = () => { setActive(SPECIAL_POS); onLand(); };

window.TEST = window.TEST || {};

// 强制进入某个名字（会自动带出 role + map）
window.TEST.as = (name) => {
  const input = document.querySelector("#nameIn");
  const btn = document.querySelector("#startBtn");
  input.value = name;
  btn.click();
  return `entered as ${name}`;
};

// 强制落在动物格并触发一次动物事件（需要你当前棋盘里确实有 data-type="animal" 的格）
window.TEST.animal = () => {
  // 找到当前棋盘任意一个 animal 格
  const cell = document.querySelector('.board:not([hidden]) .cell[data-type="animal"]');
  if (!cell) return "no animal cell in current board";
  const p = Number(cell.dataset.pos || 1);
  // 直接把位置跳过去并触发落点事件
  document.querySelectorAll('.board .cell.is-active').forEach(c=>c.classList.remove("is-active"));
  cell.classList.add("is-active");
  // 这里模仿 setActive 的最关键副作用：更新 posOut（可选）
  const posOut = document.querySelector("#posOut");
  if (posOut) posOut.textContent = String(p);
  // 触发落点逻辑：直接点 Roll 不走动画更简单，但你 onLand 是局部的调不到
  // 所以这里用一个简单方案：模拟一次 roll=0 的“落点”——直接点击 roll 让它执行 onLand
  const rollBtn = document.querySelector("#rollBtn");
  rollBtn.click();
  return `moved to animal pos ${p} + rolled`;
};


})();
