import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import toast from "react-hot-toast";
import paymentService from "@/services/paymentService";
import courseService from "@/services/courseService";
import discountService from "@/services/discountService";
import { fetchMe, selectUser } from "@/features/auth/authSlice";
import { useSearchParams } from "react-router-dom";
import { useCurrency } from "@/lib/currency";

// ── Utility Functions ─────────────────────────
const retryWithBackoff = async (fn, maxRetries = 3, delay = 1000) => {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (err) {
            if (err?.response || i === maxRetries - 1) throw err;
            await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)));
        }
    }
};

const getErrorMessage = (error) => {
    if (error.message === "Popup blocked") {
        return "Please allow popups for PayPal";
    }
    if (error.message === "Payment timeout") {
        return "Payment timed out. Please try again.";
    }
    if (error.message === "cancelled") {
        return "Payment cancelled";
    }
    // Server / gateway reason (e.g. "Razorpay could not start the payment: …")
    const serverMessage = error.response?.data?.message;
    if (serverMessage) return serverMessage;
    if (error.message === "Verification failed") {
        return "Payment verification failed. Contact support if money was deducted.";
    }
    if (error.detail) return error.detail;
    if (error.code === "NETWORK_ERROR" || error.message.includes("network")) {
        return "Check your internet connection";
    }
    return "Payment failed. Please try again.";
};

// ── Razorpay Loader (with retry and timeout) ─────────────────────────
function loadRazorpayScript(maxRetries = 3) {
    return retryWithBackoff(async () => {
        return new Promise((resolve, reject) => {
            if (window.Razorpay) return resolve(true);

            const s = document.createElement("script");
            s.src = "https://checkout.razorpay.com/v1/checkout.js";

            const timeout = setTimeout(() => {
                document.body.removeChild(s);
                reject(new Error("Razorpay SDK failed to load"));
            }, 10000);

            s.onload = () => {
                clearTimeout(timeout);
                resolve(true);
            };

            s.onerror = () => {
                clearTimeout(timeout);
                document.body.removeChild(s);
                reject(new Error("Razorpay SDK failed to load"));
            };

            document.body.appendChild(s);
        });
    }, maxRetries);
}

