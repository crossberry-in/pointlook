/**
 * Quick actions over web pages, implemented WITHOUT touching the native
 * touch pipeline.
 *
 * Why not react-native-gesture-handler? A GestureDetector attached to (or
 * stacked over) the Android WebView ends up intercepting the native touch
 * stream and the page becomes untouchable (scroll/links dead) — verified on
 * the emulator for both the overlay variant and the wrapped variant. Instead
 * we inject a passive, capture-phase observer into the page itself
 * (injectedJavaScript). The WebView keeps 100 % of its native touch
 * behaviour; the observer only REPORTS touch patterns over the
 * ReactNativeWebView.postMessage bridge:
 *
 *   - rest still for ~420 ms, then drag down  -> {"__qa":"arm"}
 *   - drag toward a side while armed          -> {"__qa":"select","zone":...}
 *   - lift the finger while armed             -> {"__qa":"end","zone":...,"dy":...}
 *
 * The zone is a raw suggestion ('back' | 'refresh' | 'forward' | null);
 * validity (canGoBack / canGoForward) is decided on the RN side, so the page
 * script needs no navigation state.
 */
export const QUICK_ACTIONS_JS = `;(function(){
  if (window.__pointlookQA) return;
  window.__pointlookQA = true;
  var ARM = 26, SELECT = 56, LP = 420;
  var st = null;
  function post(type, zone, dy) {
    try {
      var m = { __qa: type };
      if (zone !== undefined) m.zone = zone;
      if (dy !== undefined) m.dy = Math.round(dy);
      window.ReactNativeWebView.postMessage(JSON.stringify(m));
    } catch (e) {}
  }
  function onStart(e) {
    if (e.touches.length !== 1) { st = null; return; }
    var t = e.touches[0];
    st = { x: t.clientX, y: t.clientY, t0: Date.now(), early: false, armed: false, sel: null, dx: 0, dy: 0 };
  }
  function onMove(e) {
    if (!st || e.touches.length !== 1) return;
    var t = e.touches[0];
    st.dx = t.clientX - st.x;
    st.dy = t.clientY - st.y;
    if (!st.early && (Math.abs(st.dx) > 4 || Math.abs(st.dy) > 4) && Date.now() - st.t0 < LP) {
      st.early = true; // ordinary scroll/swipe: never arm
    }
    if (st.early) return;
    if (!st.armed) {
      if (st.dy > ARM && Math.abs(st.dx) < st.dy * 1.4) {
        st.armed = true;
        post('arm');
      }
      return;
    }
    var zone = null;
    if (st.dy >= 8) {
      if (st.dx < -SELECT) zone = 'back';
      else if (st.dx > SELECT) zone = 'forward';
      else zone = 'refresh';
    }
    if (zone !== st.sel) {
      st.sel = zone;
      post('select', zone);
    }
  }
  function onEnd() {
    if (!st) return;
    var s = st;
    st = null;
    if (s.armed) post('end', s.sel, s.dy);
  }
  document.addEventListener('touchstart', onStart, { capture: true, passive: true });
  document.addEventListener('touchmove', onMove, { capture: true, passive: true });
  document.addEventListener('touchend', onEnd, { capture: true, passive: true });
  document.addEventListener('touchcancel', onEnd, { capture: true, passive: true });
})();true;`;

export type QuickAction = 'back' | 'refresh' | 'forward';

/** Raw zone reported by the page script (before RN validates it). */
export type QuickActionZone = QuickAction | null;

interface QaArmMessage {
  __qa: 'arm';
}
interface QaSelectMessage {
  __qa: 'select';
  zone: QuickActionZone;
}
interface QaEndMessage {
  __qa: 'end';
  zone?: QuickActionZone;
  dy?: number;
}
type QaMessage = QaArmMessage | QaSelectMessage | QaEndMessage;

/**
 * Cheap router for WebView onMessage. Returns true when the payload was a
 * quick-actions message (consumed), false for anything else (callers then
 * treat it as a bridge/console message).
 */
export function parseQuickActionMessage(data: string): QaMessage | null {
  if (!data || !data.startsWith('{"__qa"')) return null;
  try {
    const parsed = JSON.parse(data);
    const type = parsed?.__qa;
    if (type === 'arm') return { __qa: 'arm' };
    if (type === 'select') return { __qa: 'select', zone: parsed.zone ?? null };
    if (type === 'end') return { __qa: 'end', zone: parsed.zone ?? null, dy: parsed.dy ?? 0 };
  } catch {
    // malformed payload — treat as consumed to avoid dumping it into the console
  }
  return null;
}
