/* helpers */
const $=s=>document.querySelector(s), rnd=(a,b)=>Math.floor(Math.random()*(b-a+1))+a;
const gLabel=g=>({carb:"碳水组",protein:"蛋白质组",seasoning:"调味料组",veg:"蔬菜组",gear:"炊具组"}[g]||"—");

/*DB */
const DB={
  "猫妖JG":{luck:2,direction:4,stamina:6},
  "鱼师傅":{luck:3,direction:6,stamina:5}
};

/* state (refresh => reinit => cleared by default) */
const S={name:"",group:"",stats:{luck:4,direction:4,stamina:4},tokens:0,scene:"camp_intro",hist:[],lastRoll:null};
const reset=()=>Object.assign(S,{name:"",group:"",stats:{luck:4,direction:4,stamina:4},tokens:0,scene:"camp_intro",hist:[],lastRoll:null});

/* dice */
const roll=(stat,tag)=>{
  const d=rnd(1,10), ok=d<=stat;
  console.log(`[ROLL] ${tag} d10=${d} <= ${stat} ? ${ok?"SUCCESS":"FAIL"}`);
  return {d,ok};
};
const hiddenLuck=()=>{
  const {ok}=roll(S.stats.luck,"暗骰幸运(运气)");
  if(ok) S.tokens++;
  console.log(`[TOKENS] 暗骰累计 tokens=${S.tokens}`);
};




/* outcome */
const outcome=()=>S.tokens>=2?"高级":S.tokens===1?"一般":"眉笔";

/* loot (for test) */
const pick2 = arr => {
  const a=[...arr], out=[];
  while(out.length<2 && a.length) out.push(a.splice(rnd(0,a.length-1),1)[0]);
  return out;
};
const GROUPS=["carb","protein","seasoning","veg","gear"];
const groupOk=g=>GROUPS.includes(g);
const tier=()=>S.tokens>=2?"高级":S.tokens===1?"一般":"眉笔"; // 你原 outcome 可以替换成这个

/*const FOOD={
  高级:["鸡蛋","猪五花","牛奶","香肠","午餐肉","培根","黄油","罐头豆","芝士"],
  一般:["鸡蛋","牛奶","面包","香肠","罐头玉米","土豆","洋葱"],
  眉笔:["方便面","饼干","能量棒","矿泉水","小罐头"]
};*/

const getLoot=(group,t)=>{
  const g = groupOk(group)?group:"protein";         // 组别兜底：防 bug
  const table = LOOT[g] || LOOT.protein;
  const pool = table[t] || table["眉笔"];
  return pick2(pool).join("、");
};


const LOOT={
  carb:{
    高级:["面粉","意面","米","土豆","玉米饼","吐司","年糕"],
    一般:["米","面包","土豆","方便米饭","玉米"],
    眉笔:["压缩饼干","能量棒","小面包","饼干"]
  },
  protein:{
    高级:["鸡蛋","猪五花","牛奶","培根","午餐肉","芝士"],
    一般:["鸡蛋","牛奶","香肠","罐头豆","豆腐"],
    眉笔:["肉松面包","鱼罐头","蛋白棒","小罐头"]
  },
  seasoning:{
    高级:["盐","黑胡椒","辣椒粉","孜然","酱油","黄油","咖喱块"],
    一般:["盐","胡椒","酱油","番茄酱","辣椒酱"],
    眉笔:["盐包","糖包","一次性调味包","酱料小袋"]
  },
  veg:{
    高级:["洋葱","胡萝卜","西兰花","青椒","蘑菇","番茄"],
    一般:["土豆","洋葱","胡萝卜","番茄"],
    眉笔:["海带丝","榨菜","泡菜小包","玉米粒"]
  },
  gear:{
    高级:["小锅","点火器","折叠炉","铝箔","便携水壶","多功能刀"],
    一般:["打火机","一次性碗筷","简易锅","锡纸"],
    眉笔:["塑料叉","纸杯","破旧开瓶器","旧抹布"]
  }
};

