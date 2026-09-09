/* ================= 误报反馈 ================= */
function openFP(){
  var sel = $('#fp_word');
  sel.innerHTML = '';
  var o0 = document.createElement('option');
  o0.value = ''; o0.textContent = '（不涉及具体词 / 我要补充新词）';
  sel.appendChild(o0);
  if(lastScan){
    [['🔴 红线', lastScan.hits.red], ['🟡 风险', lastScan.hits.yellow], ['🔵 平台', lastScan.hits.blue]]
    .forEach(function(g){
      g[1].forEach(function(r){
        var o = document.createElement('option');
        o.value = r.t; o.textContent = g[0] + '　' + r.t;
        sel.appendChild(o);
      });
    });
  }
  var cnt = $('#fpCount'); if(cnt) cnt.textContent = WORD_RULES.length;
  $('#maskFP').classList.add('is-on');
}

function buildFPText(){
  var type = $('#fp_type').value || '';
  var word = $('#fp_word').value || '';
  var nw   = ($('#fp_new').value || '').trim();
  var note = ($('#fp_note').value || '').trim();

  var lv = '', lvName = '（本次未命中）', why = '';
  if(lastScan && word){
    var all = lastScan.hits.red.concat(lastScan.hits.yellow, lastScan.hits.blue);
    for(var i=0;i<all.length;i++){
      if(all[i].t === word){ lv = all[i].lv; why = all[i].why || ''; break; }
    }
    lvName = {red:'🔴 红线', yellow:'🟡 风险', blue:'🔵 平台敏感'}[lv] || lvName;
  }

  var src = lastScan ? lastScan.txt : '';
  var snippet = src;
  if(word && src.indexOf(word) > -1){
    var pos = src.indexOf(word);
    var a = Math.max(0, pos - 40), b = Math.min(src.length, pos + 40);
    snippet = (a > 0 ? '…' : '') + src.slice(a, b) + (b < src.length ? '…' : '');
  } else if(src.length > 140){
    snippet = src.slice(0, 140) + '…';
  }

  var s = '【Y.Mine 词库反馈】\n\n';
  s += '类型：' + type + '\n';
  s += '体检平台：' + (lastScan ? lastScan.pfName : '未指定') + '\n';
  if(word) s += '涉及词：' + word + '　当前判定：' + lvName + '\n';
  if(why)  s += '工具给出的理由：' + why + '\n';
  if(nw)   s += '补充词：' + nw + '\n';
  if(lastScan) s += '本次评分：' + lastScan.score.total + ' 分（' + lastScan.score.grade + ' 级）\n';
  s += '\n我的原文：\n' + (snippet || '（无）') + '\n';
  s += '\n我的说明：\n' + (note || '（请补充）') + '\n';
  s += '\n---\n如需回复，可留联系方式：\n';
  return s;
}
