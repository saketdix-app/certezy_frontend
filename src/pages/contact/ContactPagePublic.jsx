// src/pages/contact/ContactPage.jsx

import ContactHero from "./ContactHero";
import ContactForm from "./ContactForm";

export default function ContactPagePublic() {
    return (
        <div
            style={{
                minHeight: "100vh",
                background: "linear-gradient(135deg, #15304a 0%, #183254 55%, #1e3f5e 100%)",
            }}
        >
            <ContactHero />
            <ContactForm />
        </div>
    );
}