const resultText=()=>{
  const t=tier();
  const got=getLoot(S.group,t);
console.log(`[RESULT] group=${S.group} tier=${t} tokens=${S.tokens} got=[${got}]`);

  if(t==="高级") return `你终于找到了异常的源头。
在石头下方，垫着一层隔热垫，隔热垫里包着一个防水袋。
防水袋封得很仔细，明显是为了避免被灰烬和湿气影响。
你没有太多时间细看内容，只能迅速确认这是节目组提前藏好的物资。
你把能带走的东西迅速收好。没什么时间了，得赶紧回去。

你获得了：${got}

你没有时间再继续了。
不管收获如何，至少你已经尽力检查过这里。
你带着找到的东西，转身返回露营地。`;

  if(t==="一般") return `你确认了这里确实被节目组动过。
虽然没有完全挖出所有隐藏结构，但你还是在灰烬下找到了一些被刻意保护的物品。
它们被藏得不算深，只是足够不被随意发现。
你挑出还能安全带走的部分，迅速收拾好。
时间不多了，先带这些回去再说。

你获得了：<span class="loot">${got}</span>

你没有时间再继续了。
不管收获如何，至少你已经尽力检查过这里。
你带着找到的东西，转身返回露营地。`;

   if(t==="眉笔") return `你检查了很久。
虽然地面确实比周围干燥，但并没有找到明确的隐藏结构或容器。
如果节目组在这里藏过什么，要么已经被取走，要么你错过了关键位置。

继续耗下去意义不大。
你拍了拍手上的灰，决定先返回露营地。节目组总不至于让你饿肚子的。

你获得了：<span class="loot">${got}</span>

你没有时间再继续了。
不管收获如何，至少你已经尽力检查过这里。
你带着找到的东西，转身返回露营地。`;
};

/* firepit page 1: 明投 + 观察 */
const firepitStart=()=>{
  const {ok}=roll(S.stats.luck,"明投运气(篝火堆开头)");
  S.lastRoll = ok ? "success" : "fail";
  console.log(`[STATE] firepit 明投结果=${S.lastRoll}`);
};
const firepitPage1=()=>{
  const head=`
你走近篝火堆。
木柴已经烧过一轮，灰烬被简单清理，但并不彻底。
石头围成的火圈看起来被重新摆过一次。`;

  const suc=`
你看起来运气不错。
你注意到灰烬的分布有些奇怪。有几块石头下面几乎没有灰，像是被人临时挪开，又匆匆放回原位。这里显然不只是普通的露营痕迹。`;

  const fail=`
你仔细看了看篝火堆。
灰烬和木炭混在一起，看起来已经被风和脚步打乱过好几次。
石头的位置虽然不算整齐，但更像是游客随手调整的结果。
如果这里真的藏了什么，至少第一眼并不明显。`;

  const tip=`
无论如何，你选择继续检查。`;

  return [head,"", (S.lastRoll==="success"?suc:fail), "", tip].join("\n");
};

/* firepit page 2: 深入 + 暗骰提示 */
const firepitDeepText = (mode)=>(
`你蹲下身，小心地检查。灰烬很轻，很快就被拨开。
石头下面的地面比周围要干燥得多，像是被刻意保护过。
这里确实有人提前动过手脚。

你发现了——？`
);

