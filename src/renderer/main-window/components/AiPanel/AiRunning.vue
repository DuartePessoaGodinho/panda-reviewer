<template>
  <div class="ai-panel">
    <div class="ai-running-header">
      <div class="ai-status-dot running"></div>
      <span style="color:var(--text2);font-size:14px;">{{ providerLabel }} review in progress</span>
      <button class="ai-cancel-btn" style="margin-left:auto" @click="$emit('cancel')">■ Stop</button>
    </div>

    <div class="ai-running-stage">
      <div class="ai-study-scene" aria-hidden="true">
        <div class="study-shadow"></div>
        <div class="study-desk">
          <div class="desk-top"></div>
          <div class="book-stack left"><span></span><span></span><span></span></div>
          <div class="book-stack right"><span></span><span></span></div>
          <div class="open-book">
            <div class="book-page left-page"><i></i><i></i><i></i></div>
            <div class="book-page right-page"><i></i><i></i><i></i></div>
            <div class="book-spine"></div>
          </div>
          <div class="floating-page page-one"><i></i><i></i><i></i></div>
          <div class="floating-page page-two"><i></i><i></i></div>
          <div class="panda-figure">
            <div class="panda-ear left"></div>
            <div class="panda-ear right"></div>
            <div class="panda-head">
              <div class="panda-patch left"><b></b></div>
              <div class="panda-patch right"><b></b></div>
              <div class="panda-nose"></div>
              <div class="panda-mouth"></div>
            </div>
            <div class="panda-body">
              <div class="panda-arm left"></div>
              <div class="panda-arm right"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="ai-running-copy">
        <h2>Panda is studying this merge request</h2>
        <p>{{ providerLabel }} is reading the branch locally. The final review will appear here when the analysis is complete.</p>
        <div class="ai-review-steps">
          <span>Opening the diff</span>
          <span>Checking risky paths</span>
          <span>Reading changed files</span>
          <span>Looking for edge cases</span>
        </div>
        <div class="ai-progress-rail"><span></span></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ providerLabel: string }>();
defineEmits<{ cancel: [] }>();
</script>

<style scoped>
.ai-panel { flex: 1; overflow: hidden; display: flex; flex-direction: column; min-height: 0; }

.ai-running-header {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 16px; border-bottom: 1px solid var(--border); flex-shrink: 0;
}
.ai-status-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.ai-status-dot.running { background: var(--accent); animation: pulse 0.8s ease-in-out infinite; }
.ai-cancel-btn {
  padding: 3px 10px; border: 1px solid var(--border2);
  background: transparent; color: var(--text2); border-radius: 5px;
  font-size: 12px; cursor: pointer; transition: background 0.1s;
}
.ai-cancel-btn:hover { background: var(--surface2); color: var(--text); }

