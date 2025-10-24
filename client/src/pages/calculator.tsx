import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Ruler, CircleDot, Square, Sparkles, Plus, Minus, Upload, Info } from "lucide-react";

const calculatorSchema = z.object({
  widthFeet: z.number().int().min(2, "Minimum 2 feet").max(40, "Maximum 40 feet").optional(),
  widthInches: z.number().int().min(0, "Minimum 0 inches").max(11, "Maximum 11 inches").optional(),
  lengthFeet: z.number().int().min(2, "Minimum 2 feet").max(40, "Maximum 40 feet").optional(),
  lengthInches: z.number().int().min(0, "Minimum 0 inches").max(11, "Maximum 11 inches").optional(),
  sizeFeet: z.number().int().min(2, "Minimum 2 feet").max(40, "Maximum 40 feet").optional(),
  sizeInches: z.number().int().min(0, "Minimum 0 inches").max(11, "Maximum 11 inches").optional(),
  radiusFeet: z.number().int().min(1, "Minimum 1 foot").max(20, "Maximum 20 feet").optional(),
  radiusInches: z.number().int().min(0, "Minimum 0 inches").max(11, "Maximum 11 inches").optional(),
  thickness: z.enum(["thin", "thick"]),
  shape: z.enum(["rectangle", "round", "square", "freeform"]),
  quantity: z.number().min(1).default(1),
  projectName: z.string().optional(),
  installLocation: z.string().optional(),
  poNumber: z.string().optional(),
  clientName: z.string().optional(),
  notes: z.string().optional(),
  freeformMessage: z.string().optional(),
  freeformImage: z.any().optional(),
}).refine((data) => {
  // Rectangle requires width and length
  if (data.shape === "rectangle") {
    return data.widthFeet !== undefined && data.widthFeet >= 2 && data.lengthFeet !== undefined && data.lengthFeet >= 2;
  }
  // Square requires size
  if (data.shape === "square") {
    return data.sizeFeet !== undefined && data.sizeFeet >= 2;
  }
  // Round requires radius
  if (data.shape === "round") {
    return data.radiusFeet !== undefined && data.radiusFeet >= 1;
  }
  // Freeform doesn't require dimensions
  return true;
}, {
  message: "Please enter valid dimensions for the selected shape",
  path: ["shape"],
});

type CalculatorFormData = z.infer<typeof calculatorSchema>;

// Shape images for header - use relative paths
const shapeImages: Record<string, string> = {
    rectangle: '/brand/rectangle.png',
    square: '/brand/square.png',
    round: '/brand/round.png',
    freeform: '/brand/freeform.png',
  };