/* scenes */
const SC={
  camp_intro:{
    t:"露营地 · 开场",
    b:`你正身处于山脚的露营地。
（这里放一段描述）

不远处是一栋无人值守的应急旅游中心，
再往里走，是通向密林的旧小路，
另一侧则能听见河水流动的声音。`,
    o:[
      ["A","保守点，留在露营地查找","camp_search"],
      ["B","聪明点，前往旅游中心","center"],
      ["C","大胆点，顺着小路进入密林","forest"],
      ["D","随意点，沿着河流查看情况","river"]
    ]
  },

  camp_search:{
    t:"露营地 · 搜索点",
    b:`你选择留在露营地搜寻。
（这里放你写的三选一：篝火/帐篷/垃圾点）`,
    o:[
      ["A","检查篝火堆","camp_firepit"],
      ["B","检查收起来的帐篷（占位）","camp_tent"],
      ["C","检查垃圾分类点（占位）","camp_trash"]
    ]
  },

  /* Page 1 */
  camp_firepit:{
    t:"露营地 · 篝火堆",
    on:()=>firepitStart(),
    b:()=>firepitPage1(),
    o:[
      ["A","用树枝拨开灰烬，检查石头下方","camp_firepit_deepA"],
      ["B","挪动火圈边缘的石头查看底部","camp_firepit_deepB"]
    ]
  },

  /* Page 2 */
  camp_firepit_deepA:{
    t:"露营地 · 篝火堆（继续）",
    on:()=>hiddenLuck(),
    b:()=>firepitDeepText("A"),
    o:[["→","揭晓结果","camp_result"]]
  },
  camp_firepit_deepB:{
    t:"露营地 · 篝火堆（继续）",
    on:()=>hiddenLuck(),
    b:()=>firepitDeepText("B"),
    o:[["→","揭晓结果","camp_result"]]
  },

  camp_result:{
    t:"露营地 · 结算",
    b:()=>resultText(),
  },

  /* placeholders */
  camp_tent:{t:"露营地 · 帐篷堆（占位）",b:"（之后补）",o:[["↩","返回","camp_search"]]},
  camp_trash:{t:"露营地 · 垃圾点（占位）",b:"（之后补）",o:[["↩","返回","camp_search"]]},
  center:{t:"旅游中心（占位）",b:"（之后补）",o:[["↩","返回开场","camp_intro"]]},
  forest:{t:"密林（占位）",b:"（之后补）",o:[["↩","返回开场","camp_intro"]]},
  river:{t:"河流（占位）",b:"（之后补）",o:[["↩","返回开场","camp_intro"]]}
};

/* render */
function sidebar(){
  $("#who").textContent=S.name||"—";
  $("#grp").textContent=gLabel(S.group);
  $("#luck").textContent=S.stats.luck;
  $("#dir").textContent=S.stats.direction;
  $("#sta").textContent=S.stats.stamina;
}
function render(){
  const sc=SC[S.scene]; if(!sc) return;
  if(sc.on) sc.on();
  $("#t").textContent=sc.t;
$("#b").innerHTML = (typeof sc.b==="function"?sc.b():sc.b)
  .replace(/\n/g,"<br>");
  const box=$("#c"); box.innerHTML="";
  (sc.o||[]).forEach(([k,lab,next])=>{
    const btn=document.createElement("button");
    btn.className="choice";
    btn.innerHTML=`<b>${k}｜${lab}</b>`;
    btn.onclick=()=>go(next);
    box.appendChild(btn);
  });
  sidebar();
}

/* nav */
function go(id){ S.hist.push(S.scene); S.scene=id; render(); }

/* start */
function start(name,group){
  name=(name||"").trim(); if(!group) return alert("先选择组别。");
  S.name=name||"游客"; S.group=group;
  S.stats=DB[name]||{luck:rnd(1,10),direction:rnd(1,10),stamina:rnd(1,10)};
  S.tokens=0; S.scene="camp_intro"; S.hist=[]; S.lastRoll=null;
  console.log(`[START] name=${S.name} group=${S.group}`, S.stats);
  $("#setup").style.display="none";
  $("#stats").style.display="block";
  $("#placeholder").style.display="none";
  $("#flow").style.display="block";
  render();
}

/* wire + hard reset on load */
reset();

const startBtn = $("#start");
if(startBtn) startBtn.onclick = ()=>start($("#name").value,$("#group").value);

const demoBtn = $("#demo");
console.log("start:", startBtn, "demo:", demoBtn);
if(demoBtn) demoBtn.onclick = ()=>start("猫妖JG","protein");
