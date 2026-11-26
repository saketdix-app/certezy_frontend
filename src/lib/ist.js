/**
 * CERTEZY shows every time in India time (IST), whatever the computer's
 * time zone. Dates are shown with toLocaleString / toLocaleDateString /
 * toLocaleTimeString across the app; this makes Asia/Kolkata their default.
 * A call that names its own time zone (e.g. "UTC" for calendar dates) keeps it.
 * Imported first in main.jsx.
 */
export const IST = "Asia/Kolkata";

const withIst = (original) =>
    function (locales, options) {
        if (options && options.timeZone) return original.call(this, locales, options);
        return original.call(this, locales, { ...(options || {}), timeZone: IST });
    };

if (!Date.prototype.__certezyIst) {
    Date.prototype.toLocaleString = withIst(Date.prototype.toLocaleString);
    Date.prototype.toLocaleDateString = withIst(Date.prototype.toLocaleDateString);
    Date.prototype.toLocaleTimeString = withIst(Date.prototype.toLocaleTimeString);
    Object.defineProperty(Date.prototype, "__certezyIst", { value: true });
}
