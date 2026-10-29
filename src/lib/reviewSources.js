/**
 * Where a review came from — mirrors REVIEW_SOURCES in the backend
 * (src/constants.js). Reviews entered by an admin are always shown with
 * their source so visitors can tell them apart from on-site reviews.
 */
export const REVIEW_SOURCES = {
    platform: { label: "Verified learner", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    classroom: { label: "Classroom batch", cls: "bg-sky-50 text-sky-700 border-sky-200" },
    corporate: { label: "Corporate training", cls: "bg-indigo-50 text-indigo-700 border-indigo-200" },
    other_platform: { label: "Another platform", cls: "bg-amber-50 text-amber-700 border-amber-200" },
    feedback_form: { label: "Feedback form", cls: "bg-slate-50 text-slate-600 border-slate-200" },
};

export const ADMIN_REVIEW_SOURCES = Object.keys(REVIEW_SOURCES).filter((s) => s !== "platform");

/** Public label: "Classroom batch · PMP weekend batch, Pune" / "Via Udemy" */
export const describeSource = (review) => {
    const src = REVIEW_SOURCES[review?.source] || REVIEW_SOURCES.platform;
    if (review?.source === "other_platform" && review.source_note) return `Via ${review.source_note}`;
    return review?.source_note && review.source !== "platform"
        ? `${src.label} · ${review.source_note}`
        : src.label;
};
