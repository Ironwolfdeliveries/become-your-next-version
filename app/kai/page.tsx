import { KaiPrompt } from "@/components/kai-prompt";
import { KaiPersonalContext } from "@/components/kai-personal-context";
import { KaiDemo } from "@/components/kai-demo";
import Image from "next/image";
import { MemberHeader as PageHero } from "@/components/ui";
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
        copy="Kai connects your saved plans and progress. Ask a question or choose a next step together."
      />
      <KaiPersonalContext />
      <section className="container kai-capabilities"><KaiPrompt prompt="What should I do next?">Help me choose my next step</KaiPrompt><KaiPrompt prompt="Explain this page">Explain this simply</KaiPrompt></section>
      <details className="container"><summary>How Kai helps, examples, and boundaries</summary>
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
          <p className="kai-wordmark">KAI</p>
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
              Identify a next step, break down goals, use your Today’s Plan, stay
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

      <section className="container kai-capabilities">
        <p className="eyebrow">What Kai can help you do</p><h2>Bring a real question. Find a practical next step.</h2>
        <div className="cards">{[
          ["Understand your direction", "Explore your Version Score, explain your Blueprint, and connect today’s task to what you want to build."],
          ["Make progress manageable", "Break down a large goal, plan a routine or Architect Cycle, review progress, and spot recurring friction."],
          ["Prepare for what is next", "Organize career goals, prepare for a job search, and build useful AI prompts and productivity systems."],
          ["Ask better questions", "Prepare questions about meal planning, fitness, or financial organization for a qualified professional. Kai does not replace one."],
        ].map(([title,copy]) => <article className="card" key={title}><h3>{title}</h3><p>{copy}</p></article>)}</div>
        <h2>Try asking Kai</h2><div className="kai-prompt-grid">{["Explain my Version Score", "Help me turn a large goal into three smaller steps", "Help me plan a 14-day Architect Cycle", "Help me prepare for a job search", "Build an AI prompt for my next action", "Review my progress and help me identify friction"].map(prompt => <KaiPrompt key={prompt} prompt={prompt}>{prompt}</KaiPrompt>)}</div>
        <p className="field-help">Examples open Ask Kai with a draft question. You choose what to send. Guided Kai may offer a structured prompt to explore further.</p>
      </section>
      <section className="kai-context-section">
        <div className="container kai-context-grid">
          <div>
            <p className="eyebrow">Connected to your journey</p>
            <h2>Kai understands the BYNV context you choose to save.</h2>
            <p>
              As you build your Blueprint, set goals, choose a Today’s Plan,
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
      </details>
    </>
  );
}
