import { useEffect, useRef, useState } from "react";
import { useStore } from "../state/store";
import { t } from "../i18n";

/** A short first-visit walkthrough of the ideas that are not obvious from
 *  the screen: links, swappable axes, the ⚑ flag, templates and export. */
export function Guide({ open, onClose }: { open: boolean; onClose: () => void }) {
  const lang = useStore((s) => s.lang);
  const T = t(lang);
  const [step, setStep] = useState(0);
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) { setStep(0); d.showModal(); }
    if (!open && d.open) d.close();
  }, [open]);
  const steps = T.guide;
  const last = step === steps.length - 1;
  return (
    <dialog ref={ref} className="guide" onClose={onClose} aria-labelledby="guide-title">
      <div className="guide-step">{step + 1} / {steps.length}</div>
      <h2 id="guide-title">{steps[step][0]}</h2>
      <p>{steps[step][1]}</p>
      <div className="guide-dots" aria-hidden="true">{steps.map((_, i) => <i key={i} className={i === step ? "on" : ""} />)}</div>
      <div className="guide-actions">
        <button type="button" className="btn ghost small" onClick={onClose}>{T.guideSkip}</button>
        <div className="row-gap">
          {step > 0 && <button type="button" className="btn ghost small" onClick={() => setStep(step - 1)}>{T.guideBack}</button>}
          <button type="button" className="btn small" onClick={() => (last ? onClose() : setStep(step + 1))}>{last ? T.guideDone : T.guideNext}</button>
        </div>
      </div>
    </dialog>
  );
}
