/* 下垂bar */
const $=s=>document.querySelector(s), rnd=(a,b)=>Math.floor(Math.random()*(b-a+1))+a;
const gLabel=g=>({carb:"碳水组",protein:"蛋白质组",seasoning:"调味料组",veg:"蔬菜组"}[g]||"—");


/*DB */
const DB = {

  "橙知": { luck: 1, direction: 7, stamina: 9 },
  "丹": { luck: 4, direction: 4, stamina: 4 },
  "Eric": { luck: 4, direction: 4, stamina: 4 },
  "Ethan": { luck: 4, direction: 4, stamina: 4 },
  "阿基米德": { luck: 4, direction: 4, stamina: 4 },
  "Friedrich": { luck: 4, direction: 4, stamina: 4 },
  "Honey": { luck: 4, direction: 4, stamina: 4 },
  "J.O.": { luck: 4, direction: 4, stamina: 4 },
  "Kazares": { luck: 4, direction: 5, stamina: 9 },
  "奥利弗": { luck: 10, direction: 3, stamina: 8 },
  "Matt": { luck: 4, direction: 4, stamina: 4 },
  "Mubiru": { luck: 4, direction: 4, stamina: 4 },
  "Samuel": { luck: 100, direction: 100, stamina: 100 },
  "Thomas": { luck: 4, direction: 4, stamina: 4 },
  "卡莱比": { luck: 1, direction: 2, stamina: 3 },
  "叶澄希": { luck: 4, direction: 4, stamina: 4 },

  "Amber": { luck: 4, direction: 4, stamina: 4 },
  "Cela": { luck: 4, direction: 4, stamina: 4 },
  "Jeffrey": { luck: 9, direction: 6, stamina: 6 },
  "玛顿": { luck: 4, direction: 4, stamina: 4 },
  "Maya": { luck: 5, direction: 9, stamina: 8 },
  "马塞拉": { luck: 8, direction: 2, stamina: 5 },
  "Melusine": { luck: 4, direction: 6, stamina: 7 },
  "Naya": { luck: 4, direction: 4, stamina: 4 },
  "Romaine": { luck: 4, direction: 4, stamina: 4 },
  "向木林": { luck: 7, direction: 7, stamina: 8.5 },
  "奈芙": { luck: 10, direction: 10, stamina: 10 },
  "Zurabia": { luck: 4, direction: 4, stamina: 4 },
  "Moira": { luck: 4, direction: 4, stamina: 4 },
  "Erla": { luck: 3, direction: 8, stamina: 7 },
  "Josephine": { luck: 5, direction: 3, stamina: 7 },
  "Oliven": { luck: 5, direction: 6, stamina: 7 }

};


//名字害死我咧
const normalizeName = (str) => {
  return str
    .trim()                         // 前后空格
    .replace(/\s+/g,"")             // 中间空格
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, ch =>
      String.fromCharCode(ch.charCodeAt(0) - 65248)
    )                               // 全角转半角
    .toLowerCase();                 // 小写
};

const DB_NORMALIZED = {};
Object.entries(DB).forEach(([name, stats]) => {
  DB_NORMALIZED[normalizeName(name)] = stats;
});



/* state (refresh => reinit => cleared by default) */
/*我的亲亲全局变量*/
const S={name:"",group:"",stats:{luck:4,direction:4,stamina:4},tokens:0,scene:"camp_intro",hist:[],lastRoll:null};
const reset=()=>Object.assign(S,{
  name:"",group:"",
  stats:{luck:4,direction:4,stamina:4},
  tokens:0,scene:"camp_intro",hist:[],lastRoll:null,
  check:{}
});

/* dice 数值高就成功率大，真写的我满头大汗了*/
const roll=(stat,tag)=>{
  const capped = Math.min(stat, 8);          // >8当8用
  const d=rnd(1,10), ok=d<=capped;
  console.log(`[ROLL] ${tag} d10=${d} <= ${capped} (raw=${stat}) ? ${ok?"SUCCESS":"FAIL"}`);
  return {d,ok};
};

const hiddenLuck=()=>{
  const {ok}=roll(S.stats.luck,"暗骰幸运(运气)");
  if(ok) S.tokens++;
  console.log(`[TOKENS] 暗骰累计 tokens=${S.tokens}`);
};

/*把结果存进 S.check[key]*/
S.check = {}; 

