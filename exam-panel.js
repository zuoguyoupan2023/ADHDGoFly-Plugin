(function(){
  const overlay=document.createElement('div');
  overlay.id='examPanelOverlay';
  overlay.className='exam-panel-overlay';
  overlay.style.display='none';
  overlay.innerHTML='\
    <div class="exam-panel-header">\
      <div class="exam-panel-title">ExamPage</div>\
      <div class="exam-panel-controls">\
        <button id="examPanelMin">-</button>\
        <button id="examPanelClose">X</button>\
      </div>\
    </div>\
    <div class="exam-panel-body">\
      <div class="exam-panel-content">ExamPage!!!</div>\
    </div>';
  document.body.appendChild(overlay);
  const bubble=document.createElement('div');
  bubble.id='examPanelBubble';
  bubble.className='exam-panel-bubble';
  bubble.textContent='E';
  bubble.style.display='none';
  document.body.appendChild(bubble);
  function show(){overlay.style.display='flex';bubble.style.display='none';}
  function hide(){overlay.style.display='none';bubble.style.display='none';}
  function minimize(){overlay.style.display='none';bubble.style.display='flex';}
  function restore(){overlay.style.display='flex';bubble.style.display='none';}
  window.examPanel={show,hide,minimize,restore};
  window.initExamPanel=function(){
    const minBtn=document.getElementById('examPanelMin');
    const closeBtn=document.getElementById('examPanelClose');
    const header=overlay.querySelector('.exam-panel-header');
    let dragging=false;let startX=0;let startY=0;let offsetX=0;let offsetY=0;
    function onMouseDown(e){dragging=true;startX=e.clientX;startY=e.clientY;}
    function onMouseMove(e){if(!dragging)return;offsetX+=e.clientX-startX;offsetY+=e.clientY-startY;startX=e.clientX;startY=e.clientY;overlay.style.transform='translate('+offsetX+'px,'+offsetY+'px)';}
    function onMouseUp(){dragging=false;}
    if(header){header.addEventListener('mousedown',onMouseDown);document.addEventListener('mousemove',onMouseMove);document.addEventListener('mouseup',onMouseUp);}
    bubble.addEventListener('click',restore);
    if(minBtn)minBtn.addEventListener('click',minimize);
    if(closeBtn)closeBtn.addEventListener('click',hide);
  };
})();