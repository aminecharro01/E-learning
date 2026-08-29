"use client";

import { useState } from "react";
import { rejoindre } from "./content";
import { RejoindreReveal } from "./RejoindreReveal";
import { AirplaneIcon } from "../landing/icons/Airplane";

export function RejoindreFaq() {
  const t = rejoindre.faq;
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="rejoindre-section scroll-mt-20" aria-label="Questions fréquentes">
      <div className="rejoindre-container rejoindre-faq-container">
        <RejoindreReveal>
          <p className="landing-section-kicker">
            <AirplaneIcon className="landing-kicker-plane" />
            {t.kicker}
          </p>
          <h2 className="landing-h2 max-w-3xl">{t.headline}</h2>
        </RejoindreReveal>
        <div className="rejoindre-faq-list mt-8">
          {t.items.map((item, index) => {
            const open = openIndex === index;
            return (
              <div key={item.question} className={`rejoindre-faq-item${open ? " is-open" : ""}`}>
                <button
                  type="button"
                  className="rejoindre-faq-question"
                  aria-expanded={open}
                  aria-controls={`faq-panel-${index}`}
                  onClick={() => setOpenIndex(open ? null : index)}
                >
                  {item.question}
                  <span className="rejoindre-faq-icon" aria-hidden="true">
                    +
                  </span>
                </button>
                <div className="rejoindre-faq-answer-row">
                  <div className="rejoindre-faq-answer-inner">
                    <p id={`faq-panel-${index}`} className="rejoindre-faq-answer">
                      {item.answer}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
