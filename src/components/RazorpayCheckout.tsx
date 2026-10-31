import React, { useState } from "react";
import { Loader2, CreditCard, X, Check, Star } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const PLANS = [
  { id: "1_month", name: "1 Month", price: 50, duration: "1 month", popular: false },
  { id: "3_months", name: "3 Months", price: 150, duration: "3 months", popular: true },
  { id: "1_year", name: "1 Year", price: 600, duration: "1 year", popular: false },
];

import { createPortal } from "react-dom";

export default function RazorpayCheckout({ onPaymentSuccess }: { onPaymentSuccess?: () => void }) {
  const [showModal, setShowModal] = useState(false);
  // ... rest of state stays the same ...
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  const pollOrderStatus = async (orderId: string) => {
    if (!orderId) return;
    setIsPolling(true);
    
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/order-status/${orderId}`);
        const data = await response.json();
        
        if (data.payment_status === "paid" || data.status === "paid") {
          clearInterval(interval);
          setIsPolling(false);
          setPaymentStatus("success");
          setShowModal(false);
          if (onPaymentSuccess) onPaymentSuccess();
        } else if (data.status === "failed") {
          clearInterval(interval);
          setIsPolling(false);
          setPaymentStatus("error");
          setErrorMessage("Payment failed. Please try again.");
        }
      } catch (e) {
        console.error("Polling error:", e);
      }
    }, 5000); // Poll every 5 seconds

    // Stop polling after 10 minutes (safety)
    setTimeout(() => {
      clearInterval(interval);
      setIsPolling(false);
    }, 600000);
  };

  const handlePayment = async (plan: typeof PLANS[0]) => {
    try {
      setLoadingPlan(plan.id);
      setPaymentStatus("idle");
      setErrorMessage("");

      // Step 1: Create FamGateway Order
      const orderResponse = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: plan.price * 100, // Pass amount in paise
          receipt: "receipt_" + Date.now(),
        }),
      });

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json();
        throw new Error(errorData.error || "Failed to create order");
      }

      const orderData = await orderResponse.json();

      if (orderData.checkout_url) {
        setCurrentOrderId(orderData.order_id);
        // Step 2: Redirect to FamGateway Hosted Checkout
        // We open it in a new tab so the user can come back to this page
        window.open(orderData.checkout_url, "_blank");
        
        // Step 3: Start polling for status
        pollOrderStatus(orderData.order_id);
        
        setToastMessage("Redirected to Payment Gateway. Please complete the payment in the new tab.");
        setTimeout(() => setToastMessage(null), 5000);
      } else {
        throw new Error("Invalid response from payment gateway");
      }

    } catch (err: any) {
      setPaymentStatus("error");
      setErrorMessage(err.message || "Something went wrong");
    } finally {
      setLoadingPlan(null);
    }
  };
 
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  return (
    <>
      <div className="flex flex-col items-center relative">
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-violet-600 to-pink-600 text-white rounded-full text-[10px] sm:text-xs font-medium hover:opacity-90 transition-opacity whitespace-nowrap"
          >
            <Star size={12} className="fill-white" />
            Upgrade to Premium
          </button>
          
          {paymentStatus === "error" && !showModal && (
            <div className="absolute top-12 text-red-400 text-[10px] px-2 py-1 bg-red-500/10 rounded border border-red-500/20 whitespace-nowrap z-50">
              {errorMessage}
            </div>
          )}
        </div>
      </div>

      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {showModal && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowModal(false)}
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-4xl bg-[#111] border border-white/10 rounded-3xl p-5 md:p-8 shadow-2xl overflow-hidden flex flex-col max-h-[95vh] mx-auto z-10"
              >
                <button 
                  onClick={() => setShowModal(false)}
                  className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors z-20"
                >
                  <X size={20} />
                </button>

                <div className="text-center mb-6 shrink-0 mt-2">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-violet-500 to-pink-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-violet-500/20">
                    <Star size={24} className="text-white fill-white" />
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 font-serif tracking-tight">Choose Your Plan</h2>
                  <p className="text-white/60 text-sm max-w-sm mx-auto px-4">Unlock Physiological mode and premium features tailored for you.</p>
                </div>

                {paymentStatus === "error" && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs text-center shrink-0">
                    {errorMessage}
                  </div>
                )}

                <div className="overflow-y-auto px-1 pb-6 custom-scrollbar">
                  <div className="flex flex-wrap justify-center gap-6">
                    {PLANS.map((plan) => (
                      <div 
                        key={plan.id}
                        className={`relative flex flex-col p-6 rounded-2xl border transition-all duration-300 w-full sm:w-[280px] min-h-[380px] ${
                          plan.popular 
                            ? "border-violet-500 bg-violet-500/10 shadow-[0_0_25px_rgba(139,92,246,0.2)] ring-1 ring-violet-500/50" 
                            : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
                        }`}
                      >
                        {plan.popular && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-violet-600 text-white text-[10px] font-extrabold rounded-full uppercase tracking-wider whitespace-nowrap shadow-xl z-10 ring-2 ring-violet-400/30">
                            Most Popular
                          </div>
                        )}
                        
                        <div className="mb-6 mt-2">
                          <h3 className="text-white/60 text-[10px] font-bold uppercase tracking-[0.2em] mb-2">{plan.name}</h3>
                          <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-bold text-white tracking-tighter">₹{plan.price}</span>
                            <span className="text-white/40 text-sm">/{plan.duration}</span>
                          </div>
                        </div>
   
                        <div className="space-y-4 mb-8 flex-1">
                          {[
                            "Physiological Mode",
                            "Emotional Analytics",
                            "Priority Support",
                            "Studio Access"
                          ].map((feature, idx) => (
                            <div key={idx} className="flex items-center gap-3 text-sm text-white/80">
                              <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                                <Check size={12} className="text-green-400" />
                              </div>
                              <span className="leading-tight">{feature}</span>
                            </div>
                          ))}
                        </div>
   
                        <button
                          onClick={() => handlePayment(plan)}
                          disabled={loadingPlan !== null}
                          className={`w-full py-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] mt-auto ${
                            plan.popular 
                              ? "bg-violet-600 text-white hover:bg-violet-500 shadow-lg shadow-violet-500/40" 
                              : "bg-white/10 text-white hover:bg-white/20 border border-white/5"
                          } disabled:opacity-50`}
                        >
                          {loadingPlan === plan.id ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : (
                            "Select Plan"
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 20, x: "-50%" }}
            className="fixed bottom-10 left-1/2 z-[10001] px-6 py-3 bg-violet-600 text-white text-sm font-medium rounded-2xl shadow-2xl whitespace-nowrap text-center flex items-center gap-3 border border-white/20"
          >
            <Loader2 size={16} className="animate-spin" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {isPolling && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[10001] px-4 py-2 bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs rounded-full backdrop-blur-md flex items-center gap-2">
          <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
          Waiting for payment confirmation...
        </div>
      )}
    </>
  );
}
