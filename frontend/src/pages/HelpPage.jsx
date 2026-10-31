import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Headphones, RefreshCw, Search, Sparkles } from "lucide-react";
import { axiosInstance } from "../lib/axios";
import { FACT_CATEGORIES, SUPPORT_REQUEST_TEXT } from "../constants";
import BotAvatar from "../components/BotAvatar";

const cardClassName = "flex flex-col gap-4 rounded-box border border-base-300/60 bg-base-100 p-5 shadow-soft";

// Store policies: the confirmed facts from the admin console, the same ones the assistant answers from
const HelpPage = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [query, setQuery] = useState("");

  const fetchFacts = useCallback(
    () =>
      axiosInstance.get("/knowledge").then(
        (res) => {
          setData(res.data);
          setStatus("ready");
        },
        (error) => {
          console.log("Help Center unavailable:", error.message);
          setStatus("error");
        }
      ),
    []
  );

  useEffect(() => {
    fetchFacts();
  }, [fetchFacts]);

  const retry = () => {
    setStatus("loading");
    fetchFacts();
  };

  const search = query.trim().toLowerCase();
  const sections = FACT_CATEGORIES.map((category) => ({
    ...category,
    facts: (data?.facts ?? []).filter(
      (fact) => fact.category === category.key && (!search || `${fact.topic} ${fact.answer}`.toLowerCase().includes(search))
    ),
    // Only unconfirmed facts so far: shown as "being finalized", without their text
    isPending: Boolean(data?.pendingCategories.includes(category.key)) && (!search || category.title.toLowerCase().includes(search)),
  })).filter((section) => section.facts.length > 0 || section.isPending);

  return (
    <div className="min-h-screen bg-base-200 pt-16">
      <main className="container mx-auto max-w-7xl px-4 py-6 sm:py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">Help Center</h1>
            <p className="mt-1 text-sm text-base-content/70">Store policies, in one place, kept up to date by the EcommerSense team.</p>
          </div>
          <label className="flex h-11 w-full items-center gap-2 rounded-full border border-base-300 bg-base-100 px-4 text-base-content/60 focus-within:ring-2 focus-within:ring-primary/30 sm:w-96">
            <Search className="size-4 shrink-0" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search help, e.g. shipping fee"
              aria-label="Search help"
              className="min-w-0 flex-1 bg-transparent text-sm text-base-content outline-none placeholder:text-base-content/60"
            />
          </label>
        </div>

        {status === "loading" && (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Loading help">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="skeleton h-48 rounded-box" />
            ))}
          </div>
        )}

        {status === "error" && (
          <div className="mt-6 rounded-box border border-base-300/60 bg-base-100 p-8 text-center shadow-soft">
            <h2 className="text-lg font-bold">The Help Center couldn&apos;t load</h2>
            <button type="button" onClick={retry} className="btn btn-primary btn-sm mt-4 rounded-full">
              <RefreshCw className="size-4" aria-hidden="true" />
              Try again
            </button>
          </div>
        )}

        {status === "ready" && (
          <>
            {sections.length > 0 ? (
              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {sections.map((section) => {
                  const Icon = section.icon;
                  return section.facts.length > 0 ? (
                    <article key={section.key} className={cardClassName}>
                      <div className="flex items-center gap-3">
                        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                          <Icon className="size-5" aria-hidden="true" />
                        </span>
                        <h2 className="text-lg font-bold">{section.title}</h2>
                      </div>
                      <ul className="space-y-3">
                        {section.facts.map((fact) => (
                          <li key={fact._id} className="flex items-start gap-2.5 text-sm">
                            <Check className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={2.5} aria-hidden="true" />
                            <span>
                              <span className="font-semibold">{fact.topic}:</span> {fact.answer}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </article>
                  ) : (
                    <article key={section.key} className={`${cardClassName} border-dashed shadow-none`}>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-base-200 text-base-content/70">
                          <Icon className="size-5" aria-hidden="true" />
                        </span>
                        <h2 className="text-lg font-bold">{section.title}</h2>
                        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">Being finalized</span>
                      </div>
                      <p className="text-sm text-base-content/75">
                        These terms aren&apos;t published yet. Until they are, our support team handles each request personally.
                      </p>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="mt-6 rounded-box border border-base-300/60 bg-base-100 p-8 text-center text-sm shadow-soft">
                {search ? "Nothing matches your search. Try the assistant below." : "No policies are published yet."}
              </p>
            )}

            <section
              aria-label="More help"
              className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-box border border-base-300/60 bg-base-100 p-5 shadow-soft sm:p-6"
            >
              <div className="flex min-w-0 items-center gap-4">
                <BotAvatar className="size-12 bg-primary/10 text-primary" iconClassName="size-6" />
                <div className="min-w-0">
                  <h2 className="text-lg font-bold">Still have a question?</h2>
                  <p className="text-sm text-base-content/75">The assistant answers from these same pages, or you can ask for a person from support.</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => navigate("/")} className="btn btn-primary rounded-full">
                  <Sparkles className="size-4" aria-hidden="true" />
                  Ask the assistant
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/", { state: { prompt: SUPPORT_REQUEST_TEXT } })}
                  className="btn rounded-full border-primary/30 bg-base-100 text-primary hover:border-primary/50 hover:bg-primary/10"
                >
                  <Headphones className="size-4" aria-hidden="true" />
                  Talk to a person
                </button>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default HelpPage;
