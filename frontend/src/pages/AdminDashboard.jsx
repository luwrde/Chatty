import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { BookOpen, CircleHelp, Database, Eye, EyeOff, Headphones, Pencil, Plus, RefreshCw, ShieldCheck, UserPlus } from "lucide-react";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "../store/useAuthStore";
import { FACT_CATEGORIES } from "../constants";
import { formatDate, formatMessageTime, formatTimeSince } from "../lib/utils";

const EMPTY_FACT = { topic: "", answer: "", category: "other", status: "confirmed" };
const EMPTY_ADMIN = { fullName: "", email: "", password: "" };

const FACT_FILTERS = [
  { key: "all", label: "All" },
  { key: "unconfirmed", label: "Needs confirmation" },
  { key: "confirmed", label: "Confirmed" },
];

const cardClassName = "rounded-box border border-base-300/60 bg-base-100 p-5 shadow-soft";

const categoryTitle = (key) => FACT_CATEGORIES.find((category) => category.key === key)?.title ?? key;

const CardTitle = ({ icon, children, badge }) => {
  const Icon = icon;
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon className="size-[18px]" aria-hidden="true" />
      </span>
      <h2 className="text-lg font-bold">{children}</h2>
      {badge}
    </div>
  );
};

const LoadingBlock = () => <div className="skeleton mt-4 h-24 rounded-2xl" aria-label="Loading" />;

const LoadError = ({ onRetry }) => (
  <div className="mt-4 rounded-2xl bg-base-200/60 p-5 text-center text-sm">
    <p>Couldn&apos;t load this.</p>
    <button type="button" onClick={onRetry} className="btn btn-sm mt-2 rounded-full">
      <RefreshCw className="size-4" aria-hidden="true" />
      Try again
    </button>
  </div>
);

const ConnectionRow = ({ ok, name, detail }) => (
  <li className="flex items-start gap-2.5">
    <span className={`mt-1.5 size-2 shrink-0 rounded-full ${ok ? "bg-success" : "bg-error"}`} aria-hidden="true" />
    <span className="min-w-0">
      <span className="block font-semibold">
        {name}: {ok ? "connected" : "not reachable"}
      </span>
      <span className="block text-xs text-base-content/70">{detail}</span>
    </span>
  </li>
);

const ago = (value, now) => {
  const since = formatTimeSince(value, now);
  return since === "just now" ? since : `${since} ago`;
};