const check = (key, statName, tag) => {
  const { d, ok } = roll(S.stats[statName], tag);
  S.check[key] = { d, ok, stat: statName };
  return ok;
};

/* outcome */
const outcome=()=>S.tokens>=2?"高级":S.tokens===1?"一般":"眉笔";

/* loot (for test) */
const pick2 = arr => {
  const a=[...arr], out=[];
  while(out.length<2 && a.length) out.push(a.splice(rnd(0,a.length-1),1)[0]);
  return out;
};
const GROUPS=["carb","protein","seasoning","veg"];
const groupOk=g=>GROUPS.includes(g);
const tier=()=>S.tokens>=2?"高级":S.tokens===1?"一般":"眉笔"; // 你原 outcome 可以替换成这个

const getLoot=(group,t)=>{
  const g = groupOk(group)?group:"protein";         // 组别兜底：防 bug
  const table = LOOT[g] || LOOT.protein;
  const pool = table[t] || table["眉笔"];
  return pick2(pool).join("、");
};

/*记得倒回来重新检查这个池子*/
const LOOT={
  carb:{
    高级:["面粉","意面","米","土豆","玉米饼","吐司","年糕","甜玉米"],
    一般:["米","干面包","土豆","方便米饭","玉米"],
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
  }

};

/* 明投 + 观察 */
/*通用一次明投：把结果存到 S.check[key]*/
const checkOnce=(key,stat,tag)=>{
  const {d,ok}=roll(S.stats[stat],tag);
  S.check[key]={d,ok,stat};
  return ok;
};

