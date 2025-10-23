import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertWholesaleRegistrationSchema } from "@shared/schema";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { CheckCircle2, Info, Sparkles } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const formSchema = z.object({
  firmName: z.string().min(1, "Firm name is required"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  title: z.string().optional(),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  website: z.string().optional(),
  instagramHandle: z.string().optional(),
  businessAddress: z.string().min(1, "Business address is required"),
  businessAddress2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zipCode: z.string().min(5, "ZIP code must be at least 5 digits"),
  businessType: z.string().min(1, "Business type is required"),
  yearsInBusiness: z.number().min(0, "Years in business cannot be negative"),
  isTaxExempt: z.boolean(),
  taxId: z.string().optional(),
  taxIdProofUrl: z.string().optional(),
  howDidYouHear: z.string().optional(),
  receivedSampleSet: z.boolean(),
});

export default function WholesaleRegistration() {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [einValidationError, setEinValidationError] = useState<string>("");
  const [enrichmentData, setEnrichmentData] = useState<any>(null);
  const [showEnrichmentModal, setShowEnrichmentModal] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firmName: "",
      firstName: "",
      lastName: "",
      title: "",
      email: "",
      phone: "",
      website: "",
      instagramHandle: "",
      businessAddress: "",
      businessAddress2: "",
      city: "",
      state: "",
      zipCode: "",
      businessType: "",
      yearsInBusiness: 0,
      isTaxExempt: false,
      taxId: "",
      taxIdProofUrl: "",
      howDidYouHear: "",
      receivedSampleSet: false,
    },
  });

  const isTaxExempt = form.watch("isTaxExempt");

  const validateEIN = (ein: string) => {
    console.log("🔍 EIN Validation triggered with value:", ein);

    if (!ein || ein.trim() === "" || ein.toUpperCase() === "NA") {
      console.log("✅ EIN is empty or NA - validation passed");
      setEinValidationError("");
      return;
    }

    // EIN format: XX-XXXXXXX (exactly 2 digits, dash, 7 digits)
    const einPattern = /^\d{2}-\d{7}$/;
    const trimmedEin = ein.trim();

    console.log("📝 Testing EIN format:", {
      originalValue: ein,
      trimmedValue: trimmedEin,
      pattern: "XX-XXXXXXX (2 digits, dash, 7 digits)",
      testResult: einPattern.test(trimmedEin)
    });

    if (!einPattern.test(trimmedEin)) {
      console.log("❌ EIN validation FAILED - Invalid format");
      setEinValidationError("Invalid EIN format. Must be XX-XXXXXXX (e.g., 12-3456789) or 'NA' if not applicable");
    } else {
      console.log("✅ EIN validation PASSED - Valid format");
      setEinValidationError("");
    }
  };

  const enrichCompanyData = async (companyName: string) => {
    console.log("🔍 Company enrichment triggered with:", companyName);

    if (!companyName || companyName.trim().length < 3) {
      console.log("⏭️ Skipping enrichment - company name too short or empty");
      return;
    }

    // Get current form values to check what's empty
    const currentWebsite = form.getValues("website");
    const currentInstagram = form.getValues("instagramHandle");
    const currentAddress = form.getValues("businessAddress");
    const currentAddress2 = form.getValues("businessAddress2");
    const currentCity = form.getValues("city");
    const currentState = form.getValues("state");
    const currentZip = form.getValues("zipCode");
    const currentPhone = form.getValues("phone");

    console.log("📋 Current field values:", {
      website: currentWebsite || "(empty)",
      instagram: currentInstagram || "(empty)",
      address: currentAddress || "(empty)",
      address2: currentAddress2 || "(empty)",
      city: currentCity || "(empty)",
      state: currentState || "(empty)",
      zip: currentZip || "(empty)",
      phone: currentPhone || "(empty)"
    });

    // Skip if all fields are already filled
    if (currentWebsite && currentInstagram && currentAddress && currentCity && currentState && currentZip && currentPhone) {
      console.log("⏭️ Skipping enrichment - all fields already filled");
      return;
    }

    console.log("🚀 Starting API enrichment request...");
    setIsEnriching(true);

    try {
      const res = await apiRequest("POST", "/api/enrich-company", {
        companyName: companyName.trim(),
      });

      console.log("📡 API Response status:", res.status);

      const data = await res.json();
      console.log("📦 API Response data:", data);

      // Check if we have any data to show
      const hasData = data.website || data.instagramHandle || data.businessAddress || 
                      data.city || data.state || data.zipCode || data.phone;

      if (hasData) {
        // Store enrichment data and show modal
        setEnrichmentData({
          data,
          currentValues: {
            website: currentWebsite,
            instagram: currentInstagram,
            address: currentAddress,
            address2: currentAddress2,
            city: currentCity,
            state: currentState,
            zip: currentZip,
            phone: currentPhone
          }
        });
        setShowEnrichmentModal(true);
        console.log("🔔 Showing enrichment confirmation modal");
      } else {
        console.log("ℹ️ No enrichment data found for this company");
      }
    } catch (error) {
      console.error("❌ Enrichment failed with error:", error);
      console.error("Error details:", {
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined
      });
    } finally {
      setIsEnriching(false);
      console.log("✅ Enrichment process complete");
    }
  };

  const submitMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      console.log("🚀 Submitting registration with data:", data);
      const res = await apiRequest("POST", "/api/wholesale-registration", data);
      
      if (!res.ok) {
        const errorData = await res.json();
        console.error("❌ Registration submission failed:", errorData);
        throw new Error(errorData.error || "Registration failed");
      }
      
      return await res.json();
    },
    onSuccess: (data) => {
      console.log("✅ Registration submitted successfully:", data);
      setSubmitted(true);
      toast({
        title: "Application Submitted",
        description: "Your wholesale registration has been submitted for review.",
      });
    },
    onError: (error: Error) => {
      console.error("❌ Registration error:", error);
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const applyEnrichmentData = () => {
    if (!enrichmentData) return;

    const { data, currentValues } = enrichmentData;
    let fieldsUpdated = 0;

    // Auto-fill website if empty
    if (data.website && !currentValues.website) {
      console.log("✅ Setting website:", data.website);
      form.setValue("website", data.website);
      fieldsUpdated++;
    }

    // Auto-fill Instagram if empty
    if (data.instagramHandle && !currentValues.instagram) {
      console.log("✅ Setting Instagram:", data.instagramHandle);
      form.setValue("instagramHandle", data.instagramHandle);
      fieldsUpdated++;
    }

    // Auto-fill business address if empty
    if (data.businessAddress && !currentValues.address) {
      console.log("✅ Setting business address:", data.businessAddress);
      form.setValue("businessAddress", data.businessAddress);
      fieldsUpdated++;
    }

    // Auto-fill business address 2 if empty
    if (data.businessAddress2 && !currentValues.address2) {
      console.log("✅ Setting business address 2:", data.businessAddress2);
      form.setValue("businessAddress2", data.businessAddress2);
      fieldsUpdated++;
    }

    // Auto-fill city if empty
    if (data.city && !currentValues.city) {
      console.log("✅ Setting city:", data.city);
      form.setValue("city", data.city);
      fieldsUpdated++;
    }

    // Auto-fill state if empty
    if (data.state && !currentValues.state) {
      console.log("✅ Setting state:", data.state);
      form.setValue("state", data.state);
      fieldsUpdated++;
    }

    // Auto-fill ZIP code if empty
    if (data.zipCode && !currentValues.zip) {
      console.log("✅ Setting ZIP code:", data.zipCode);
      form.setValue("zipCode", data.zipCode);
      fieldsUpdated++;
    }

    // Auto-fill phone if empty
    if (data.phone && !currentValues.phone) {
      console.log("✅ Setting phone:", data.phone);
      form.setValue("phone", data.phone);
      fieldsUpdated++;
    }

    setShowEnrichmentModal(false);
    setEnrichmentData(null);

    if (fieldsUpdated > 0) {
      console.log(`🎉 Enrichment applied - ${fieldsUpdated} fields auto-filled`);
      toast({
        title: "Company info applied!",
        description: `We've auto-filled ${fieldsUpdated} field${fieldsUpdated > 1 ? 's' : ''} for you.`,
      });
    }
  };

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    console.log("📝 Form submission data:", data);
    submitMutation.mutate(data);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#F3F1E9] flex items-center justify-center p-6">
        <Card className="max-w-2xl w-full rounded-[16px]">
          <CardContent className="pt-12 pb-12 text-center">
            <CheckCircle2 className="w-20 h-20 mx-auto mb-6 text-[#F2633A]" data-testid="icon-success" />
            <h1 className="text-3xl font-bold mb-4 font-['Archivo'] text-[#212227]" data-testid="text-success-title">
              Application Submitted
            </h1>
            <p className="text-lg text-[#696A6D] mb-8 font-['Vazirmatn']" data-testid="text-success-message">
              Thank you for applying to our trade program. We'll review your application and get back to you within 2-3 business days.
            </p>
            <div className="space-y-4 text-left max-w-md mx-auto">
              <div className="flex items-start gap-4">
                <div className="bg-[#F2633A] text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-semibold font-['Vazirmatn']">
                  1
                </div>
                <div>
                  <h3 className="font-semibold font-['Archivo'] text-[#212227]">Application Review</h3>
                  <p className="text-sm text-[#696A6D] font-['Vazirmatn']">Our team will verify your credentials</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="bg-[#F2633A] text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-semibold font-['Vazirmatn']">
                  2
                </div>
                <div>
                  <h3 className="font-semibold font-['Archivo'] text-[#212227]">Email Confirmation</h3>
                  <p className="text-sm text-[#696A6D] font-['Vazirmatn']">You'll receive approval via email</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="bg-[#F2633A] text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-semibold font-['Vazirmatn']">
                  3
                </div>
                <div>
                  <h3 className="font-semibold font-['Archivo'] text-[#212227]">Start Ordering</h3>
                  <p className="text-sm text-[#696A6D] font-['Vazirmatn']">Access wholesale pricing and custom orders</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      {/* Enrichment Confirmation Modal */}
      <Dialog open={showEnrichmentModal} onOpenChange={setShowEnrichmentModal}>
        <DialogContent className="rounded-[16px] max-w-md">
          <DialogHeader>
            <DialogTitle className="font-['Archivo'] text-[#212227] flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#F2633A]" />
              Company Match Found!
            </DialogTitle>
            <DialogDescription className="font-['Vazirmatn'] text-[#696A6D]">
              We found information for this company. Would you like us to auto-fill the following fields?
            </DialogDescription>
          </DialogHeader>

          {enrichmentData && (
            <div className="space-y-3 py-4">
              {enrichmentData.data.website && !enrichmentData.currentValues.website && (
                <div className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-[#7e8d76] mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-semibold font-['Vazirmatn'] text-[#212227]">Website:</span>{" "}
                    <span className="font-['Vazirmatn'] text-[#696A6D]">{enrichmentData.data.website}</span>
                  </div>
                </div>
              )}
              {enrichmentData.data.instagramHandle && !enrichmentData.currentValues.instagram && (
                <div className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-[#7e8d76] mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-semibold font-['Vazirmatn'] text-[#212227]">Instagram:</span>{" "}
                    <span className="font-['Vazirmatn'] text-[#696A6D]">{enrichmentData.data.instagramHandle}</span>
                  </div>
                </div>
              )}
              {enrichmentData.data.businessAddress && !enrichmentData.currentValues.address && (
                <div className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-[#7e8d76] mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-semibold font-['Vazirmatn'] text-[#212227]">Address:</span>{" "}
                    <span className="font-['Vazirmatn'] text-[#696A6D]">{enrichmentData.data.businessAddress}</span>
                  </div>
                </div>
              )}
              {enrichmentData.data.businessAddress2 && !enrichmentData.currentValues.address2 && (
                <div className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-[#7e8d76] mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-semibold font-['Vazirmatn'] text-[#212227]">Suite/Unit:</span>{" "}
                    <span className="font-['Vazirmatn'] text-[#696A6D]">{enrichmentData.data.businessAddress2}</span>
                  </div>
                </div>
              )}
              {enrichmentData.data.city && !enrichmentData.currentValues.city && (
                <div className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-[#7e8d76] mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-semibold font-['Vazirmatn'] text-[#212227]">City:</span>{" "}
                    <span className="font-['Vazirmatn'] text-[#696A6D]">{enrichmentData.data.city}</span>
                  </div>
                </div>
              )}
              {enrichmentData.data.state && !enrichmentData.currentValues.state && (
                <div className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-[#7e8d76] mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-semibold font-['Vazirmatn'] text-[#212227]">State:</span>{" "}
                    <span className="font-['Vazirmatn'] text-[#696A6D]">{enrichmentData.data.state}</span>
                  </div>
                </div>
              )}
              {enrichmentData.data.zipCode && !enrichmentData.currentValues.zip && (
                <div className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-[#7e8d76] mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-semibold font-['Vazirmatn'] text-[#212227]">ZIP Code:</span>{" "}
                    <span className="font-['Vazirmatn'] text-[#696A6D]">{enrichmentData.data.zipCode}</span>
                  </div>
                </div>
              )}
              {enrichmentData.data.phone && !enrichmentData.currentValues.phone && (
                <div className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-[#7e8d76] mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-semibold font-['Vazirmatn'] text-[#212227]">Phone:</span>{" "}
                    <span className="font-['Vazirmatn'] text-[#696A6D]">{enrichmentData.data.phone}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEnrichmentModal(false);
                setEnrichmentData(null);
              }}
              className="rounded-[11px] font-['Vazirmatn']"
            >
              No Thanks
            </Button>
            <Button
              onClick={applyEnrichmentData}
              className="bg-[#F2633A] hover:bg-[#F2633A]/90 text-white rounded-[11px] font-['Vazirmatn']"
            >
              Auto-Fill
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="min-h-screen bg-[#F3F1E9]">
        <div className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="text-center mb-12">
          <img
            src="https://join.itsunderitall.com/brand/logo-main.png"
            alt="UnderItAll Logo"
            className="h-16 mx-auto mb-6"
          />
          <h1 className="text-3xl font-['Archivo'] text-[#7e8d76] mb-4" data-testid="text-page-title">
            Join Our Trade Program
          </h1>
        </div>

        <Card className="rounded-[16px]">
          <CardHeader>
            <CardTitle className="text-2xl font-['Archivo'] text-[#212227]">Create Account</CardTitle>
            <CardDescription className="font-['Vazirmatn'] text-[#696A6D] leading-snug">
              Becoming a trade member takes less than one minute and opens the door to exclusive pricing, custom rug pad options, and resources built for design professionals.  We're trade only, which means all accounts require verified business details before purchasing. Registration is quick, easy and absolutely worth it.  Enter your info, upload your resale certificate and start shopping.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold font-['Archivo'] text-[#212227]">Business Information</h3>

                  <FormField
                    control={form.control}
                    name="firmName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-['Vazirmatn'] text-[#212227] flex items-center gap-2">
                          Company Name
                          {isEnriching && <Sparkles className="w-4 h-4 text-[#F2633A] animate-pulse" />}
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Your Company Name"
                            {...field}
                            onBlur={() => enrichCompanyData(field.value)}
                            data-testid="input-firm-name"
                            className="rounded-[11px] font-['Vazirmatn']"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-['Vazirmatn'] text-[#212227]">First Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John" {...field} data-testid="input-first-name" className="rounded-[11px] font-['Vazirmatn']" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-['Vazirmatn'] text-[#212227]">Last Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Doe" {...field} data-testid="input-last-name" className="rounded-[11px] font-['Vazirmatn']" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-['Vazirmatn'] text-[#212227]">Title (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. CEO, Sales Director" {...field} value={field.value ?? ""} data-testid="input-title" className="rounded-[11px] font-['Vazirmatn']" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-['Vazirmatn'] text-[#212227]">Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="john@yourcompany.com" {...field} data-testid="input-email" className="rounded-[11px] font-['Vazirmatn']" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-['Vazirmatn'] text-[#212227]">Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="(555) 123-4567" {...field} data-testid="input-phone" className="rounded-[11px] font-['Vazirmatn']" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-['Vazirmatn'] text-[#212227]">Website (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="https://yourcompany.com" {...field} value={field.value ?? ""} data-testid="input-website" className="rounded-[11px] font-['Vazirmatn']" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="instagramHandle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-['Vazirmatn'] text-[#212227]">Instagram Handle (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="@yourcompany" {...field} value={field.value ?? ""} data-testid="input-instagram" className="rounded-[11px] font-['Vazirmatn']" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="businessAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-['Vazirmatn'] text-[#212227]">Business Address</FormLabel>
                        <FormControl>
                          <Input placeholder="123 Main Street" {...field} data-testid="input-business-address" className="rounded-[11px] font-['Vazirmatn']" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="businessAddress2"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-['Vazirmatn'] text-[#212227]">Suite / Unit # (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Suite 100" {...field} value={field.value ?? ""} data-testid="input-business-address2" className="rounded-[11px] font-['Vazirmatn']" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-['Vazirmatn'] text-[#212227]">City</FormLabel>
                          <FormControl>
                            <Input placeholder="New York" {...field} data-testid="input-city" className="rounded-[11px] font-['Vazirmatn']" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-['Vazirmatn'] text-[#212227]">State</FormLabel>
                          <FormControl>
                            <Input placeholder="NY" {...field} data-testid="input-state" className="rounded-[11px] font-['Vazirmatn']" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="zipCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-['Vazirmatn'] text-[#212227]">ZIP Code</FormLabel>
                          <FormControl>
                            <Input placeholder="10001" {...field} data-testid="input-zip" className="rounded-[11px] font-['Vazirmatn']" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold font-['Archivo'] text-[#212227]">Trade Credentials</h3>

                  <FormField
                    control={form.control}
                    name="businessType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-['Vazirmatn'] text-[#212227]">Business Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-business-type" className="rounded-[11px] font-['Vazirmatn']">
                              <SelectValue placeholder="Select business type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="interior_designer_solo">Interior Designer - Solopreneur</SelectItem>
                            <SelectItem value="interior_design_firm_2_5">Interior Design Firm - 2-5 ppl</SelectItem>
                            <SelectItem value="interior_design_firm_5_plus">Interior Design Firm - 5+ ppl</SelectItem>
                            <SelectItem value="design_with_retail">Design with Retail</SelectItem>
                            <SelectItem value="trade_showroom">To-the-Trade Multi-Line Showroom</SelectItem>
                            <SelectItem value="architecture_firm">Architecture Firm (A&D)</SelectItem>
                            <SelectItem value="furniture_retailer">Furniture Retailer - Brick & Mortar</SelectItem>
                            <SelectItem value="ecommerce">E-Comm</SelectItem>
                            <SelectItem value="home_stager">Home Stager / Staging Company</SelectItem>
                            <SelectItem value="specialty_rug_retail">Specialty Retail Location - Rugs</SelectItem>
                            <SelectItem value="receiving_warehousing">Recieving / Warehousing / White-Glove Install</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="taxId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-['Vazirmatn'] text-[#212227] flex items-center gap-2">
                          VAT / Tax ID (EIN)
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="w-4 h-4 text-[#696A6D] cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-md p-4">
                                <div className="space-y-3 text-sm">
                                  <div>
                                    <strong className="text-[#F2633A]">U.S. Businesses:</strong>
                                    <p className="mt-1">EIN issued by the IRS. Accepted proof: EIN Confirmation Letter (CP 575), EIN Verification Letter (LTR-147C), or prior year's tax return.</p>
                                  </div>
                                  <div>
                                    <strong className="text-[#F2633A]">U.K. Businesses:</strong>
                                    <p className="mt-1">VAT registration certificate from HMRC. Access online via Government Gateway or download from your HMRC account.</p>
                                  </div>
                                  <div>
                                    <strong className="text-[#F2633A]">EU Businesses:</strong>
                                    <p className="mt-1">VAT identification number (VATIN) from your local tax authority. Download certificate from tax authority portal or verify via VIES.</p>
                                  </div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter your EIN or VAT ID, or type 'NA' if not applicable"
                            {...field}
                            value={field.value ?? ""}
                            onBlur={() => validateEIN(field.value ?? "")}
                            data-testid="input-tax-id"
                            className="rounded-[11px] font-['Vazirmatn']"
                          />
                        </FormControl>
                        {einValidationError && (
                          <p className="text-sm text-[#F2633A] font-['Vazirmatn'] mt-1">
                            {einValidationError}
                          </p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="taxIdProofUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-['Vazirmatn'] text-[#212227]">Sales Tax Exemption</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  field.onChange(`uploaded_${file.name}`);
                                }
                              }}
                              data-testid="input-tax-proof"
                              className="hidden"
                              id="tax-proof-upload"
                            />
                            <label
                              htmlFor="tax-proof-upload"
                              className="inline-flex items-center justify-center px-4 py-3 bg-[#7e8d76] hover:bg-[#6d7a66] text-white font-['Vazirmatn'] font-medium rounded-[11px] cursor-pointer transition-colors"
                            >
                              Choose File
                            </label>
                            {field.value && (
                              <span className="ml-3 text-sm text-[#696A6D] font-['Vazirmatn']">
                                {field.value.replace('uploaded_', '')}
                              </span>
                            )}
                          </div>
                        </FormControl>
                        <FormDescription className="font-['Vazirmatn'] text-[#696A6D]">
                          Upload a copy of your state issued resale certificate (PDF, JPG, or PNG) 50MB Max
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold font-['Archivo'] text-[#212227]">Additional Information</h3>

                  <FormField
                    control={form.control}
                    name="howDidYouHear"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-['Lora'] italic text-[#212227]">We're dying to know how you found us or heard about us.</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Tell us how you discovered UnderItAll... Sales Rep, Online Search, Social Media, etc."
                            {...field}
                            value={field.value ?? ""}
                            data-testid="textarea-how-hear"
                            className="rounded-[11px] font-['Vazirmatn'] min-h-[100px]"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="receivedSampleSet"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-['Vazirmatn'] text-[#212227]">Did you receive a sample set from your representative?</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={(value) => field.onChange(value === "yes")}
                            value={field.value ? "yes" : "no"}
                            className="flex gap-4"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="yes" id="sample-yes" />
                              <Label htmlFor="sample-yes" className="font-['Vazirmatn'] cursor-pointer">Yes</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="no" id="sample-no" />
                              <Label htmlFor="sample-no" className="font-['Vazirmatn'] cursor-pointer">No</Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-[#F2633A] hover:bg-[#F2633A]/90 text-white rounded-[11px] font-['Vazirmatn'] font-medium border border-[#7e8d76]"
                  disabled={submitMutation.isPending}
                  data-testid="button-submit"
                >
                  {submitMutation.isPending ? "Submitting..." : "Submit Application"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
    </>
  );
}