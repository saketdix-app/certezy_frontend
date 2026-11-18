import api from "./api";

/**
 * enquiryService.js — course-page lead forms (public)
 *   POST /enquiries → { kind: advisor | syllabus | team, course_id, name, phone, email, … }
 *   Each becomes a CRM lead; syllabus requests return { syllabus } and are emailed it.
 */
const enquiryService = {
    submit: (data) => api.post("/enquiries", data),
};

export default enquiryService;