const resultTextFirepit=()=>{
  const t=tier();
  const got=getLoot(S.group,t);
  console.log(`[RESULT] (firepit) group=${S.group} tier=${t} tokens=${S.tokens} got=[${got}]`);

  if(t==="高级") return `你终于找到了异常的源头。
在石头下方，垫着一层隔热垫，隔热垫里包着一个防水袋。
防水袋封得很仔细，明显是为了避免被灰烬和湿气影响。
你没有太多时间细看内容，只能迅速确认这是节目组提前藏好的物资。
你把能带走的东西迅速收好。没什么时间了，得赶紧回去。

你获得了：<span class="loot">${got}</span>

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

const resultTextTent=()=>{
  const t=tier();
  const got=getLoot(S.group,t);
  console.log(`[RESULT] (tent) group=${S.group} tier=${t} tokens=${S.tokens} got=[${got}]`);

  if(t==="高级") return `你终于确认了异常的源头。
在帐篷底部的夹层里，你摸到一层不该出现的硬挺边缘。
你小心拆开折叠处，发现里面塞着一个防水袋，外面还额外包了防潮材料。
这显然是节目组提前放置、并确保不受潮的物资。

你没有太多时间细看内容，只能迅速确认这是可用的补给。
你把能带走的东西迅速收好。没什么时间了，得赶紧回去。

你获得了：<span class="loot">${got}</span>

你没有时间再继续了。
不管收获如何，至少你已经尽力检查过这里。
你带着找到的东西，转身返回露营地。`;

  if(t==="一般") return `你确认了这里确实被节目组动过。
虽然你没能完全拆开所有折叠夹层，但你还是在防潮垫边缘摸到一些被保护起来的小物件。
它们藏得不算深，只是足够不被随意发现。
你挑出还能安全带走的部分，迅速收拾好。
时间不多了，先带这些回去再说。

你获得了：<span class="loot">${got}</span>

你没有时间再继续了。
不管收获如何，至少你已经尽力检查过这里。
你带着找到的东西，转身返回露营地。`;

  if(t==="眉笔") return `你检查了很久。
帐篷的折叠、绑绳和防潮垫看起来确实被重新整理过，
但你没能找到明确的隐藏夹层或容器。
如果节目组在这里藏过什么，要么已经被取走，要么你错过了关键位置。

继续耗下去意义不大。
你拍了拍手上的灰，决定先返回露营地。节目组总不至于让你饿肚子的。

你获得了：<span class="loot">${got}</span>

你没有时间再继续了。
不管收获如何，至少你已经尽力检查过这里。
你带着找到的东西，转身返回露营地。`;
};


const resultTextTrash=()=>{
  const t=tier();
  const got=getLoot(S.group,t);
  console.log(`[RESULT] (trash) group=${S.group} tier=${t} tokens=${S.tokens} got=[${got}]`);

  if(t==="高级") return `你终于确认了异常的源头。
在“可回收”袋子的内层，你摸到一个被塑料膜反复缠绕的防水袋。
防水袋外面还垫了干燥剂，明显是为了避免受潮和异味污染。
这不是垃圾，这是节目组提前藏好的补给点。

你没有太多时间细看内容，只能迅速确认这是可用物资。
你把能带走的东西迅速收好。没什么时间了，得赶紧回去。

你获得了：<span class="loot">${got}</span>

你没有时间再继续了。
不管收获如何，至少你已经尽力检查过这里。
你带着找到的东西，转身返回露营地。`;

  if(t==="一般") return `你确认了这里确实被节目组动过。
你没能把整个袋子翻到底，但在内层夹缝里还是摸到一些被塑料膜保护起来的小物件。
它们藏得不算深，只是足够不被随意发现。
你挑出还能安全带走的部分，迅速收拾好。
时间不多了，先带这些回去再说。

你获得了：<span class="loot">${got}</span>

你没有时间再继续了。
不管收获如何，至少你已经尽力检查过这里。
你带着找到的东西，转身返回露营地。`;

  if(t==="眉笔") return `你检查了很久。
垃圾袋外层确实像被动过，但你没能找到明确的内层防水袋或隐藏夹层。
如果节目组在这里藏过什么，要么已经被取走，要么你错过了关键位置。

继续耗下去意义不大。
你拍了拍手套上的灰，决定先返回露营地。节目组总不至于让你饿肚子的。

你获得了：<span class="loot">${got}</span>

你没有时间再继续了。
不管收获如何，至少你已经尽力检查过这里。
你带着找到的东西，转身返回露营地。`;
};

const firepitApproachText=()=>`你走近篝火堆。
木柴已经烧过一轮，灰烬被简单清理，但并不彻底。
石头围成的火圈看起来被重新摆过一次。
`;

const firepitLookText=()=>{
  const ok = S.check.firepit?.ok; // tf
  const suc=`
你看起来运气不错。
你注意到灰烬的分布有些奇怪。
有几块石头下面几乎没有灰，像是被人临时挪开，又匆匆放回原位。
这里显然不只是普通的露营痕迹。`;

  const fail=`
你仔细看了看篝火堆。
灰烬和木炭混在一起，看起来已经被风和脚步打乱过好几次。
石头的位置虽然不算整齐，但更像是游客随手调整的结果。
如果这里真的藏了什么，至少第一眼并不明显。`;

  return (ok?suc:fail).trim();
};

const firepitContinueText=()=>`
来不及去其他地方了。
无论如何，你选择继续检查。
`;


/* firepit page 2: 深入 + 暗骰提示 */
const firepitDeepText = (mode)=>(
`你蹲下身，小心地检查。灰烬很轻，很快就被拨开。
石头下面的地面比周围要干燥得多，像是被刻意保护过。
这里确实有人提前动过手脚。

你发现了——？`
);



//帐篷堆
const tentApproachText=()=>`你来到帐篷堆旁。
几顶帐篷被整齐地卷起，用绳子简单固定，像是刚被收走不久。
`;

const tentLookText=()=>{
  const ok = S.check.tent?.ok; // tf
  const suc=`
你看起来运气不错。
你注意到其中一顶帐篷的绑绳系法和其他的不太一样。
帐篷底部的防潮垫被重新折叠过，折痕很新。
这不像是外行游客随手收拾的痕迹。
这里显然被人刻意整理过。
`;

  const fail=`
你检查了帐篷堆。

帐篷内部干净而普通，
只有常见的露营用品和残留的泥土痕迹。
虽然看起来有人整理过，但更像是正常的收营行为。
暂时看不出明显异常。
`;

  return (ok?suc:fail).trim();
};

const tentContinueText=()=>`
来不及去其他地方了。
无论如何，你选择继续检查。
`;

/* tent page 2: 深入 + 暗骰提示 */
const tentDeepText = (mode)=>(
`你蹲下身，把帐篷稍微挪开。
布料摩擦着地面，露出下面被压得很实的泥土。
防潮垫下方明显比周围要干燥，像是为了防止受潮而特意处理过。

这里确实有人提前动过手脚。

你发现了——？`
);


//垃圾分类点
const trashApproachText=()=>`你走近垃圾分类点。
几个垃圾袋被扎得很紧，分类牌歪歪斜斜地挂着。
最上面一层看起来像是刚被人翻动过，但又刻意压回原位。
`;

const trashLookText=()=>{
  const ok = S.check.trash?.ok; // tf
  const suc=`
你看起来运气不错。
你注意到其中一个“可回收”袋子的扎口方式很怪：打的是双结，而且结口朝内。
更奇怪的是，袋子外侧几乎没有油渍，却有一小块干净的塑料膜反光，像是额外包过什么。
这不像是普通游客的垃圾处理方式。
`;

  const fail=`
你仔细检查了垃圾分类点。
袋子里大多是正常的食物包装、纸杯和湿纸巾，
还有一些被雨水浸得发软的纸板。
看起来只是普通的露营垃圾堆放处。
如果这里真的藏了什么，至少第一眼并不明显。
`;

  return (ok ? suc : fail).trim();
};

const trashContinueText=()=>`
来不及去其他地方了。
无论如何，你选择继续检查。
`;

/* trash page 2: 深入 + 暗骰提示 */
const trashDeepText = (mode)=>(
`你蹲下身，戴上手套，把袋口慢慢松开一点。
气味并不算重，反而像是有人刻意把“真正的垃圾”放在外层做遮掩。
你把几层包装拨开，指尖碰到一处不该出现的硬挺触感。

这里确实有人提前动过手脚。

你发现了——？`
);




/* scenes */
const SC={
  camp_intro:{
    t:"露营地 · 开场",
    b:`你正身处于山脚的露营地。
这里显然是一处经常被登山者使用的地点，地面被无数来往的旅者踩的很实。 
不远处的篝火堆里还残留着未烧尽的木柴，几顶帐篷被随意收起，像是有人刻意留下的“布景”
——当然啦，节目组怎么可能让嘉宾们风餐露宿呢！哎？不会吗？ 

节目组显然提前进入过这里，但真正有用的东西不可能像陷入热恋的人类一样留在明面上为你张开双臂。
但不管怎么说，你最好尽快找到你需要的东西。

不远处是一栋无人值守的应急旅游中心，
再往里走，是通向密林的旧小路，
另一侧则能听见河水流动的声音。`,
    o:[
      ["A","保守点，留在露营地查找 (运气)","camp_search"],
      ["B","聪明点，前往旅游中心（运气，方向感）","center"],
      ["C","大胆点，顺着小路进入密林（方向感，耐力）","forest"],
      ["D","随意点，沿着河流查看情况（耐力）","river"]
    ]
  },

  camp_search:{
    t:"露营地 · 搜索点",
    b:`你选择留在露营地搜寻。
这里看起来最普通，但也正因为如此，很多人不会仔细检查。
如果节目组真的藏了什么，这里未必是最差的选择吧？

一处已经熄灭的篝火堆位于营地正中，焦黑的石块围成一圈，灰烬尚未完全散尽；
几顶被匆忙收起的帐篷堆在一侧，防水布和支架混在一起，像是被随手丢下；
而稍远一些的树林边缘，则堆着几个半满的垃圾箱，气味并不算好闻。

`,
    o:[
      ["A","检查篝火堆","camp_firepit"],
      ["B","检查收起来的帐篷","camp_tent"],
      ["C","检查垃圾分类点","camp_trash"],
      ["D","还是算了，重新想想吧。","camp_intro"]
    ]
  },

  /*和我的篝火说去吧*/
  /* Page 0：接近（不掷骰） */
  camp_firepit:{
    t:"露营地 · 篝火堆",
    b:()=>firepitApproachText(),
    o:[
      ["A","仔细看看","camp_firepit_look"],
      ["B","算了，不要浪费时间了","camp_search"]
    ]
  },

  /* Page 1：仔细看看（这里才明投） */
  camp_firepit_look:{
    t:"露营地 · 篝火堆（观察）",
    on:()=>checkOnce("firepit","luck","明投运气(篝火堆观察)"),
    b:()=>firepitLookText(),
    o:[
      ["A","用树枝拨开灰烬，检查石头下方","camp_firepit_deepA"],
      ["B","挪动火圈边缘的石头查看底部","camp_firepit_deepB"],
      ["C","算了，不在这里浪费时间了，换个地方吧。","camp_search"]
    ]
  },

    /* Page 2：深入（暗骰） */
  camp_firepit_deepA:{
    t:"露营地 · 篝火堆（继续）",
    on:()=>hiddenLuck(),
    b:()=>firepitDeepText("A"),
    o:[["→","揭晓结果","camp_firepit_result"]]
  },
  camp_firepit_deepB:{
    t:"露营地 · 篝火堆（继续）",
    on:()=>hiddenLuck(),
    b:()=>firepitDeepText("B"),
    o:[["→","揭晓结果","camp_firepit_result"]]
  },

  /* 篝火结算 */
  camp_firepit_result:{
    t:"露营地 · 篝火堆 · 结算",
    b:()=>resultTextFirepit(),
  },



/*和我的帐篷堆说去吧*/
    /* 帐篷堆：Page 0 接近（不掷骰） */
  camp_tent:{
    t:"露营地 · 帐篷堆",
    b:()=>tentApproachText(),
    o:[
      ["A","仔细看看","camp_tent_look"],
      ["B","算了，不要浪费时间了","camp_search"]
    ]
  },

  /* 帐篷堆：Page 1 仔细看看（这里才明投） */
  camp_tent_look:{
    t:"露营地 · 帐篷堆（观察）",
    on:()=>checkOnce("tent","luck","明投运气(帐篷堆观察)"),
    b:()=>tentLookText(),
    o:[
          ["A","解开帐篷绑绳，查看内部和夹层","camp_tent_deepA"],
          ["B","检查帐篷下方的地面和防潮垫","camp_tent_deepB"],
          ["C","算了，不在这里浪费时间了，换个地方吧。","camp_search"]
    ]
  },

  /* 帐篷堆：Page 2 深入（暗骰） */
  camp_tent_deepA:{
    t:"露营地 · 帐篷堆（继续）",
    on:()=>hiddenLuck(),
    b:()=>tentDeepText("A"),
    o:[["→","揭晓结果","camp_tent_result"]]
  },
  camp_tent_deepB:{
    t:"露营地 · 帐篷堆（继续）",
    on:()=>hiddenLuck(),
    b:()=>tentDeepText("B"),
    o:[["→","揭晓结果","camp_tent_result"]]
  },

  /* 帐篷结算 */
  camp_tent_result:{
    t:"露营地 · 帐篷堆 · 结算",
    b:()=>resultTextTent(),
  },


  /*和我的垃圾分类点说去吧*/
  /* 垃圾点：Page 0 接近（不掷骰） */
  camp_trash:{
    t:"露营地 · 垃圾分类点",
    b:()=>trashApproachText(),
    o:[
      ["A","仔细看看","camp_trash_look"],
      ["B","算了，不要浪费时间了","camp_search"]
    ]
  },

  /* 垃圾点：Page 1 仔细看看（这里才明投） */
  camp_trash_look:{
    t:"露营地 · 垃圾分类点（观察）",
    on:()=>checkOnce("trash","luck","明投运气(垃圾分类点观察)"),
    b:()=>trashLookText(),
    o:[
          ["A","掀开外层包装，摸索袋子内层","camp_trash_deepA"],
          ["B","检查扎口和袋底夹层","camp_trash_deepB"],
          ["C","算了，不在这里浪费时间了，换个地方吧。","camp_search"]
        ]
  },


  /* 垃圾点：Page 2 深入（暗骰） */
  camp_trash_deepA:{
    t:"露营地 · 垃圾分类点（继续）",
    on:()=>hiddenLuck(),
    b:()=>trashDeepText("A"),
    o:[["→","揭晓结果","camp_trash_result"]]
  },
  camp_trash_deepB:{
    t:"露营地 · 垃圾分类点（继续）",
    on:()=>hiddenLuck(),
    b:()=>trashDeepText("B"),
    o:[["→","揭晓结果","camp_trash_result"]]
  },

  /* 垃圾点结算 */
  camp_trash_result:{
    t:"露营地 · 垃圾分类点 · 结算",
    b:()=>resultTextTrash(),
  },

  center:{
    t:"旅游中心（占位）",
    b:"（之后补）",
    o:[["↩","返回开场","camp_intro"]]
  },

  forest:{
    t:"密林（占位）",
    b:"（之后补）",
    o:[["↩","返回开场","camp_intro"]]
  },
  
  river:{
    t:"河流（占位）",
    b:"（之后补）",
    o:[["↩","返回开场","camp_intro"]]
  }
};

/* render */
function sidebar(){
  $("#who").textContent=S.name||"—";
  $("#grp").textContent=gLabel(S.group);
  $("#luck").textContent=S.stats.luck;
  $("#dir").textContent=S.stats.direction;
  $("#sta").textContent=S.stats.stamina;
}

/*固定流程*/
function render(){
  const sc = SC[S.scene]; if(!sc) return;
  if(sc.on) sc.on();

  $("#t").textContent = sc.t;
  $("#b").innerHTML = (typeof sc.b==="function" ? sc.b() : sc.b).replace(/\n/g,"<br>");

  const box = $("#c"); box.innerHTML = "";
  const opts = (typeof sc.o==="function") ? sc.o() : (sc.o || []);

  opts.forEach(([k,lab,next])=>{
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

  if(shouldOpenNamePicker(name)){
    showNamePicker();
    return;
  }

  name=(name||"").trim(); if(!group) return alert("先选择组别。");
  S.name=name||"游客"; S.group=group;
  const key = normalizeName(name);
  S.stats = DB_NORMALIZED[key] || {luck:4,direction:4,stamina:4};
  S.tokens=0; S.scene="camp_intro"; S.hist=[]; S.lastRoll=null;
  S.check = {};
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


// ===== 名字自查浮层：按「中文在前，英文A-Z」生成 =====
const isEnglishName = (n) => /^[A-Za-z]/.test(n);

function buildNamePicker(){
  const wrap = document.getElementById("namePicker");
  const zhBox = document.getElementById("nameListZh");
  const enBox = document.getElementById("nameListEn");
  if(!wrap || !zhBox || !enBox) return;

  // 拿 DB 的原始 key（保持你写的显示名）
  const names = Object.keys(DB);

  const zh = names.filter(n => !isEnglishName(n))
    .sort((a,b)=>a.localeCompare(b, "zh-Hans-CN"));

  const en = names.filter(isEnglishName)
    .sort((a,b)=>a.localeCompare(b, "en", { sensitivity:"base" }));

  const makeChip = (name) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip";
    btn.textContent = name;
    btn.onclick = () => {
      const input = document.getElementById("name");
      if(input) input.value = name;
      hideNamePicker();
    };
    return btn;
  };

  zhBox.innerHTML = "";
  enBox.innerHTML = "";
  zh.forEach(n => zhBox.appendChild(makeChip(n)));
  en.forEach(n => enBox.appendChild(makeChip(n)));

  // 关闭逻辑（点遮罩/关闭按钮）
  wrap.querySelectorAll("[data-close='1']").forEach(el=>{
    el.onclick = hideNamePicker;
  });

  // 右下角打开按钮
  const launch = document.getElementById("namePickerLaunch");
  if(launch) launch.onclick = showNamePicker;
}

function showNamePicker(){
  const wrap = document.getElementById("namePicker");
  if(!wrap) return;

  wrap.hidden = false;
  wrap.inert = false;
  wrap.classList.add("show");

  const closeBtn = wrap.querySelector(".close");
  if (closeBtn) closeBtn.focus({ preventScroll: true });
}

function hideNamePicker(){
  const wrap = document.getElementById("namePicker");
  if(!wrap) return;

  // 先移焦点
  if (wrap.contains(document.activeElement)) document.activeElement.blur();

  wrap.classList.remove("show");
  wrap.inert = true;
  wrap.hidden = true;

  const input = document.getElementById("name");
  if (input) input.focus({ preventScroll: true });
}

// ===== 自动弹出条件：name 为空 或 不在 DB =====
function shouldOpenNamePicker(rawName){
  const n = (rawName || "").trim();
  if(!n) return true;

  // 你已经有 normalizeName + DB_NORMALIZED 的话，就用它判断“是否命中”
  if(typeof normalizeName === "function" && typeof DB_NORMALIZED === "object"){
    const key = normalizeName(n);
    return !DB_NORMALIZED[key];
  }

  // 没有 normalizeName 的话，就退化成原始 DB key 判断
  return !DB[n];
}

// 初始化一次
buildNamePicker();