// Admins: support requests, the store connection, what the assistant knows, what it couldn't answer, and who else is an admin.
// Each list is null while loading and false if it failed.
const AdminDashboard = () => {
  const navigate = useNavigate();
  const { socket, authUser } = useAuthStore();
  const [requests, setRequests] = useState(null);
  const [overview, setOverview] = useState(null);
  const [isCheckingStore, setIsCheckingStore] = useState(false);
  const [facts, setFacts] = useState(null);
  const [factFilter, setFactFilter] = useState("all");
  const [questions, setQuestions] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const [form, setForm] = useState(null); // the fact being added or edited
  const [isSaving, setIsSaving] = useState(false);
  const dialogRef = useRef(null);
  const [admins, setAdmins] = useState(null);
  const [adminForm, setAdminForm] = useState(null); // the admin being added
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);
  const adminDialogRef = useRef(null);

  // A failed refresh keeps what's already shown
  const loadRequests = useCallback(
    () => axiosInstance.get("/admin/support-requests").then((res) => setRequests(res.data), () => setRequests((current) => current || false)),
    []
  );
  const loadOverview = useCallback(
    () => axiosInstance.get("/admin/overview").then((res) => setOverview(res.data), () => setOverview((current) => current || false)),
    []
  );
  const loadFacts = useCallback(
    () => axiosInstance.get("/knowledge/all").then((res) => setFacts(res.data), () => setFacts((current) => current || false)),
    []
  );
  const loadQuestions = useCallback(
    () => axiosInstance.get("/admin/unanswered").then((res) => setQuestions(res.data), () => setQuestions((current) => current || false)),
    []
  );
  const loadAdmins = useCallback(
    () => axiosInstance.get("/admin/admins").then((res) => setAdmins(res.data), () => setAdmins((current) => current || false)),
    []
  );

  useEffect(() => {
    loadRequests();
    loadOverview();
    loadFacts();
    loadQuestions();
    loadAdmins();
  }, [loadRequests, loadOverview, loadFacts, loadQuestions, loadAdmins]);

  // New or resolved requests: the server pings admins' sockets; a 30-second refresh covers a missed ping
  // and keeps the waiting times current
  useEffect(() => {
    socket?.on("support_requests_changed", loadRequests);
    const timer = setInterval(() => {
      setNow(Date.now());
      loadRequests();
    }, 30000);
    return () => {
      socket?.off("support_requests_changed", loadRequests);
      clearInterval(timer);
    };
  }, [socket, loadRequests]);

  const resolveRequest = async (request) => {
    try {
      await axiosInstance.patch(`/admin/support-requests/${request._id}`);
      setRequests((list) => list.filter((item) => item._id !== request._id));
      toast.success("Marked as resolved");
    } catch (error) {
      toast.error(error.response?.data?.message || "Couldn't resolve the request");
      loadRequests();
    }
  };

  const refreshOverview = async () => {
    setIsCheckingStore(true);
    await loadOverview();
    setIsCheckingStore(false);
  };

  const openFactForm = (fields) => {
    setForm({ ...EMPTY_FACT, ...fields });
    dialogRef.current?.showModal();
  };

  // The dialog's onClose clears the form
  const closeFactForm = () => dialogRef.current?.close();

  const saveFact = async (e) => {
    e.preventDefault();
    const { _id, questionId, question, ...fields } = form;
    setIsSaving(true);
    try {
      if (_id) await axiosInstance.patch(`/knowledge/${_id}`, fields);
      else await axiosInstance.post("/knowledge", fields);
      // Answering an unanswered question takes it off that list
      if (questionId) {
        await axiosInstance.patch(`/admin/unanswered/${questionId}`, { status: "answered" });
        setQuestions((list) => list.filter((item) => item._id !== questionId));
      }
      toast.success(_id ? "Fact updated" : `Fact added${question ? " for that question" : ""}`);
      closeFactForm();
      loadFacts();
    } catch (error) {
      toast.error(error.response?.data?.message || "Couldn't save the fact");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteFact = async () => {
    if (!window.confirm(`Delete "${form.topic}"? The assistant and the Help Center stop using it.`)) return;
    try {
      await axiosInstance.delete(`/knowledge/${form._id}`);
      toast.success("Fact deleted");
      closeFactForm();
      loadFacts();
    } catch (error) {
      toast.error(error.response?.data?.message || "Couldn't delete the fact");
    }
  };

  // Confirming publishes it to buyers, so ask first
  const confirmFact = async (fact) => {
    if (!window.confirm(`Confirm "${fact.topic}"? The assistant and the Help Center will tell buyers:\n\n${fact.answer}`)) return;
    try {
      const res = await axiosInstance.patch(`/knowledge/${fact._id}`, { status: "confirmed" });
      setFacts((list) => list.map((item) => (item._id === fact._id ? res.data : item)));
      toast.success(`"${fact.topic}" is now live`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Couldn't confirm the fact");
    }
  };

  const dismissQuestion = async (question) => {
    try {
      await axiosInstance.patch(`/admin/unanswered/${question._id}`, { status: "dismissed" });
      setQuestions((list) => list.filter((item) => item._id !== question._id));
    } catch (error) {
      toast.error(error.response?.data?.message || "Couldn't dismiss the question");
    }
  };

  const openAdminForm = () => {
    setAdminForm(EMPTY_ADMIN);
    setShowAdminPassword(false);
    adminDialogRef.current?.showModal();
  };

  // The dialog's onClose clears the form
  const closeAdminForm = () => adminDialogRef.current?.close();

  const addAdmin = async (e) => {
    e.preventDefault();
    setIsAddingAdmin(true);
    try {
      const res = await axiosInstance.post("/admin/admins", adminForm);
      toast.success(`${res.data.fullName} can now sign in as an admin`);
      closeAdminForm();
      loadAdmins();
    } catch (error) {
      toast.error(error.response?.data?.message || "Couldn't add the admin");
    } finally {
      setIsAddingAdmin(false);
    }
  };

  const visibleFacts = facts ? facts.filter((fact) => factFilter === "all" || fact.status === factFilter) : [];

  return (
    <div className="min-h-screen bg-base-200 pt-16">
      <main className="container mx-auto max-w-7xl px-4 py-6 sm:py-8">
        <h1 className="text-2xl font-bold sm:text-3xl">Admin console</h1>
        <p className="mt-1 text-sm text-base-content/70">Support requests, store data and what the assistant knows, in one place.</p>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <section aria-label="Support queue" className={`${cardClassName} lg:col-span-2`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle
                icon={Headphones}
                badge={requests?.length > 0 && (
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">{requests.length} waiting</span>
                )}
              >
                Support queue
              </CardTitle>
              <span className="text-sm text-base-content/70">Buyers who asked for a person</span>
            </div>

            {requests === null && <LoadingBlock />}
            {requests === false && <LoadError onRetry={loadRequests} />}
            {requests?.length === 0 && (
              <p className="mt-4 rounded-2xl bg-base-200/60 p-6 text-center text-sm text-base-content/75">
                No one is waiting. New requests show up here right away.
              </p>
            )}
            {requests?.length > 0 && (
              <ul className="mt-4 space-y-2.5">
                {requests.map((request) => {
                  const waiting = formatTimeSince(request.createdAt, now);
                  return (
                    <li key={request._id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-base-300/70 bg-base-200/40 p-3.5">
                      <img src={request.user?.profilePic || "/avatar.png"} alt="" className="size-10 shrink-0 rounded-full object-cover" />
                      <div className="min-w-0 flex-1 basis-60">
                        <p className="flex flex-wrap items-baseline gap-x-2">
                          <span className="font-semibold">{request.user?.fullName ?? "Deleted account"}</span>
                          <span className="text-xs text-base-content/70">{waiting === "just now" ? "Just now" : `Waiting ${waiting}`}</span>
                        </p>
                        <p className="text-sm">&ldquo;{request.message}&rdquo;</p>
                        {request.lastQuestion && (
                          <p className="mt-0.5 text-xs text-base-content/70">Asked the assistant before: {request.lastQuestion}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {request.user && (
                          <button
                            type="button"
                            onClick={() => navigate("/", { state: { openUserId: request.user._id } })}
                            className="btn btn-primary btn-sm rounded-full"
                          >
                            Open chat
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => resolveRequest(request)}
                          className="btn btn-sm rounded-full border-primary/30 bg-base-100 text-primary hover:border-primary/50 hover:bg-primary/10"
                        >
                          Resolve
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section aria-label="Store data" className={cardClassName}>
            <CardTitle icon={Database}>Store data</CardTitle>
            {overview === null && <LoadingBlock />}
            {overview === false && <LoadError onRetry={loadOverview} />}
            {overview && (
              <>
                <dl className="mt-4 grid grid-cols-3 gap-2">
                  {[
                    ["Products", overview.feed.products],
                    ["Categories", overview.feed.categories],
                    ["Sellers", overview.feed.sellers],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl bg-base-200/70 p-3">
                      <dt className="text-xs text-base-content/75">{label}</dt>
                      <dd className="text-2xl font-bold">{value}</dd>
                    </div>
                  ))}
                </dl>
                <ul className="mt-4 space-y-3 text-sm">
                  <ConnectionRow ok={overview.feed.available} name="Product feed" detail="get-products-for-bot.php: products for the assistant and the Store page" />
                  <ConnectionRow ok={overview.storeDb.connected} name="Store database" detail="MySQL ecommerse_db: orders, sellers in buyers' chats, Free Shipping badges" />
                </ul>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-base-content/70">Checked at {formatMessageTime(overview.checkedAt)}</p>
                  <button
                    type="button"
                    onClick={refreshOverview}
                    disabled={isCheckingStore}
                    className="btn btn-sm rounded-full border-primary/30 bg-base-100 text-primary hover:border-primary/50 hover:bg-primary/10"
                  >
                    <RefreshCw className={`size-4 ${isCheckingStore ? "animate-spin" : ""}`} aria-hidden="true" />
                    Refresh now
                  </button>
                </div>
              </>
            )}
          </section>

          <section aria-label="What the assistant knows" className={`${cardClassName} lg:col-span-2`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle icon={BookOpen}>What the assistant knows</CardTitle>
              <button type="button" onClick={() => openFactForm({})} className="btn btn-primary btn-sm rounded-full">
                <Plus className="size-4" aria-hidden="true" />
                Add a fact
              </button>
            </div>
            <p className="mt-2 text-sm text-base-content/75">
              The assistant and the Help Center use only confirmed facts. Unconfirmed ones stay hidden until someone on the team confirms them.
            </p>

            {facts === null && <LoadingBlock />}
            {facts === false && <LoadError onRetry={loadFacts} />}
            {facts && (
              <>
                <div role="group" aria-label="Show facts" className="mt-4 flex flex-wrap gap-1.5">
                  {FACT_FILTERS.map((filter) => (
                    <button
                      key={filter.key}
                      type="button"
                      onClick={() => setFactFilter(filter.key)}
                      aria-pressed={factFilter === filter.key}
                      className={`btn btn-xs h-8 gap-1.5 rounded-full px-3 ${factFilter === filter.key ? "btn-primary" : "border-base-300 bg-base-100 font-medium"}`}
                    >
                      {filter.label}
                      <span>{filter.key === "all" ? facts.length : facts.filter((fact) => fact.status === filter.key).length}</span>
                    </button>
                  ))}
                </div>
                <div className="mt-3 overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th scope="col">Topic</th>
                        <th scope="col">Answer</th>
                        <th scope="col">Status</th>
                        <th scope="col"><span className="sr-only">Actions</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleFacts.map((fact) => {
                        const isConfirmed = fact.status === "confirmed";
                        return (
                          <tr key={fact._id}>
                            <td className="align-top font-semibold">
                              {fact.topic}
                              <span className="block text-xs font-normal text-base-content/70">{categoryTitle(fact.category)}</span>
                            </td>
                            <td className="min-w-[16rem] align-top text-base-content/80">{fact.answer}</td>
                            <td className="align-top">
                              <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${isConfirmed ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                                {isConfirmed ? "Confirmed" : "Needs confirmation"}
                              </span>
                            </td>
                            <td className="align-top">
                              <div className="flex justify-end gap-1">
                                {!isConfirmed && (
                                  <button
                                    type="button"
                                    onClick={() => confirmFact(fact)}
                                    className="btn btn-sm rounded-full border-primary/30 bg-base-100 text-primary hover:border-primary/50 hover:bg-primary/10"
                                  >
                                    Confirm
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => openFactForm({ _id: fact._id, topic: fact.topic, answer: fact.answer, category: fact.category, status: fact.status })}
                                  className="btn btn-ghost btn-sm btn-circle"
                                  aria-label={`Edit ${fact.topic}`}
                                  title="Edit"
                                >
                                  <Pencil className="size-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {visibleFacts.length === 0 && <p className="py-6 text-center text-sm text-base-content/70">No facts here.</p>}
                </div>
              </>
            )}
          </section>

          <section aria-label="Questions the assistant couldn't answer" className={cardClassName}>
            <CardTitle icon={CircleHelp}>Questions it couldn&apos;t answer</CardTitle>
            <p className="mt-2 text-sm text-base-content/75">Answer once here and both the assistant and the Help Center use it.</p>

            {questions === null && <LoadingBlock />}
            {questions === false && <LoadError onRetry={loadQuestions} />}
            {questions?.length === 0 && (
              <p className="mt-4 rounded-2xl bg-base-200/60 p-5 text-center text-sm text-base-content/75">
                Nothing yet. When the assistant has no answer and sends a buyer to support, the question shows up here.
              </p>
            )}
            {questions?.length > 0 && (
              <ul className="mt-4 space-y-2.5">
                {questions.map((question) => (
                  <li key={question._id} className="rounded-2xl border border-base-300/70 p-3.5">
                    <p className="font-semibold">&ldquo;{question.question}&rdquo;</p>
                    <p className="mt-0.5 text-xs text-base-content/70">
                      Asked {question.count} time{question.count === 1 ? "" : "s"} · last {ago(question.lastAskedAt, now)}
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openFactForm({ topic: question.question.slice(0, 80), questionId: question._id, question: question.question })}
                        className="btn btn-primary btn-sm rounded-full"
                      >
                        Add answer
                      </button>
                      <button type="button" onClick={() => dismissQuestion(question)} className="btn btn-ghost btn-sm rounded-full">
                        Dismiss
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-label="Admin accounts" className={`${cardClassName} lg:col-span-3`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle icon={ShieldCheck}>Admin accounts</CardTitle>
              <button type="button" onClick={openAdminForm} className="btn btn-primary btn-sm rounded-full">
                <UserPlus className="size-4" aria-hidden="true" />
                Add an admin
              </button>
            </div>
            <p className="mt-2 text-sm text-base-content/75">
              Admins can use this console and chat with any account. Sign-up only creates buyer accounts, and store sellers who open the chat join as admins.
            </p>

            {admins === null && <LoadingBlock />}
            {admins === false && <LoadError onRetry={loadAdmins} />}
            {admins?.length > 0 && (
              <ul className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {admins.map((admin) => (
                  <li key={admin._id} className="flex items-center gap-3 rounded-2xl border border-base-300/70 p-3.5">
                    <img src={admin.profilePic || "/avatar.png"} alt="" className="size-10 shrink-0 rounded-full object-cover" />
                    <div className="min-w-0">
                      <p className="flex items-center gap-2">
                        <span className="min-w-0 truncate font-semibold">{admin.fullName}</span>
                        {admin._id === authUser?._id && (
                          <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">You</span>
                        )}
                      </p>
                      <p className="truncate text-xs text-base-content/70">{admin.email}</p>
                      <p className="text-xs text-base-content/70">Added {formatDate(admin.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>

      <dialog ref={dialogRef} className="modal" onClose={() => setForm(null)} aria-labelledby="fact-form-title">
        {form && (
          <div className="modal-box max-w-lg">
            <h3 id="fact-form-title" className="text-lg font-bold">{form._id ? "Edit fact" : "Add a fact"}</h3>
            {form.question && <p className="mt-1 text-sm text-base-content/70">Answering: &ldquo;{form.question}&rdquo;</p>}
            <form onSubmit={saveFact} className="mt-4 space-y-4">
              <label className="form-control w-full">
                <span className="label-text mb-1 font-medium">Topic</span>
                <input
                  type="text"
                  required
                  maxLength={80}
                  value={form.topic}
                  onChange={(e) => setForm({ ...form, topic: e.target.value })}
                  placeholder="e.g. Return window"
                  className="input input-bordered w-full"
                />
              </label>
              <label className="form-control w-full">
                <span className="label-text mb-1 font-medium">Answer</span>
                <textarea
                  required
                  maxLength={600}
                  rows={4}
                  value={form.answer}
                  onChange={(e) => setForm({ ...form, answer: e.target.value })}
                  placeholder="What buyers should be told"
                  className="textarea textarea-bordered w-full"
                />
              </label>
              <label className="form-control w-full">
                <span className="label-text mb-1 font-medium">Help Center section</span>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="select select-bordered w-full">
                  {FACT_CATEGORIES.map((category) => (
                    <option key={category.key} value={category.key}>{category.title}</option>
                  ))}
                </select>
              </label>
              <fieldset>
                <legend className="mb-1 text-sm font-medium">Status</legend>
                <label className="flex cursor-pointer items-start gap-2.5 py-1 text-sm">
                  <input
                    type="radio"
                    name="fact-status"
                    className="radio radio-primary radio-sm mt-0.5"
                    checked={form.status === "confirmed"}
                    onChange={() => setForm({ ...form, status: "confirmed" })}
                  />
                  <span><span className="font-semibold">Confirmed</span>: the assistant and the Help Center use it</span>
                </label>
                <label className="flex cursor-pointer items-start gap-2.5 py-1 text-sm">
                  <input
                    type="radio"
                    name="fact-status"
                    className="radio radio-primary radio-sm mt-0.5"
                    checked={form.status === "unconfirmed"}
                    onChange={() => setForm({ ...form, status: "unconfirmed" })}
                  />
                  <span><span className="font-semibold">Needs confirmation</span>: hidden from buyers</span>
                </label>
              </fieldset>
              <div className="modal-action flex-wrap">
                {form._id && (
                  <button type="button" onClick={deleteFact} className="btn btn-ghost mr-auto text-red-700">
                    Delete
                  </button>
                )}
                <button type="button" onClick={closeFactForm} className="btn btn-ghost">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSaving}>
                  {isSaving ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        )}
        <form method="dialog" className="modal-backdrop">
          <button type="submit">Close</button>
        </form>
      </dialog>

      <dialog ref={adminDialogRef} className="modal" onClose={() => setAdminForm(null)} aria-labelledby="admin-form-title">
        {adminForm && (
          <div className="modal-box max-w-md">
            <h3 id="admin-form-title" className="text-lg font-bold">Add an admin</h3>
            <p className="mt-1 text-sm text-base-content/70">
              They sign in on the regular sign-in page with this email and password. Share the password with them privately.
            </p>
            <form onSubmit={addAdmin} className="mt-4 space-y-4">
              <label className="form-control w-full">
                <span className="label-text mb-1 font-medium">Full name</span>
                <input
                  type="text"
                  required
                  autoFocus
                  maxLength={100}
                  autoComplete="off"
                  value={adminForm.fullName}
                  onChange={(e) => setAdminForm({ ...adminForm, fullName: e.target.value })}
                  className="input input-bordered w-full"
                />
              </label>
              <label className="form-control w-full">
                <span className="label-text mb-1 font-medium">Email</span>
                <input
                  type="email"
                  required
                  autoComplete="off"
                  value={adminForm.email}
                  onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                  placeholder="name@example.com"
                  className="input input-bordered w-full"
                />
              </label>
              <div className="form-control w-full">
                <label htmlFor="admin-password" className="label-text mb-1 font-medium">Password</label>
                <div className="relative">
                  <input
                    id="admin-password"
                    type={showAdminPassword ? "text" : "password"}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={adminForm.password}
                    onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                    placeholder="At least 6 characters"
                    className="input input-bordered w-full pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPassword(!showAdminPassword)}
                    aria-label="Show password"
                    aria-pressed={showAdminPassword}
                    className="absolute inset-y-0 right-0 flex items-center rounded-lg px-3.5 text-base-content/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    {showAdminPassword ? <EyeOff className="size-5" aria-hidden="true" /> : <Eye className="size-5" aria-hidden="true" />}
                  </button>
                </div>
              </div>
              <div className="modal-action">
                <button type="button" onClick={closeAdminForm} className="btn btn-ghost">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isAddingAdmin}>
                  {isAddingAdmin ? "Adding…" : "Add admin"}
                </button>
              </div>
            </form>
          </div>
        )}
        <form method="dialog" className="modal-backdrop">
          <button type="submit">Close</button>
        </form>
      </dialog>
    </div>
  );
};

export default AdminDashboard;
