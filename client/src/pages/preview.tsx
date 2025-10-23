import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import Calculator from "./calculator";
import WholesaleRegistration from "./wholesale-registration";

export default function Preview() {
  const [location] = useLocation();
  const [previewType, setPreviewType] = useState<string>("");

  useEffect(() => {
    // Parse the preview type from URL query params on mount and location change
    const params = new URLSearchParams(window.location.search);
    const type = params.get("type");
    setPreviewType(type || "");
  }, [location]); // Triggers when location pathname OR search params change

  // Render the appropriate component based on type, with key to force remount
  const renderPreview = () => {
    if (previewType === "calculator") {
      return <Calculator key="calculator" />;
    } else if (previewType === "registration") {
      return <WholesaleRegistration key="registration" />;
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-[#F3F1E9]">
      {renderPreview()}
    </div>
  );
}