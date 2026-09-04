import { KaiDemo } from "@/components/kai-demo";
import Image from "next/image";
import { PageHero } from "@/components/ui";
export const metadata = {
  title: "Meet Kai — Keep Advancing Intentionally",
  description:
    "Meet Kai, your personal BYNV guide for understanding your progress, choosing a next action, and using AI intentionally.",
};
export default function Kai() {
  return (
    <>
      <PageHero
        eyebrow="MEET KAI"
        title="Your guide to becoming your next version."
        copy="KAI stands for Keep Advancing Intentionally. Kai uses the BYNV progress and context you choose to save to help you understand where you are, decide what comes next, and keep moving toward the person you're building."
      />
      <section className="kai-identity container" aria-labelledby="kai-meaning">
        <div className="kai-portrait">
          <Image
            src="/images/kai-approved-face.webp"
            width={250}
            height={250}
            sizes="(max-width: 700px) 72vw, 360px"
            alt="Kai, the BYNV guide"
            priority
          />
        </div>
        <div>
          <p className="eyebrow">KAI</p>
          <h2 id="kai-meaning">Keep Advancing Intentionally.</h2>
          <p>
            Progress is not about changing everything at once. It is about
            understanding where you are, choosing the next meaningful move,
            and continuing with intention. Kai helps you practice that rhythm.
          </p>
        </div>
      </section>

      <section className="kai-value container" aria-labelledby="kai-roles">
        <header className="section-title">
          <p className="eyebrow">One guide. Three roles.</p>
          <h2 id="kai-roles">Turn insight into intentional action.</h2>
        </header>
        <div className="kai-role-grid">
          <article>
            <span>01</span>
            <h3>Understand</h3>
            <p>
              Make sense of your Version Score, Blueprint, the BYNV system,
              and what each page or tool is designed to help you do.
            </p>
          </article>
          <article>
            <span>02</span>
            <h3>Act</h3>
            <p>
              Identify a next step, break down goals, use your Daily OS, stay
              connected to priorities, and review real progress.
            </p>
          </article>
          <article>
            <span>03</span>
            <h3>Use AI better</h3>
            <p>
              Get thoughtful guidance, build useful prompts, choose the right
              context, and learn what to verify when using any AI assistant.
            </p>
          </article>
        </div>
      </section>

      <section className="kai-context-section">
        <div className="container kai-context-grid">
          <div>
            <p className="eyebrow">Connected to your journey</p>
            <h2>Kai understands the BYNV context you choose to save.</h2>
            <p>
              As you build your Blueprint, set goals, choose a Daily Focus,
              work through Architect Cycles, face challenges, and record
              progress, Kai can connect what you are doing today to the version
              you are trying to become.
            </p>
            <p>
              Kai can also use your Version Snapshot, Architect Assessment,
              Version Score, and current BYNV page. Journal entries remain
              excluded unless a future experience gives you an explicit choice
              to include them.
            </p>
          </div>
          <KaiDemo />
        </div>
      </section>

      <section className="content container kai-boundaries">
        <p className="eyebrow">Guidance with boundaries</p>
        <h2>Support that respects your judgment.</h2>
        <p>
          Kai can help you reflect, organize, plan, and move forward, but is not
          therapy, crisis support, or medical, legal, or financial professional
          advice. During either assessment, Kai may explain wording or purpose
          but will never recommend an answer or influence your score.
        </p>
      </section>
    </>
  );
}