.ai-running-stage {
  flex: 1; min-height: 0; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 18px;
  padding: 24px 18px 28px; overflow: hidden; position: relative;
  background:
    radial-gradient(circle at 50% 38%, rgba(245,158,11,0.10), transparent 30%),
    linear-gradient(180deg, rgba(17,24,39,0.10), rgba(3,7,18,0.20));
}
.ai-running-stage::before {
  content: ""; position: absolute; inset: 0; pointer-events: none;
  background-image:
    linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
  background-size: 28px 28px;
  mask-image: radial-gradient(circle at center, #000, transparent 72%);
}

/* Desk scene */
.ai-study-scene {
  position: relative; width: min(320px, 82vw); aspect-ratio: 1.32;
  perspective: 760px; z-index: 1;
}
.study-shadow {
  position: absolute; left: 13%; right: 13%; bottom: 5%; height: 26px;
  border-radius: 999px;
  background: radial-gradient(ellipse, rgba(0,0,0,0.36), transparent 68%);
  filter: blur(7px); animation: studyShadow 3.4s ease-in-out infinite;
}
.study-desk {
  position: absolute; inset: 0; transform-style: preserve-3d;
  animation: sceneFloat 3.4s ease-in-out infinite;
}
.desk-top {
  position: absolute; left: 8%; right: 8%; bottom: 14%; height: 22%;
  border-radius: 14px 14px 22px 22px;
  background: linear-gradient(180deg, #9a5b2d, #5b321e);
  border: 1px solid rgba(255,255,255,0.14);
  box-shadow: inset 0 10px 0 rgba(255,255,255,0.10), 0 18px 36px rgba(0,0,0,0.28);
  transform: rotateX(58deg) translateZ(-18px);
}
.panda-figure {
  position: absolute; left: 50%; top: 8%; width: 44%; height: 60%;
  transform: translateX(-50%) rotateX(-5deg) rotateY(-8deg);
  transform-style: preserve-3d; animation: pandaRead 2.2s ease-in-out infinite; z-index: 4;
}
.panda-head {
  position: absolute; left: 14%; top: 0; width: 72%; height: 58%;
  border-radius: 48% 48% 45% 45%;
  background: linear-gradient(145deg, #fffaf0, #e8edf4);
  box-shadow: inset -14px -12px 22px rgba(15,23,42,0.13), 0 12px 24px rgba(0,0,0,0.20);
  transform: translateZ(34px); z-index: 3;
}
.panda-ear {
  position: absolute; top: 0; width: 25%; aspect-ratio: 1; border-radius: 50%;
  background: linear-gradient(145deg, #171923, #05070d);
  box-shadow: inset -5px -5px 10px rgba(255,255,255,0.08); z-index: 2;
}
.panda-ear.left { left: 7%; } .panda-ear.right { right: 7%; }
.panda-patch {
  position: absolute; top: 35%; width: 28%; height: 29%;
  border-radius: 48%; background: #10131c; transform: rotate(-16deg);
}
.panda-patch.right { right: 16%; transform: rotate(16deg); }
.panda-patch.left  { left: 16%; }
.panda-patch b {
  position: absolute; left: 44%; top: 42%; width: 18%; aspect-ratio: 1;
  border-radius: 50%; background: #f8fafc; box-shadow: 0 0 0 2px #05070d;
  animation: blinkEye 4.8s ease-in-out infinite;
}
.panda-nose {
  position: absolute; left: 44%; top: 58%; width: 12%; height: 9%;
  border-radius: 55% 55% 60% 60%; background: #11131a;
}
.panda-mouth {
  position: absolute; left: 48%; top: 68%; width: 12%; height: 9%;
  border-bottom: 2px solid #2b2f3a; border-radius: 0 0 999px 999px; transform: translateX(-50%);
}
.panda-body {
  position: absolute; left: 18%; top: 45%; width: 64%; height: 48%;
  border-radius: 42% 42% 28% 28%;
  background: linear-gradient(150deg, #f7f1e8 0 56%, #1b1d27 57% 100%);
  box-shadow: inset -10px -8px 18px rgba(0,0,0,0.16);
  transform: translateZ(8px); z-index: 1;
}
.panda-arm {
  position: absolute; top: 36%; width: 28%; height: 42%;
  border-radius: 999px; background: #11131a; z-index: 5;
}
.panda-arm.left  { left: -14%;  transform: rotate(25deg);  animation: leftPaw  2.2s ease-in-out infinite; }
.panda-arm.right { right: -14%; transform: rotate(-25deg); animation: rightPaw 2.2s ease-in-out infinite; }

.open-book {
  position: absolute; left: 25%; right: 25%; bottom: 20%; height: 26%;
  transform-style: preserve-3d; transform: rotateX(64deg) translateZ(28px); z-index: 5;
}
.book-page {
  position: absolute; top: 0; width: 50%; height: 100%;
  background: linear-gradient(135deg, #fff7df, #e7d8b3);
  border: 1px solid rgba(81,52,25,0.24);
  box-shadow: inset 0 5px 12px rgba(255,255,255,0.45), 0 8px 12px rgba(0,0,0,0.18);
}
.left-page  { left: 0;  border-radius: 10px 3px 5px 14px;  transform-origin: right center; transform: rotateY(18deg); }
.right-page { right: 0; border-radius: 3px 10px 14px 5px; transform-origin: left center; transform: rotateY(-18deg); animation: pageTurn 2.7s ease-in-out infinite; }
.book-page i, .floating-page i {
  display: block; height: 2px; margin: 9px 12px 0; border-radius: 99px; background: rgba(92,64,38,0.30);
}
.book-spine {
  position: absolute; left: 48%; top: 0; width: 4%; height: 103%;
  border-radius: 999px; background: rgba(79,45,25,0.34); z-index: 2;
}
.book-stack {
  position: absolute; bottom: 25%; width: 22%; height: 22%;
  transform: rotateX(60deg) translateZ(20px); z-index: 3;
}
.book-stack.left  { left: 9%;  transform: rotateX(60deg) rotateZ(-5deg) translateZ(20px); }
.book-stack.right { right: 8%; transform: rotateX(60deg) rotateZ(6deg)  translateZ(20px); }
.book-stack span {
  position: absolute; left: 0; width: 100%; height: 25%;
  border-radius: 5px; box-shadow: inset 0 4px 0 rgba(255,255,255,0.20);
}
.book-stack span:nth-child(1) { bottom: 0;   background: #2f7d6d; }
.book-stack span:nth-child(2) { bottom: 24%; background: #bc6c25; width: 88%; left: 7%; }
.book-stack span:nth-child(3) { bottom: 48%; background: #6d5bd0; width: 94%; left: 2%; }

.floating-page {
  position: absolute; width: 18%; height: 22%;
  border-radius: 8px 5px 10px 5px;
  background: linear-gradient(145deg, rgba(255,248,221,0.95), rgba(226,213,181,0.92));
  border: 1px solid rgba(255,255,255,0.25);
  box-shadow: 0 14px 28px rgba(0,0,0,0.20); z-index: 2;
}
.page-one { left: 6%;  top: 16%; animation: pageFloatOne 4.2s ease-in-out infinite; }
.page-two { right: 7%; top: 20%; animation: pageFloatTwo 4.6s ease-in-out infinite; }

/* Text block */
.ai-running-copy { width: min(440px, 100%); text-align: center; z-index: 1; }
.ai-running-copy h2 { margin: 0 0 8px; font-size: 20px; line-height: 1.25; color: var(--text); }
.ai-running-copy p  { margin: 0 auto 14px; max-width: 390px; font-size: 13px; line-height: 1.55; color: var(--text3); }

.ai-review-steps {
  position: relative; height: 22px; color: #fbbf24;
  font-size: 12px; font-weight: 700; overflow: hidden;
}
.ai-review-steps span {
  position: absolute; inset: 0; opacity: 0; transform: translateY(10px);
  animation: reviewStep 8s ease-in-out infinite;
}
.ai-review-steps span:nth-child(2) { animation-delay: 2s; }
.ai-review-steps span:nth-child(3) { animation-delay: 4s; }
.ai-review-steps span:nth-child(4) { animation-delay: 6s; }

.ai-progress-rail {
  width: min(280px, 76%); height: 4px; margin: 10px auto 0;
  overflow: hidden; border-radius: 999px; background: rgba(255,255,255,0.08);
}
.ai-progress-rail span {
  display: block; width: 42%; height: 100%; border-radius: inherit;
  background: linear-gradient(90deg, transparent, #f59e0b, #22c55e, transparent);
  animation: progressSweep 1.6s ease-in-out infinite;
}

/* Keyframes */
@keyframes sceneFloat    { 0%,100% { transform: translateY(0) rotateX(0deg); } 50% { transform: translateY(-7px) rotateX(1.5deg); } }
@keyframes studyShadow   { 0%,100% { opacity: 0.72; transform: scaleX(0.94); } 50% { opacity: 0.48; transform: scaleX(1.04); } }
@keyframes pandaRead     { 0%,100% { transform: translateX(-50%) rotateX(-5deg) rotateY(-8deg) rotateZ(-1deg); } 50% { transform: translateX(-50%) rotateX(-3deg) rotateY(8deg) rotateZ(1deg); } }
@keyframes leftPaw       { 0%,100% { transform: rotate(25deg) translateY(0); }  50% { transform: rotate(17deg) translateY(6px); } }
@keyframes rightPaw      { 0%,100% { transform: rotate(-25deg) translateY(0); } 50% { transform: rotate(-17deg) translateY(6px); } }
@keyframes pageTurn      { 0%,60%,100% { transform: rotateY(-18deg); } 78% { transform: rotateY(-52deg) translateZ(5px); } }
@keyframes pageFloatOne  { 0%,100% { transform: translate3d(0,0,20px) rotateZ(-12deg) rotateY(-16deg); opacity: 0.72; } 50% { transform: translate3d(10px,-20px,42px) rotateZ(7deg) rotateY(18deg); opacity: 1; } }
@keyframes pageFloatTwo  { 0%,100% { transform: translate3d(0,0,18px) rotateZ(11deg) rotateY(18deg); opacity: 0.72; } 50% { transform: translate3d(-12px,-18px,38px) rotateZ(-8deg) rotateY(-14deg); opacity: 1; } }
@keyframes blinkEye      { 0%,92%,100% { transform: scaleY(1); } 95% { transform: scaleY(0.12); } }
@keyframes reviewStep    { 0%,18% { opacity: 0; transform: translateY(10px); } 24%,43% { opacity: 1; transform: translateY(0); } 49%,100% { opacity: 0; transform: translateY(-10px); } }
@keyframes progressSweep { 0% { transform: translateX(-120%); } 100% { transform: translateX(260%); } }
</style>