export default function Calculator() {
  const { toast } = useToast();
  const [priceData, setPriceData] = useState<any>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  const form = useForm<CalculatorFormData>({
    resolver: zodResolver(calculatorSchema),
    defaultValues: {
      widthFeet: 8,
      widthInches: 0,
      lengthFeet: 10,
      lengthInches: 0,
      sizeFeet: 8,
      sizeInches: 0,
      radiusFeet: 5,
      radiusInches: 0,
      thickness: "thin",
      shape: "rectangle",
      quantity: 1,
      projectName: "",
      installLocation: "",
      poNumber: "",
      clientName: "",
      notes: "",
      freeformMessage: "",
    },
  });

  const shape = form.watch("shape");
  const widthFeet = form.watch("widthFeet");
  const widthInches = form.watch("widthInches");
  const lengthFeet = form.watch("lengthFeet");
  const lengthInches = form.watch("lengthInches");
  const sizeFeet = form.watch("sizeFeet");
  const sizeInches = form.watch("sizeInches");
  const radiusFeet = form.watch("radiusFeet");
  const radiusInches = form.watch("radiusInches");
  const thickness = form.watch("thickness");
  const quantity = form.watch("quantity");

  // Calculate decimal dimensions from feet and inches
  const width = (widthFeet || 0) + (widthInches || 0) / 12;
  const length = (lengthFeet || 0) + (lengthInches || 0) / 12;
  const size = (sizeFeet || 0) + (sizeInches || 0) / 12;
  const radius = (radiusFeet || 0) + (radiusInches || 0) / 12;

  // Calculate price in real-time (not for freeform)
  const calculateMutation = useMutation({
    mutationFn: async (data: { width: number; length: number; thickness: string; quantity: number }) => {
      const res = await apiRequest("POST", "/api/calculator/calculate", data);
      return await res.json();
    },
    onSuccess: (data) => {
      setPriceData(data);
    },
  });

  // Trigger calculation when dimensions change (but not for freeform)
  useEffect(() => {
    if (shape === "freeform") {
      setPriceData(null);
      return;
    }

    let calculationWidth = 0;
    let calculationLength = 0;

    if (shape === "rectangle" && width && length) {
      calculationWidth = width;
      calculationLength = length;
    } else if (shape === "square" && size) {
      calculationWidth = size;
      calculationLength = size;
    } else if (shape === "round" && radius) {
      // For round, use diameter as both width and length
      calculationWidth = radius * 2;
      calculationLength = radius * 2;
    }

    if (calculationWidth && calculationLength) {
      calculateMutation.mutate({ 
        width: calculationWidth, 
        length: calculationLength, 
        thickness, 
        quantity 
      });
    }
  }, [shape, width, length, size, radius, thickness, quantity]);

  // Save quote
  const saveQuoteMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/calculator/quote", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Quote Saved",
        description: "Your calculator quote has been saved.",
      });
    },
  });

  // Submit freeform request
  const submitFreeformMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/freeform-request", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Request Submitted",
        description: "We'll contact you soon to discuss your custom rug pad!",
      });
    },
  });

  // Variant ID mapping (from product JSON)
  const getVariantId = (thickness: string, shape: string): string => {
    const variantMap: Record<string, Record<string, string>> = {
      thin: {
        rectangle: "gid://shopify/ProductVariant/46989691683051",
        round: "gid://shopify/ProductVariant/46989691715819",
        square: "gid://shopify/ProductVariant/46989691748587",
        freeform: "gid://shopify/ProductVariant/46989691781355",
      },
      thick: {
        rectangle: "gid://shopify/ProductVariant/46989691814123",
        round: "gid://shopify/ProductVariant/46989691846891",
        square: "gid://shopify/ProductVariant/46989691879659",
        freeform: "gid://shopify/ProductVariant/46989691912427",
      },
    };
    return variantMap[thickness]?.[shape] || variantMap.thin.rectangle;
  };

  // Create draft order
  const createDraftOrderMutation = useMutation({
    mutationFn: async (quoteId: string) => {
      const values = form.getValues();
      const variantId = getVariantId(values.thickness, values.shape);
      
      const lineItems = [
        {
          variantId,
          quantity: values.quantity || 1,
          customAttributes: [
            { key: "Width", value: `${widthFeet}'${widthInches}"` },
            { key: "Length", value: `${lengthFeet}'${lengthInches}"` },
            { key: "Thickness", value: values.thickness === "thin" ? "⅛ inch" : "¼ inch" },
            { key: "Shape", value: values.shape },
            { key: "Project Name", value: values.projectName || "N/A" },
            { key: "Install Location", value: values.installLocation || "N/A" },
          ],
        },
      ];

      const res = await apiRequest("POST", "/api/draft-order", { 
        calculatorQuoteId: quoteId,
        lineItems,
        customerEmail: values.clientName ? `${values.clientName.replace(/\s+/g, "").toLowerCase()}@placeholder.com` : "noreply@underitall.com",
        note: `Calculator Quote: ${quoteId}\nPO: ${values.poNumber || "N/A"}`,
      });
      return await res.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Draft Order Created",
        description: "Your Shopify draft order has been created successfully.",
      });
      if (data.invoiceUrl) {
        window.open(data.invoiceUrl, "_blank");
      }
    },
  });

  const handleSaveQuote = async () => {
    const values = form.getValues();
    if (!priceData) {
      toast({
        title: "Calculate First",
        description: "Please calculate a price before saving.",
        variant: "destructive",
      });
      return;
    }

    let quoteWidth = 0;
    let quoteLength = 0;

    if (shape === "rectangle") {
      quoteWidth = width;
      quoteLength = length;
    } else if (shape === "square") {
      quoteWidth = size;
      quoteLength = size;
    } else if (shape === "round") {
      quoteWidth = radius * 2;
      quoteLength = radius * 2;
    }

    const quoteData = {
      width: String(quoteWidth),
      length: String(quoteLength),
      shape: values.shape,
      thickness: values.thickness,
      area: String(priceData.area),
      pricePerSqFt: String(priceData.pricePerSqFt),
      totalPrice: String(priceData.total),
      quantity: values.quantity,
      projectName: values.projectName || "not provided",
      installLocation: values.installLocation || "not provided",
      poNumber: values.poNumber || "not provided",
      clientName: values.clientName,
      notes: values.notes,
    };

    const savedQuote = await saveQuoteMutation.mutateAsync(quoteData);
    return savedQuote;
  };

  const handleCreateDraftOrder = async () => {
    const savedQuote: any = await handleSaveQuote();
    if (savedQuote?.id) {
      createDraftOrderMutation.mutate(savedQuote.id);
    }
  };

  const handleFreeformSubmit = async () => {
    const values = form.getValues();
    const freeformData = {
      message: values.freeformMessage,
      projectName: values.projectName,
      clientName: values.clientName,
      notes: values.notes,
      image: uploadedImage,
    };

    await submitFreeformMutation.mutateAsync(freeformData);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const shapeIcons = {
    rectangle: Ruler,
    round: CircleDot,
    square: Square,
    freeform: Sparkles,
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(48,21%,95%)] to-[hsl(60,5%,88%)]">
      {/* Page Title */}
      <div className="bg-gradient-to-br from-[#F3F1E9] to-[#E1E0DA] py-8">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold mb-2 font-['Archivo']" style={{ color: '#212227' }}>
            Custom Rug Pad Calculator
          </h1>
          <p className="text-lg italic font-['Lora']" style={{ color: '#696A6D' }}>
            Get instant pricing for custom-sized perforated rug pads
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
          {/* Left Column - Input Form */}
          <div className="space-y-6">
            {/* Shape Selection - Always First */}
            <Card>
              <CardHeader>
                <CardTitle className="font-[Archivo]">Shape</CardTitle>
                <CardDescription>Select your rug pad shape</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <FormField
                    control={form.control}
                    name="shape"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="grid grid-cols-4 gap-2"
                          >
                            {(["rectangle", "square", "round", "freeform"] as const).map((shapeOption) => {
                              const Icon = shapeIcons[shapeOption];
                              return (
                                <div key={shapeOption}>
                                  <RadioGroupItem
                                    value={shapeOption}
                                    id={shapeOption}
                                    className="peer sr-only"
                                    data-testid={`radio-${shapeOption}`}
                                  />
                                  <Label
                                    htmlFor={shapeOption}
                                    className="flex flex-col items-center justify-center p-3 border-2 rounded-2xl cursor-pointer hover:border-[#F2633A] transition-all peer-data-[state=checked]:border-[#F2633A] peer-data-[state=checked]:bg-[#F2633A]/5"
                                    style={{ borderRadius: '16px' }}
                                  >
                                    <Icon className="w-6 h-6 mb-1" style={{ color: '#F2633A' }} />
                                    <span className="text-xs capitalize font-[Vazirmatn]">{shapeOption}</span>
                                  </Label>
                                </div>
                              );
                            })}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </Form>
              </CardContent>
            </Card>

            {/* Dimensions - Dynamic based on shape */}
            {shape !== "freeform" && (
              <Card>
                <CardHeader>
                  <CardTitle className="font-[Archivo]">Dimensions</CardTitle>
                  <CardDescription>
                    {shape === "rectangle" && "Enter width and length (2-40 feet)"}
                    {shape === "square" && "Enter size (2-40 feet)"}
                    {shape === "round" && "Enter radius (1-20 feet)"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Form {...form}>
                    {shape === "rectangle" && (
                      <div className="space-y-4">
                        {/* Width */}
                        <div>
                          <FormLabel className="font-['Vazirmatn']">Width</FormLabel>
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            <FormField
                              control={form.control}
                              name="widthFeet"
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <div className="relative">
                                      <Input
                                        type="number"
                                        step="1"
                                        min="2"
                                        max="40"
                                        placeholder="Feet"
                                        {...field}
                                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                        data-testid="input-width-feet"
                                        className="pr-8"
                                      />
                                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">ft</span>
                                    </div>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="widthInches"
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <div className="relative">
                                      <Input
                                        type="number"
                                        step="1"
                                        min="0"
                                        max="11"
                                        placeholder="Inches"
                                        {...field}
                                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                        data-testid="input-width-inches"
                                        className="pr-8"
                                      />
                                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">in</span>
                                    </div>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>

                        {/* Length */}
                        <div>
                          <FormLabel className="font-['Vazirmatn']">Length</FormLabel>
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            <FormField
                              control={form.control}
                              name="lengthFeet"
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <div className="relative">
                                      <Input
                                        type="number"
                                        step="1"
                                        min="2"
                                        max="40"
                                        placeholder="Feet"
                                        {...field}
                                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                        data-testid="input-length-feet"
                                        className="pr-8"
                                      />
                                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">ft</span>
                                    </div>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="lengthInches"
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <div className="relative">
                                      <Input
                                        type="number"
                                        step="1"
                                        min="0"
                                        max="11"
                                        placeholder="Inches"
                                        {...field}
                                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                        data-testid="input-length-inches"
                                        className="pr-8"
                                      />
                                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">in</span>
                                    </div>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {shape === "square" && (
                      <div>
                        <FormLabel className="font-['Vazirmatn']">Size</FormLabel>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <FormField
                            control={form.control}
                            name="sizeFeet"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <div className="relative">
                                    <Input
                                      type="number"
                                      step="1"
                                      min="2"
                                      max="40"
                                      placeholder="Feet"
                                      {...field}
                                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                      data-testid="input-size-feet"
                                      className="pr-8"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">ft</span>
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="sizeInches"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <div className="relative">
                                    <Input
                                      type="number"
                                      step="1"
                                      min="0"
                                      max="11"
                                      placeholder="Inches"
                                      {...field}
                                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                      data-testid="input-size-inches"
                                      className="pr-8"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">in</span>
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    )}

                    {shape === "round" && (
                      <div>
                        <FormLabel className="font-['Vazirmatn']">Radius</FormLabel>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <FormField
                            control={form.control}
                            name="radiusFeet"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <div className="relative">
                                    <Input
                                      type="number"
                                      step="1"
                                      min="1"
                                      max="20"
                                      placeholder="Feet"
                                      {...field}
                                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                      data-testid="input-radius-feet"
                                      className="pr-8"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">ft</span>
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="radiusInches"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <div className="relative">
                                    <Input
                                      type="number"
                                      step="1"
                                      min="0"
                                      max="11"
                                      placeholder="Inches"
                                      {...field}
                                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                      data-testid="input-radius-inches"
                                      className="pr-8"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">in</span>
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    )}
                  </Form>
                </CardContent>
              </Card>
            )}

            {/* Freeform Special Section */}
            {shape === "freeform" && (
              <Card className="border-2 border-[#F2633A]" style={{ borderRadius: '22px' }}>
                <CardHeader>
                  <CardTitle className="font-[Archivo]" style={{ color: '#F2633A' }}>Free Form is Fun!</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="bg-[#F3F1E9] p-6 rounded-2xl">
                    <p className="font-[Lora] italic text-[#696A6D] leading-relaxed">
                      To fully understand the details of your unique rug and to give you accurate pricing, we'll contact you via email or phone to discuss. We'll ask for dimensions and a trace of the rug perimeter or CAD diagram. We will work closely with you from measure to install.
                    </p>
                  </div>

                  <Form {...form}>
                    <FormField
                      control={form.control}
                      name="freeformMessage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tell us about your project</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Please describe your free-form rug pad requirements, approximate dimensions, any special considerations..." 
                              {...field} 
                              rows={5}
                              className="font-[Vazirmatn]"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-2">
                      <Label>Image Attachment (Optional)</Label>
                      <div className="border-2 border-dashed border-[#E1E0DA] rounded-2xl p-6 text-center hover:border-[#F2633A] transition-colors">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          id="image-upload"
                        />
                        <label htmlFor="image-upload" className="cursor-pointer">
                          {uploadedImage ? (
                            <div className="space-y-2">
                              <img src={uploadedImage} alt="Uploaded" className="max-h-48 mx-auto rounded-lg" />
                              <p className="text-sm text-[#696A6D]">Click to change image</p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <Upload className="w-8 h-8 mx-auto" style={{ color: '#F2633A' }} />
                              <p className="font-[Vazirmatn]" style={{ color: '#696A6D' }}>
                                Upload a trace, diagram, or photo of your rug
                              </p>
                              <p className="text-xs text-[#696A6D]">PNG, JPG, PDF up to 10MB</p>
                            </div>
                          )}
                        </label>
                      </div>
                    </div>
                  </Form>
                </CardContent>
              </Card>
            )}

            {/* Product Options - Only for non-freeform */}
            {shape !== "freeform" && (
              <Card>
                <CardHeader>
                  <CardTitle className="font-[Archivo]">Product Options</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Form {...form}>
                    <FormField
                      control={form.control}
                      name="thickness"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Thickness</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              value={field.value}
                              className="grid grid-cols-2 gap-4"
                            >
                              <div>
                                <RadioGroupItem
                                  value="thin"
                                  id="thin"
                                  className="peer sr-only"
                                  data-testid="radio-thin"
                                />
                                <Label
                                  htmlFor="thin"
                                  className="flex flex-col items-center justify-center p-4 border-2 rounded-2xl cursor-pointer hover:border-[#F2633A] transition-all peer-data-[state=checked]:border-[#F2633A] peer-data-[state=checked]:bg-[#F2633A]/5"
                                >
                                  <span className="font-semibold font-[Archivo]">Luxe Lite ⅛"</span>
                                  <span className="text-sm text-[#696A6D] font-[Vazirmatn]">Thin Profile</span>
                                </Label>
                              </div>
                              <div>
                                <RadioGroupItem
                                  value="thick"
                                  id="thick"
                                  className="peer sr-only"
                                  data-testid="radio-thick"
                                />
                                <Label
                                  htmlFor="thick"
                                  className="flex flex-col items-center justify-center p-4 border-2 rounded-2xl cursor-pointer hover:border-[#F2633A] transition-all peer-data-[state=checked]:border-[#F2633A] peer-data-[state=checked]:bg-[#F2633A]/5"
                                >
                                  <span className="font-semibold font-[Archivo]">Luxe ¼"</span>
                                  <span className="text-sm text-[#696A6D] font-[Vazirmatn]">Standard Cushion</span>
                                </Label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantity</FormLabel>
                          <FormControl>
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                onClick={() => field.onChange(Math.max(1, field.value - 1))}
                                data-testid="button-quantity-decrease"
                              >
                                <Minus className="w-4 h-4" />
                              </Button>
                              <Input
                                type="number"
                                min="1"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                className="text-center"
                                data-testid="input-quantity"
                              />
                              <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                onClick={() => field.onChange(field.value + 1)}
                                data-testid="button-quantity-increase"
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </Form>
                </CardContent>
              </Card>
            )}

            {/* Project Details (Optional) */}
            <Card>
              <CardHeader>
                <CardTitle className="font-[Archivo]">Project Details (Optional)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Form {...form}>
                  <FormField
                    control={form.control}
                    name="projectName"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center gap-2">
                          <FormLabel>Project Name/Sidemark</FormLabel>
                          <div className="group relative">
                            <Info className="w-4 h-4 text-[#696A6D] cursor-help" />
                            <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-50 w-64 p-2 text-xs bg-[#212227] text-white rounded-lg shadow-lg">
                              Any field left unfilled will show as "not provided"
                            </div>
                          </div>
                        </div>
                        <FormControl>
                          <Input placeholder="Example: Smith Project" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="installLocation"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center gap-2">
                          <FormLabel>Install Location</FormLabel>
                          <div className="group relative">
                            <Info className="w-4 h-4 text-[#696A6D] cursor-help" />
                            <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-50 w-64 p-2 text-xs bg-[#212227] text-white rounded-lg shadow-lg">
                              Any field left unfilled will show as "not provided"
                            </div>
                          </div>
                        </div>
                        <FormControl>
                          <Input placeholder="EX: Dining, Primary, Living Room" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="poNumber"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center gap-2">
                          <FormLabel>PO#</FormLabel>
                          <div className="group relative">
                            <Info className="w-4 h-4 text-[#696A6D] cursor-help" />
                            <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-50 w-64 p-2 text-xs bg-[#212227] text-white rounded-lg shadow-lg">
                              Any field left unfilled will show as "not provided"
                            </div>
                          </div>
                        </div>
                        <FormControl>
                          <Input placeholder="Not Required" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Additional requirements..." {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </Form>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Quote Preview or Freeform Submit */}
          <div className="lg:sticky lg:top-8 lg:self-start">
            <Card>
              <CardHeader>
                <CardTitle className="font-[Archivo]">
                  {shape === "freeform" ? "Submit Request" : "Quote Preview"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {shape === "freeform" ? (
                  <div className="space-y-4">
                    <div className="bg-[#F3F1E9] p-6 rounded-2xl text-center">
                      <Sparkles className="w-12 h-12 mx-auto mb-4" style={{ color: '#F2633A' }} />
                      <p className="font-[Lora] italic text-[#696A6D]">
                        We'll review your request and contact you within 1 business day to discuss your custom rug pad.
                      </p>
                    </div>

                    <Button
                      className="w-full"
                      onClick={handleFreeformSubmit}
                      disabled={submitFreeformMutation.isPending}
                      style={{ backgroundColor: '#F2633A' }}
                    >
                      {submitFreeformMutation.isPending ? "Submitting..." : "Submit Request"}
                    </Button>
                  </div>
                ) : priceData ? (
                  <>
                    <div className="text-center py-6 border-b">
                      <div className="text-5xl font-bold mb-2" style={{ color: '#F2633A' }} data-testid="text-total-price">
                        ${(priceData.grandTotal || priceData.total).toFixed(2)}
                      </div>
                      <div className="text-sm text-muted-foreground font-[Vazirmatn]">Total Price</div>
                    </div>

                    <div className="space-y-3 font-[Vazirmatn]">
                      <div className="flex justify-between items-center">
                        <span className="text-[#696A6D]">Dimensions</span>
                        <span className="font-medium" data-testid="text-dimensions">
                          {shape === "rectangle" && `${widthFeet || 0}'${widthInches || 0}" × ${lengthFeet || 0}'${lengthInches || 0}"`}
                          {shape === "square" && `${sizeFeet || 0}'${sizeInches || 0}" × ${sizeFeet || 0}'${sizeInches || 0}"`}
                          {shape === "round" && `${radiusFeet || 0}'${radiusInches || 0}" radius`}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[#696A6D]">Area</span>
                        <span className="font-medium" data-testid="text-area">{priceData.area.toFixed(2)} sq ft</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[#696A6D]">Thickness</span>
                        <span className="font-medium" data-testid="text-thickness">
                          {thickness === "thin" ? "⅛ inch" : "¼ inch"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[#696A6D]">Quantity</span>
                        <span className="font-medium" data-testid="text-quantity">{quantity}</span>
                      </div>
                    </div>

                    <div className="space-y-2 pt-4 border-t">
                      <p className="text-sm italic font-[Lora] text-[#696A6D]">
                        Premium perforated felt rug pad, custom-cut to your specifications
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Button
                        className="w-full"
                        onClick={handleSaveQuote}
                        disabled={saveQuoteMutation.isPending}
                        style={{ backgroundColor: '#F2633A' }}
                        data-testid="button-save-quote"
                      >
                        {saveQuoteMutation.isPending ? "Saving..." : "Save Quote"}
                      </Button>
                      <Button
                        className="w-full"
                        variant="outline"
                        onClick={handleCreateDraftOrder}
                        disabled={createDraftOrderMutation.isPending}
                        data-testid="button-create-draft-order"
                      >
                        {createDraftOrderMutation.isPending ? "Creating..." : "Create Draft Order"}
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 text-[#696A6D]">
                    <p className="font-[Vazirmatn]">Enter dimensions to calculate pricing</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}