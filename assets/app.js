(() => {
  "use strict";
  const tools = Array.isArray(window.OUTSHARK_TOOLS) ? window.OUTSHARK_TOOLS : [];
  const search = document.getElementById("tool-search");
  const results = document.getElementById("search-results");
  const clear = document.getElementById("clear-search");
  const count = document.getElementById("tool-count");
  const normalize = value => String(value || "").toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, " ").trim();
  const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, char =>
    ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  const distance = (a,b) => {
    if (Math.abs(a.length-b.length)>2) return 3;
    let previous = Array.from({length:b.length+1},(_,i)=>i);
    for (let i=1;i<=a.length;i++) {
      const current=[i];
      for (let j=1;j<=b.length;j++) current[j]=Math.min(
        current[j-1]+1, previous[j]+1,
        previous[j-1]+(a[i-1]===b[j-1]?0:1));
      previous=current;
    }
    return previous[b.length];
  };
  const score = (tool, query) => {
    const q=normalize(query), name=normalize(tool.name);
    const vocabulary=normalize([tool.name,tool.description,...(tool.keywords||[])].join(" ")).split(/\s+/);
    if (!q) return 0;
    if (name===q) return 100;
    if (name.startsWith(q)) return 85;
    if (name.includes(q)) return 75;
    const terms=q.split(/\s+/).filter(Boolean);
    const hits=terms.filter(term => vocabulary.some(word =>
      word.includes(term) || (term.length>=4 && distance(term,word)<=(term.length>=7?2:1))));
    return hits.length ? Math.round(55*hits.length/terms.length) : 0;
  };
  const available = tool => tool.status === "working";
  const card = tool => '<article class="tool-card"><div class="tool-card-top"><span class="tool-icon" aria-hidden="true">' +
    escapeHTML(tool.icon) + '</span><span class="status ' + (available(tool)?"working":"planned") + '">' +
    (available(tool)?"Available":"Coming soon") + '</span></div><h3>' + escapeHTML(tool.name) +
    '</h3><p>' + escapeHTML(tool.description) + '</p><a href="' + escapeHTML(tool.href) + '">' +
    (available(tool)?"Open tool":"Request this tool") + ' <span aria-hidden="true">→</span></a></article>';
  document.querySelectorAll(".tool-grid").forEach(grid => {
    grid.innerHTML=tools.filter(tool=>tool.category===grid.dataset.category).map(card).join("");
    if (!grid.children.length) grid.innerHTML='<p class="empty-category">New tools are on the way.</p>';
  });
  if (count) count.textContent=String(tools.length);
  function renderSearch() {
    if (!search || !results) return;
    const query=search.value.trim();
    if (clear) clear.hidden=!query;
    if (!query) {results.hidden=true;results.innerHTML="";return;}
    const matches=tools.map(tool=>({tool,rank:score(tool,query)}))
      .filter(item=>item.rank>0).sort((a,b)=>b.rank-a.rank).slice(0,8);
    results.hidden=false;
    results.innerHTML=matches.length
      ? '<div class="results-heading">Best matches · ' + matches.length + '</div>' +
        matches.map(({tool})=>'<a class="result-row" href="' + escapeHTML(tool.href) +
          '"><span class="result-icon" aria-hidden="true">' + escapeHTML(tool.icon) +
          '</span><span><strong>' + escapeHTML(tool.name) + '</strong><small>' +
          escapeHTML(tool.description) + '</small></span><span class="result-status" style="' +
          (available(tool)?"":"color:#98751d") + '">' +
          (available(tool)?"Available":"Coming soon") + '</span></a>').join("")
      : '<div class="no-results"><strong>No matching tool yet.</strong><span>Try another phrase or suggest this tool to Outshark.</span><a href="request-tool.html">Request a tool →</a></div>';
  }
  if (search) {
    search.addEventListener("input",renderSearch);
    search.addEventListener("keydown",event=>{
      if(event.key==="Escape"){search.value="";renderSearch();}
      if(event.key==="Enter"){
        const first=results && results.querySelector("a.result-row");
        if(first) window.location.href=first.href;
      }
    });
  }
  if(clear) clear.addEventListener("click",()=>{search.value="";renderSearch();search.focus();});
  const year=document.getElementById("year");
  if(year) year.textContent=String(new Date().getFullYear());
})();