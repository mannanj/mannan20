"use client";

import { useState } from "react";
import { useApp } from "@/context/app-context";

const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
const PLACEHOLDER = "Your name, email, or why you're reaching out";

interface ContactFormProps {
  onSubmit: (userInput: string) => void;
}

export function ContactForm({ onSubmit }: ContactFormProps) {
  const { state, setContactUserInput } = useApp();
  const userInput = state.contactUserInput;
  const [isLoading, setIsLoading] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [emailError, setEmailError] = useState("");

  const hasEmailInInput = () => userInput.trim().includes("@");

  const isValidEmail = (email: string) => EMAIL_REGEX.test(email.trim());

  const validateInput = () => {
    const trimmed = userInput.trim();
    if (hasEmailInInput()) {
      const emailMatch = trimmed.match(/\S+@\S+/);
      if (emailMatch && !isValidEmail(emailMatch[0])) {
        setEmailError("Please enter a valid email address");
        return;
      }
    }
    setEmailError("");
  };

  const isValid = () => {
    const trimmed = userInput.trim();
    if (hasEmailInInput()) {
      const emailMatch = trimmed.match(/\S+@\S+/);
      if (emailMatch) {
        return isValidEmail(emailMatch[0]);
      }
      return false;
    }
    const words = trimmed.split(/\s+/).filter((word) => word.length > 0);
    return words.length >= 2;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    validateInput();
    if (!isValid() || emailError) return;
    setIsLoading(true);
    onSubmit(userInput);
  };

  return (
    <form onSubmit={handleSubmit}>
      <textarea
        value={userInput}
        onChange={(e) => setContactUserInput(e.target.value)}
        rows={3}
        className="w-full py-2 px-3 border border-[#333] rounded-lg text-xs text-white bg-[#111] transition-all duration-200 box-border resize-y font-[inherit] leading-normal placeholder:text-[#555] focus:outline-none focus:border-[#039be5] disabled:opacity-60 disabled:cursor-not-allowed"
        placeholder={PLACEHOLDER}
        disabled={isLoading}
        onBlur={validateInput}
      />

      {emailError && (
        <div className="text-red-500 text-sm mt-2 ml-1">{emailError}</div>
      )}

      <div className="mt-2 relative">
        <button
          type="submit"
          className="w-full py-2 px-4 rounded-lg text-xs font-medium cursor-pointer transition-all duration-200 !border !border-[#333] hover:!border-[#039be5] !bg-white !text-black hover:!bg-[#f0f0f0] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed !shadow-none !normal-case !mt-0 focus:outline-none focus:!border-[#039be5]"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          {isLoading ? "Loading..." : "Continue"}
        </button>
        {showTooltip && !isValid() && (
          <div className="tooltip">Include a name, email, or reason</div>
        )}
      </div>

      <p className="m-0 mt-2 p-0 !text-[0.625rem] leading-normal !text-[#444] !font-light text-center">
        No unsolicited outreach — ever.
      </p>
    </form>
  );
}