export function useCheckout(courseId) {
    const navigate = useNavigate();
    const user = useSelector(selectUser);
    const dispatch = useDispatch();
    const [searchParams] = useSearchParams();

    // Refs for cleanup and state management
    const isMounted = useRef(true);
    const paypalWindow = useRef(null);
    const paypalPoll = useRef(null);
    const paypalTimeout = useRef(null);
    const lastClickTime = useRef(0);

    const [course, setCourse] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    // India (by IP) pays in ₹ with Razorpay — only on courses that sell in
    // rupees; everyone else pays $ with PayPal. Enforced by the server too.
    const regionCurrency = useCurrency();
    const currency = regionCurrency === "INR" && course?.inr_enabled ? "INR" : "USD";
    const method = currency === "INR" ? "razorpay" : "paypal";
    const setMethod = useCallback(() => {}, []);
    const [paying, setPaying] = useState(false);
    const [scriptLoading, setScriptLoading] = useState(false);

    const [paymentAmount, setPaymentAmount] = useState(null);
    const [paymentCurrency, setPaymentCurrency] = useState(null);
    const [discountInfo, setDiscountInfo] = useState(null);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            isMounted.current = false;
            if (paypalPoll.current) clearInterval(paypalPoll.current);
            if (paypalTimeout.current) clearTimeout(paypalTimeout.current);
            if (paypalWindow.current && !paypalWindow.current.closed) {
                paypalWindow.current.close();
            }
        };
    }, []);

    // Set initial price when course loads
    useEffect(() => {
        if (course) {
            // Same amounts the server will charge: rupee price for Razorpay,
            // dollar price for PayPal (a discount link's price wins)
            const inr = currency === "INR" && Number(course.price_inr) > 0;
            setPaymentAmount(
                inr
                    ? (course.discount_price_inr ?? course.price_inr)
                    : (course.discount_price ?? course.price)
            );
            setPaymentCurrency(inr ? "INR" : "USD");
        }
    }, [course, currency]);

    // ── Fetch course ─────────────────────────
    useEffect(() => {
        if (!courseId) return navigate("/courses");
        if (!user) {
            const back = window.location.pathname + window.location.search;
            return navigate(`/login?redirect=${encodeURIComponent(back)}`);
        }

        const discountToken = searchParams.get("discount");

        const fetchCourse = async () => {
            try {
                setLoading(true);

                let courseData = null;
                const cached = sessionStorage.getItem(`course_${courseId}`);
                const parsed = cached ? JSON.parse(cached) : null;

                // Only trust a cached copy that is an actual course (older code cached
                // the API wrapper `{ course: … }`, which rendered an empty checkout)
                if (parsed?.id && parsed?.title) {
                    courseData = parsed;
                } else {
                    const res = await retryWithBackoff(() => courseService.getBySlug(courseId));
                    // GET /courses/:slugOrId returns { course: {...} }
                    courseData = res.data?.data?.course ?? res.data?.data;
                    if (!courseData?.id) throw new Error("Course not found");
                    sessionStorage.setItem(`course_${courseId}`, JSON.stringify(courseData));
                }

                // Apply discount if token exists
                if (discountToken) {
                    try {
                        const discountRes = await retryWithBackoff(() =>
                            discountService.verifyToken(discountToken)
                        );
                        const discount = discountRes.data.data;

                        if (discount && discount.discount_price != null) {
                            courseData = {
                                ...courseData,
                                discount_price: discount.discount_price,
                                discount_price_inr: discount.discount_price_inr ?? null,
                                // the API returns discount_link_id (was read as `id`, so it never applied)
                                discount_link_id: discount.discount_link_id ?? discount.id,
                            };
                            setDiscountInfo(discount);
                        }
                    } catch (discountErr) {
                        // e.g. expired, already used, or sent to another email
                        toast.error(
                            discountErr.response?.data?.message || "This discount link can't be used"
                        );
                    }
                }

                if (isMounted.current) {
                    setCourse(courseData);
                }
            } catch (err) {
                if (isMounted.current) {
                    setError("Failed to load course");
                }
            } finally {
                if (isMounted.current) {
                    setLoading(false);
                }
            }
        };

        fetchCourse();
    }, [courseId, searchParams.get("discount")]);

    // ── Create Order (COMMON) with retry ─────────────────────────
    const createOrder = useCallback(
        async (type) => {
            const api =
                type === "razorpay" ? paymentService.razorpayCreateOrder : paymentService.paypalCreateOrder;

            const orderData = {
                course_id: course.id,
                ...(course.discount_link_id && { discount_link_id: course.discount_link_id }),
            };

            const { data } = await retryWithBackoff(() => api(orderData));
            const order = data.data;

            if (isMounted.current) {
                setPaymentAmount(order.amount);
                setPaymentCurrency(order.currency);
            }

            return order;
        },
        [course]
    );

    // ── Razorpay Payment ─────────────────────────
    const payRazorpay = useCallback(async () => {
        try {
            setScriptLoading(true);
            const loaded = await loadRazorpayScript();
            if (!loaded) throw new Error("Could not load the payment gateway. Please try again.");
        } catch (err) {
            throw new Error("Could not load the payment gateway. Please try again.");
        } finally {
            setScriptLoading(false);
        }

        const order = await createOrder("razorpay");

        return new Promise((resolve, reject) => {
            const rzp = new window.Razorpay({
                key: order.key_id,
                amount: Math.round(order.amount * 100),
                currency: order.currency,
                order_id: order.razorpay_order_id,
                name: "Certezy",
                description: course.title,
                prefill: { name: user.name, email: user.email },

                handler: async (response) => {
                    try {
                        await retryWithBackoff(() =>
                            paymentService.razorpayVerify({
                                payment_id: order.payment_id,
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                            })
                        );

                        if (isMounted.current) resolve({ status: "success" });
                    } catch (err) {
                        reject(err?.response ? err : new Error("Verification failed"));
                    }
                },

                modal: {
                    ondismiss: () => reject(new Error("cancelled")),
                },
            });

            // Card declined, bank error, etc. — Razorpay's own description
            rzp.on("payment.failed", (resp) => {
                const e = new Error("gateway");
                e.detail = resp?.error?.description || "Payment failed at the bank / gateway";
                reject(e);
            });

            rzp.open();
        });
    }, [course, user, createOrder]);

    // ── PayPal Payment ─────────────────────────
    const payPaypal = useCallback(async () => {
        // Open the window first (in the click) so popup blockers allow it. If it's
        // blocked (many phones / strict browsers) the whole tab goes to PayPal and
        // /payment/paypal/return finishes the payment.
        if (paypalPoll.current) clearInterval(paypalPoll.current);
        paypalWindow.current = window.open("", "PayPal", "width=600,height=760");
        const sameTab = !paypalWindow.current;

        let order;
        try {
            order = await createOrder("paypal");
        } catch (err) {
            paypalWindow.current?.close();
            throw err;
        }

        // PayPal's own approval link always matches the server's sandbox / live mode
        const fallbackBase =
            import.meta.env.VITE_PAYPAL_MODE === "live"
                ? "https://www.paypal.com/checkoutnow"
                : "https://www.sandbox.paypal.com/checkoutnow";
        const approveUrl = order.approve_url || `${fallbackBase}?token=${order.paypal_order_id}`;

        // Lets /payment/paypal/return finish the payment if this tab is gone (mobile)
        try {
            localStorage.setItem(
                "certezy_paypal_pending",
                JSON.stringify({
                    payment_id: order.payment_id,
                    paypal_order_id: order.paypal_order_id,
                    course_id: course.id,
                })
            );
        } catch {
            /* storage unavailable — the popup flow still works */
        }
        if (sameTab) {
            window.location.assign(approveUrl);
            return new Promise(() => {}); // leaving the page
        }
        paypalWindow.current.location.href = approveUrl;

        return new Promise((resolve, reject) => {
            let settled = false;
            const finish = (fn) => {
                if (settled) return;
                settled = true;
                clearInterval(paypalPoll.current);
                clearTimeout(paypalTimeout.current);
                window.removeEventListener("message", onMessage);
                fn();
            };
            const capture = async () => {
                try {
                    await paymentService.paypalCapture({
                        payment_id: order.payment_id,
                        paypal_order_id: order.paypal_order_id,
                    });
                    try {
                        localStorage.removeItem("certezy_paypal_pending");
                    } catch {
                        /* ignore */
                    }
                    finish(() => isMounted.current && resolve({ status: "success" }));
                } catch (err) {
                    const notApproved = /not approved|not completed/i.test(err.response?.data?.message || "");
                    finish(() => reject(notApproved ? new Error("cancelled") : err));
                }
            };

            // The return / cancel page posts its result, then closes itself
            const onMessage = (event) => {
                if (event.origin !== window.location.origin || event.data?.source !== "certezy-paypal")
                    return;
                if (event.data.status === "approved") capture();
                else finish(() => reject(new Error("cancelled")));
            };
            window.addEventListener("message", onMessage);

            // Window closed by hand: try to capture (succeeds only if approved)
            paypalPoll.current = setInterval(() => {
                if (paypalWindow.current?.closed && !settled) {
                    clearInterval(paypalPoll.current);
                    setTimeout(() => !settled && capture(), 800);
                }
            }, 1000);

            // Generous limit — logging in to PayPal and paying takes minutes
            paypalTimeout.current = setTimeout(
                () => finish(() => reject(new Error("Payment timeout"))),
                15 * 60 * 1000
            );
        });
    }, [createOrder, course]);

    // ── Main Payment Handler ─────────────────────────
    const handlePay = useCallback(async () => {
        // Double payment protection with timestamp
        const now = Date.now();
        if (now - lastClickTime.current < 1000) return;
        lastClickTime.current = now;

        if (paying || scriptLoading) return;
        if (!course?.id) {
            toast.error("Invalid course");
            return;
        }

        setPaying(true);

        try {
            if (method === "razorpay") {
                await payRazorpay();
            } else {
                await payPaypal();
            }

            if (isMounted.current) {
                toast.success("Payment successful 🎉");
                await dispatch(fetchMe());
                navigate(`/student/course/${course.id}/learn`);
            }
        } catch (err) {
            if (isMounted.current) {
                const errorMessage = getErrorMessage(err);
                if (err.message === "cancelled") {
                    toast(errorMessage);
                } else {
                    toast.error(errorMessage);
                }
            }
        } finally {
            if (isMounted.current) {
                setPaying(false);
            }
        }
    }, [paying, scriptLoading, course, method, payRazorpay, payPaypal, dispatch, navigate]);

    return {
        course,
        loading,
        error,
        method,
        setMethod,
        currency,
        paying,
        scriptLoading,
        handlePay,
        paymentAmount,
        paymentCurrency,
        discountInfo,
    };
}
