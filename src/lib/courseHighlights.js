/**
 * courseHighlights.js — fixed rating / learner figures shown for selected
 * courses instead of the live numbers (card + detail page).
 *
 * Matched by course id, which stays the same when the title or slug changes.
 * Delete an entry to go back to the live rating and enrolment count.
 */

const HIGHLIGHTS = {
    // Project Management Professional 8th Edition Prep (PMP)
    44: { rating: 4.5, learners: "10K+" },
};

/** @returns {{ rating: number, learners: string } | null} */
export const getCourseHighlight = (course) => (course?.id != null && HIGHLIGHTS[course.id]) || null;
