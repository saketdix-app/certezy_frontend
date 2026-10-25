import { Link } from "react-router-dom";
import { APP_NAME } from "@/config/app";

const SOURCES = {
    // Blue wordmark — for white / light backgrounds
    dark: "/brand/certezy-logo.png",
    // White wordmark — for navy / dark backgrounds
    light: "/brand/certezy-logo-light.png",
};

/**
 * Certezy logo.
 *
 * <Logo />                         blue wordmark, 32px tall
 * <Logo variant="light" />         white wordmark for dark backgrounds
 * <Logo height={28} to="/" />      wrapped in a link to the homepage
 */
export default function Logo({ variant = "dark", height = 32, to, className = "", style }) {
    const img = (
        <img
            src={SOURCES[variant] || SOURCES.dark}
            alt={APP_NAME}
            height={height}
            // Artwork is 707×164; fixed width avoids layout shift while loading
            width={Math.round((height * 707) / 164)}
            className={`block shrink-0 select-none ${to ? "" : className}`}
            style={{ height, width: "auto", ...(to ? {} : style) }}
            draggable={false}
        />
    );

    if (!to) return img;
    return (
        <Link
            to={to}
            aria-label={`${APP_NAME} home`}
            className={`inline-flex shrink-0 ${className}`}
            style={style}
        >
            {img}
        </Link>
    );
}
