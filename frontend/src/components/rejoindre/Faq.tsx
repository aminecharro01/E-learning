"use client";

import { useState } from "react";
import { rejoindre } from "./content";
import { Reveal } from "../landing/Reveal";
import { AirplaneIcon } from "../landing/icons/Airplane";

export function RejoindreFaq() {
  const t = rejoindre.faq;
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="rejoindre-section scroll-mt-20" aria-label="Questions fréquentes">
      <div className="rejoindre-container rejoindre-faq-container">
        <Reveal>
          <p className="landing-section-kicker">
            <AirplaneIcon className="landing-kicker-plane" />
            {t.kicker}
          </p>
          <h2 className="landing-h2 max-w-3xl">{t.headline}</h2>
        </Reveal>
        <div className="rejoindre-faq-list mt-8">
          {t.items.map((item, index) => {
            const open = openIndex === index;
            return (
              <div key={item.question} className="rejoindre-faq-item">
                <button
                  type="button"
                  className="rejoindre-faq-question"
                  aria-expanded={open}
                  aria-controls={`faq-panel-${index}`}
                  onClick={() => setOpenIndex(open ? null : index)}
                >
                  {item.question}
                  <span className="rejoindre-faq-icon" aria-hidden="true">
                    {open ? "−" : "+"}
                  </span>
                </button>
                {open && (
                  <p id={`faq-panel-${index}`} className="rejoindre-faq-answer">
                    {item.answer}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
