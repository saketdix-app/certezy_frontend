export default function AboutHero() {
    return (
        <section className="relative bg-[#15304a] text-white overflow-hidden">
            {/* Dot grid background */}
            <div className="absolute inset-0 opacity-[0.06] bg-[radial-gradient(circle,_#ffffff_1px,_transparent_1px)] [background-size:28px_28px]" />

            <div className="relative max-w-[1440px] mx-auto px-6 py-24 md:py-32">
                <div className="text-center max-w-[950px] mx-auto">
                    {/* Badge */}
                    <div className="inline-flex items-center border border-[#3A76AA]/40 text-[#5B91C0] px-5 py-2 rounded-full text-ui font-medium mb-6">
                        ABOUT CERTEZY
                    </div>

                    {/* Heading */}
                    <h1 className="font-bold leading-tight text-h1 md:text-display lg:text-6xl xl:text-7xl">
                        Empowering Careers <br />
                        <span className="bg-gradient-to-r from-[#3A76AA] to-[#1E3F5E] bg-clip-text text-transparent">
                            Through Certified Learning
                        </span>
                    </h1>

                    {/* Subtext */}
                    <p className="mt-6 text-gray-400 text-h3 md:text-h2 max-w-[700px] mx-auto leading-relaxed">
                        We help professionals worldwide prepare for industry-recognized certifications and
                        advance their careers with confidence through curated digital education.
                    </p>

                    {/* Stats */}
                    <div className="flex flex-wrap justify-center gap-5 mt-12">
                        <div className="flex items-center gap-3 px-6 py-4 bg-white/5 border border-white/10 rounded-full hover:border-[#3A76AA] hover:bg-white/10 transition">
                            <span className="text-h2 font-bold">20+</span>

                            <span className="text-gray-400 text-ui">Self-Paced Courses</span>
                        </div>

                        <div className="flex items-center gap-3 px-6 py-4 bg-white/5 border border-white/10 rounded-full hover:border-[#3A76AA] hover:bg-white/10 transition">
                            <span className="text-h2 font-bold">35</span>

                            <span className="text-gray-400 text-ui">PMP® Contact Hours</span>
                        </div>

                        <div className="flex items-center gap-3 px-6 py-4 bg-white/5 border border-white/10 rounded-full hover:border-[#3A76AA] hover:bg-white/10 transition">
                            <span className="text-h2 font-bold">24×7</span>

                            <span className="text-gray-400 text-ui">WhatsApp Support</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
