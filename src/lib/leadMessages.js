/** WhatsApp / email messages to leads: fill-ins and starter texts. */

export const PLACEHOLDERS = [
    ["{name}", "Lead's full name"],
    ["{first_name}", "Lead's first name"],
    ["{course}", "Course they're interested in"],
    ["{my_name}", "Your name"],
    ["{my_phone}", "Your phone"],
];

/** Fill {name}, {course}… for this lead. */
export const fillTemplate = (text, lead, me) =>
    String(text ?? "")
        .replaceAll("{name}", lead?.name ?? "")
        .replaceAll("{first_name}", String(lead?.name ?? "").split(" ")[0])
        .replaceAll("{course}", lead?.course_title ?? "our course")
        .replaceAll("{my_name}", me?.name ?? "")
        .replaceAll("{my_phone}", me?.mobile ?? "");

export const STARTERS = {
    whatsapp: "Hi {first_name}, this is {my_name} from CERTEZY. Thanks for your interest in {course}. When is a good time to talk?",
    email: "Hi {first_name},\n\nThanks for your interest in {course}. I'd be glad to help you plan your preparation.\n\nBest regards,\n{my_name}\nCERTEZY E-LEARNING PVT LTD",
};

/** Number to message on WhatsApp: the consultant-added one, else the lead's phone. */
export const whatsappNumberOf = (lead) => String(lead?.whatsapp_number || lead?.phone || "").replace(/\D/g, "");
