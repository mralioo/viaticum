import os
import streamlit as st

_BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:8000")

_INJECT = """\
<script>
(function(){{
  var BU="{backend_url}",NAME="{name}",PERS="{personality}",IMS={interval_ms};
  var pd=window.parent.document;
  if(pd.getElementById('viaticum-companion')){{
    var nb=pd.getElementById('viaticum-companion-name');
    if(nb)nb.textContent=NAME.toUpperCase().slice(0,5);
    return;
  }}
  var style=pd.createElement('style');
  style.textContent=[
    '#viaticum-companion{{position:fixed;bottom:24px;left:24px;width:130px;',
    'display:flex;flex-direction:column;align-items:center;z-index:9998;',
    'font-family:-apple-system,sans-serif}}',
    '#vc-sb{{background:white;border:1.5px solid #1a73e8;',
    'border-radius:12px 12px 12px 0;padding:8px 10px;font-size:11px;',
    'line-height:1.4;color:#333;max-width:190px;margin-bottom:8px;',
    'box-shadow:0 2px 8px rgba(0,0,0,.12);opacity:0;transition:opacity .3s;',
    'pointer-events:none;min-height:30px;word-wrap:break-word}}',
    '#vc-sb.v{{opacity:1;pointer-events:auto}}',
    '#vc-svg{{animation:vc-float 2s ease-in-out infinite;cursor:pointer}}',
    '@keyframes vc-float{{0%,100%{{transform:translateY(0)}}50%{{transform:translateY(-4px)}}}}',
    '@keyframes vc-bounce{{0%,100%{{transform:translateY(0)}}20%{{transform:translateY(-14px)}}',
    '40%{{transform:translateY(-8px)}}60%{{transform:translateY(-12px)}}80%{{transform:translateY(-4px)}}}}',
    '@keyframes vc-tilt{{0%,100%{{transform:rotate(0deg)}}50%{{transform:rotate(8deg)}}}}',
    '@keyframes vc-droop{{0%,100%{{transform:translateY(0)}}50%{{transform:translateY(3px)}}}}',
    '#vc-svg.happy{{animation:vc-bounce .6s ease-in-out 3,vc-float 2s ease-in-out infinite 1.8s}}',
    '#vc-svg.thinking{{animation:vc-tilt 1.2s ease-in-out infinite}}',
    '#vc-svg.sad{{animation:vc-droop 3s ease-in-out infinite}}',
    '#vc-cs{{display:flex;gap:4px;margin-top:6px;width:100%}}',
    '#vc-ci{{flex:1;border:1px solid #ccc;border-radius:12px;padding:4px 8px;',
    'font-size:11px;outline:none;min-width:0}}',
    '#vc-ci:focus{{border-color:#1a73e8}}',
    '#vc-send{{background:#1a73e8;border:none;border-radius:50%;width:26px;height:26px;',
    'color:white;font-size:11px;cursor:pointer;flex-shrink:0;line-height:26px}}'
  ].join('');
  pd.head.appendChild(style);
  var div=pd.createElement('div');
  div.id='viaticum-companion';
  div.innerHTML='<div id="vc-sb"></div>'
    +'<svg id="vc-svg" viewBox="0 0 60 88" width="90" height="132"'
    +' xmlns="http://www.w3.org/2000/svg">'
    +'<ellipse cx="30" cy="10" rx="13" ry="7" fill="#4a3728"/>'
    +'<circle cx="30" cy="22" r="14" fill="#FDBCB4"/>'
    +'<circle cx="24" cy="20" r="2.5" fill="#333"/>'
    +'<circle cx="36" cy="20" r="2.5" fill="#333"/>'
    +'<circle cx="24.8" cy="19.2" r=".8" fill="white"/>'
    +'<circle cx="36.8" cy="19.2" r=".8" fill="white"/>'
    +'<path id="vc-mi" d="M25 27 Q30 31 35 27" stroke="#a0522d"'
    +' stroke-width="1.5" fill="none" stroke-linecap="round"/>'
    +'<path id="vc-ms" d="M25 29 Q30 25 35 29" stroke="#a0522d"'
    +' stroke-width="1.5" fill="none" stroke-linecap="round" opacity="0"/>'
    +'<rect x="10" y="36" width="40" height="48" rx="5" fill="white"'
    +' stroke="#e0e0e0" stroke-width="1.2"/>'
    +'<polygon points="30,36 18,52 28,44" fill="#f0f0f0"/>'
    +'<polygon points="30,36 42,52 32,44" fill="#f0f0f0"/>'
    +'<rect x="27" y="36" width="6" height="16" fill="#e8f0fe"/>'
    +'<path d="M20 44 Q15 56 20 62 Q25 68 30 62" stroke="#666"'
    +' stroke-width="2" fill="none" stroke-linecap="round"/>'
    +'<circle cx="30" cy="62" r="3.5" fill="#888" stroke="#666" stroke-width=".8"/>'
    +'<rect x="33" y="50" width="16" height="10" rx="2" fill="#1a73e8"/>'
    +'<text id="viaticum-companion-name" x="41" y="57" font-size="4.5"'
    +' fill="white" text-anchor="middle" font-family="-apple-system,sans-serif">HAKIM</text>'
    +'<text id="vc-tm" x="46" y="12" font-size="12" fill="#1a73e8"'
    +' opacity="0" font-weight="bold">?</text>'
    +'</svg>'
    +'<div id="vc-cs">'
    +'<input id="vc-ci" type="text" placeholder="Wie geht es dir?"/>'
    +'<button id="vc-send">&#x27A4;</button>'
    +'</div>';
  pd.body.appendChild(div);
  var svg2=pd.getElementById('vc-svg'),sb2=pd.getElementById('vc-sb'),
      nb2=pd.getElementById('viaticum-companion-name'),
      tm2=pd.getElementById('vc-tm'),
      mi2=pd.getElementById('vc-mi'),ms2=pd.getElementById('vc-ms'),
      ci2=pd.getElementById('vc-ci'),csend2=pd.getElementById('vc-send');
  nb2.textContent=NAME.toUpperCase().slice(0,5);
  function ss(s){{
    svg2.className='';
    tm2.setAttribute('opacity','0');
    mi2.setAttribute('opacity','1');
    ms2.setAttribute('opacity','0');
    if(s==='happy'){{ svg2.className='happy'; }}
    else if(s==='thinking'){{ svg2.className='thinking'; tm2.setAttribute('opacity','1'); }}
    else if(s==='sad'){{
      svg2.className='sad';
      mi2.setAttribute('opacity','0');
      ms2.setAttribute('opacity','1');
    }}
  }}
  function show(t,d){{
    sb2.textContent=t;
    sb2.classList.add('v');
    if(d>0) setTimeout(function(){{ sb2.classList.remove('v'); }},d);
  }}
  async function chat(msg){{
    ss('thinking'); show('...',0);
    try{{
      var r=await fetch(BU+'/chat',{{
        method:'POST',
        headers:{{'Content-Type':'application/json'}},
        body:JSON.stringify({{
          message:msg,mode:'companion',
          companion_name:NAME,companion_personality:PERS
        }})
      }});
      var d2=await r.json();
      var ans=d2.answer||d2.message||'Alles wird gut! 😊';
      ss('happy'); show(ans,5000);
      setTimeout(function(){{ ss(''); }},6000);
    }}catch(e){{
      ss(''); show('Ich bin gleich wieder da! 😊',3000);
    }}
  }}
  csend2.addEventListener('click',function(){{
    var m=ci2.value.trim(); if(!m) return; ci2.value=''; chat(m);
  }});
  ci2.addEventListener('keydown',function(e){{
    if(e.key==='Enter') csend2.click();
  }});
  var PH=[
    'Du machst das gro\xDFartig, Dr. Weber! 💪',
    'Denk daran, kurz Pause zu machen. ☕',
    'Du hast heute schon viel erreicht! ⭐',
    'Wie geht es dir gerade? Ich bin hier!',
    'Du bist ein Held f\xFCr deine Patienten! 🩺',
    'Kurze Atem\xFCbung: tief einatmen... gut! 😌',
    'Deine Patienten sind in guten H\xE4nden!',
    'Vergiss nicht zu trinken. Hydration ist wichtig! 💧',
    'Du machst das wirklich super heute!',
    'Ich bin stolz auf dich, Dr. Weber! 🌟'
  ];
  var pi=0;
  if(IMS>0) setTimeout(function tick(){{
    show(PH[pi%PH.length],6000); ss('happy');
    setTimeout(function(){{ ss(''); }},7000);
    pi++; setTimeout(tick,IMS);
  }},IMS);
  setTimeout(function(){{
    show('Hallo! Ich bin '+NAME+'. Wie kann ich helfen? 😊',5000);
    ss('happy');
    setTimeout(function(){{ ss(''); }},6000);
  }},1200);
}})();
</script>"""

_INTERVAL_MAP = {"never": 0, "30min": 30 * 60 * 1000, "60min": 60 * 60 * 1000}


def render_companion():
    name = st.session_state.get("companion_name", "Hakim")
    personality = st.session_state.get("companion_personality", "Fürsorglich & warmherzig")
    interval = st.session_state.get("companion_checkin_interval", "30min")
    interval_ms = _INTERVAL_MAP.get(interval, 0)

    html = _INJECT.format(
        backend_url=_BACKEND_URL,
        name=name.replace('"', '\\"'),
        personality=personality.replace('"', '\\"'),
        interval_ms=interval_ms,
    )
    st.components.v1.html(html, height=0, scrolling=False)
