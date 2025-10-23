import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Users, Calculator, FileText, CheckCircle, XCircle, Clock, ExternalLink, Settings, CheckCircle2, ChevronDown, Building2, Mail, Phone, MapPin, Globe, Instagram, Calendar, FileCheck } from "lucide-react";
import { format } from "date-fns";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// Global styles for inputs
const globalInputStyles = "border-[#7e8d76] font-['Lora_Italic'] placeholder:text-[#7e8d76]/70 focus:border-[#7e8d76] focus:ring-[#7e8d76]";

export default function Admin() {
  const { toast } = useToast();
  const [selectedRegistration, setSelectedRegistration] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const { data: registrations = [], isLoading: loadingRegistrations, refetch } = useQuery({
    queryKey: ["/api/wholesale-registrations"],
  }) as { data: any[]; isLoading: boolean, refetch: () => void };

  const { data: quotes = [], isLoading: loadingQuotes } = useQuery({
    queryKey: ["/api/calculator/quotes"],
  }) as { data: any[]; isLoading: boolean };

  const { data: draftOrders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ["/api/draft-orders"],
  }) as { data: any[]; isLoading: boolean };

  const updateRegistrationMutation = useMutation({
    mutationFn: async ({ id, status, adminNotes, rejectionReason }: any) => {
      const res = await apiRequest("PATCH", `/api/wholesale-registration/${id}`, { status, adminNotes, rejectionReason });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wholesale-registrations"] });
      setSelectedRegistration(null);
      setAdminNotes("");
      setRejectionReason("");
      setActionType(null);
      toast({
        title: "Registration Updated",
        description: "The registration status has been updated successfully.",
      });
    },
  });

  const handleApprove = (registration: any) => {
    setSelectedRegistration(registration);
    setActionType("approve");
  };

  const handleReject = (registration: any) => {
    setSelectedRegistration(registration);
    setActionType("reject");
  };

  const confirmAction = () => {
    if (!selectedRegistration || !actionType) return;

    updateRegistrationMutation.mutate({
      id: selectedRegistration.id,
      status: actionType === "approve" ? "approved" : "rejected",
      adminNotes,
      rejectionReason: actionType === "reject" ? rejectionReason : undefined,
    });
  };

  const handleCreateShopifyAccount = async (registrationId: string) => {
    try {
      const response = await apiRequest("POST", `/api/wholesale-registration/${registrationId}/create-shopify-account`, {});

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create Shopify account");
      }

      const data = await response.json();

      let message = "Wholesale account created successfully!\n\n";
      message += `Metaobject ID: ${data.metaobjectId}\n`;

      if (data.customerId) {
        message += `Customer ID: ${data.customerId}\n`;
      }

      if (data.crmAccountId) {
        message += `\nCRM Account ID: ${data.crmAccountId}\n`;
      }

      if (data.crmContactId) {
        message += `CRM Contact ID: ${data.crmContactId}\n`;
      }

      if (data.warning) {
        message += `\n⚠️ ${data.warning}`;
      }

      toast({
        title: "Shopify Account Creation Status",
        description: message,
      });

      // Open customer in Shopify admin
      if (data.customerUrl) {
        window.open(data.customerUrl, '_blank');
      }

      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create Shopify account",
        variant: "destructive",
      });
    }
  };


  const pendingCount = registrations.filter((r: any) => r.status === "pending").length;
  const approvedCount = registrations.filter((r: any) => r.status === "approved").length;
  const totalQuotes = quotes.length;
  const totalOrders = draftOrders.length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-[#F2633A]/10 text-[#F2633A] border-[#F2633A]/20 font-['Vazirmatn']"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case "approved":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 font-['Vazirmatn']"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 font-['Vazirmatn']"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline" className="font-['Vazirmatn']">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F1E9]">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="rounded-[11px]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium font-['Vazirmatn'] text-[#212227]">Pending Applications</CardTitle>
              <Users className="h-4 w-4 text-[#696A6D]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-['Archivo'] text-[#212227]">{pendingCount}</div>
            </CardContent>
          </Card>

          <Card className="rounded-[11px]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium font-['Vazirmatn'] text-[#212227]">Approved Customers</CardTitle>
              <CheckCircle className="h-4 w-4 text-[#696A6D]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-['Archivo'] text-[#212227]">{approvedCount}</div>
            </CardContent>
          </Card>

          <Card className="rounded-[11px]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium font-['Vazirmatn'] text-[#212227]">Calculator Quotes</CardTitle>
              <Calculator className="h-4 w-4 text-[#696A6D]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-['Archivo'] text-[#212227]">{totalQuotes}</div>
            </CardContent>
          </Card>

          <Card className="rounded-[11px]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium font-['Vazirmatn'] text-[#212227]">Draft Orders</CardTitle>
              <FileText className="h-4 w-4 text-[#696A6D]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-['Archivo'] text-[#212227]">{totalOrders}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="registrations" className="space-y-4">
          <TabsList>
            <TabsTrigger value="registrations" className="font-['Vazirmatn']">Registrations</TabsTrigger>
            <TabsTrigger value="quotes" className="font-['Vazirmatn']">Calculator Quotes</TabsTrigger>
            <TabsTrigger value="orders" className="font-['Vazirmatn']">Draft Orders</TabsTrigger>
          </TabsList>

          <TabsContent value="registrations">
            <div className="space-y-4">
              {loadingRegistrations ? (
                <div className="text-center py-8 font-['Vazirmatn'] text-[#696A6D]">Loading...</div>
              ) : registrations.length === 0 ? (
                <Card className="rounded-[11px]">
                  <CardContent className="py-8">
                    <div className="text-center text-[#696A6D] font-['Vazirmatn']">No registrations yet</div>
                  </CardContent>
                </Card>
              ) : (
                registrations.map((reg: any) => (
                  <Collapsible
                    key={reg.id}
                    open={expandedCards.has(reg.id)}
                    onOpenChange={(open) => {
                      const newExpanded = new Set(expandedCards);
                      if (open) {
                        newExpanded.add(reg.id);
                      } else {
                        newExpanded.delete(reg.id);
                      }
                      setExpandedCards(newExpanded);
                    }}
                  >
                    <Card className="rounded-[11px] overflow-hidden transition-all hover:shadow-lg">
                      <CollapsibleTrigger className="w-full">
                        <CardHeader className="cursor-pointer hover:bg-[#F3F1E9]/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="text-left">
                                <CardTitle className="font-['Archivo'] text-[#212227] text-lg flex items-center gap-2">
                                  <Building2 className="w-5 h-5 text-[#F2633A]" />
                                  {reg.firmName}
                                </CardTitle>
                                <CardDescription className="font-['Vazirmatn'] text-[#696A6D] mt-1">
                                  {reg.contactName} • {format(new Date(reg.createdAt), "MMM d, yyyy")}
                                </CardDescription>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {getStatusBadge(reg.status)}
                              <ChevronDown
                                className={`w-5 h-5 text-[#696A6D] transition-transform ${
                                  expandedCards.has(reg.id) ? 'rotate-180' : ''
                                }`}
                              />
                            </div>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <CardContent className="border-t border-[#E1E0DA]">
                          <div className="grid md:grid-cols-2 gap-6 py-6">
                            {/* Contact Information */}
                            <div className="space-y-4">
                              <h3 className="font-['Archivo'] text-[#212227] font-semibold text-sm uppercase tracking-wide">Contact Information</h3>
                              <div className="space-y-3">
                                <div className="flex items-start gap-3">
                                  <Mail className="w-4 h-4 text-[#F2633A] mt-0.5" />
                                  <div>
                                    <p className="text-xs text-[#696A6D] font-['Vazirmatn']">Email</p>
                                    <p className="font-['Vazirmatn'] text-[#212227]">{reg.email}</p>
                                  </div>
                                </div>
                                <div className="flex items-start gap-3">
                                  <Phone className="w-4 h-4 text-[#F2633A] mt-0.5" />
                                  <div>
                                    <p className="text-xs text-[#696A6D] font-['Vazirmatn']">Phone</p>
                                    <p className="font-['Vazirmatn'] text-[#212227]">{reg.phone}</p>
                                  </div>
                                </div>
                                <div className="flex items-start gap-3">
                                  <MapPin className="w-4 h-4 text-[#F2633A] mt-0.5" />
                                  <div>
                                    <p className="text-xs text-[#696A6D] font-['Vazirmatn']">Address</p>
                                    <p className="font-['Vazirmatn'] text-[#212227]">
                                      {reg.businessAddress}<br />
                                      {reg.businessAddress2 && <>{reg.businessAddress2}<br /></>}
                                      {reg.city}, {reg.state} {reg.zipCode}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Business Details */}
                            <div className="space-y-4">
                              <h3 className="font-['Archivo'] text-[#212227] font-semibold text-sm uppercase tracking-wide">Business Details</h3>
                              <div className="space-y-3">
                                <div className="flex items-start gap-3">
                                  <Building2 className="w-4 h-4 text-[#F2633A] mt-0.5" />
                                  <div>
                                    <p className="text-xs text-[#696A6D] font-['Vazirmatn']">Business Type</p>
                                    <p className="font-['Vazirmatn'] text-[#212227] capitalize">{reg.businessType.replace(/_/g, ' ')}</p>
                                  </div>
                                </div>
                                {reg.yearsInBusiness && (
                                  <div className="flex items-start gap-3">
                                    <Calendar className="w-4 h-4 text-[#F2633A] mt-0.5" />
                                    <div>
                                      <p className="text-xs text-[#696A6D] font-['Vazirmatn']">Years in Business</p>
                                      <p className="font-['Vazirmatn'] text-[#212227]">{reg.yearsInBusiness} years</p>
                                    </div>
                                  </div>
                                )}
                                {reg.website && (
                                  <div className="flex items-start gap-3">
                                    <Globe className="w-4 h-4 text-[#F2633A] mt-0.5" />
                                    <div>
                                      <p className="text-xs text-[#696A6D] font-['Vazirmatn']">Website</p>
                                      <a
                                        href={reg.website}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-['Vazirmatn'] text-[#F2633A] hover:underline flex items-center gap-1"
                                      >
                                        {reg.website} <ExternalLink className="w-3 h-3" />
                                      </a>
                                    </div>
                                  </div>
                                )}
                                {reg.instagramHandle && (
                                  <div className="flex items-start gap-3">
                                    <Instagram className="w-4 h-4 text-[#F2633A] mt-0.5" />
                                    <div>
                                      <p className="text-xs text-[#696A6D] font-['Vazirmatn']">Instagram</p>
                                      <a
                                        href={`https://instagram.com/${reg.instagramHandle.replace('@', '')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-['Vazirmatn'] text-[#F2633A] hover:underline flex items-center gap-1"
                                      >
                                        @{reg.instagramHandle.replace('@', '')} <ExternalLink className="w-3 h-3" />
                                      </a>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Tax & Documents */}
                            <div className="space-y-4 md:col-span-2">
                              <h3 className="font-['Archivo'] text-[#212227] font-semibold text-sm uppercase tracking-wide">Tax & Documentation</h3>
                              <div className="grid md:grid-cols-2 gap-4">
                                <div className="flex items-center gap-2">
                                  <Badge variant={reg.isTaxExempt ? "default" : "outline"} className="font-['Vazirmatn']">
                                    {reg.isTaxExempt ? 'Tax Exempt' : 'Not Tax Exempt'}
                                  </Badge>
                                  {reg.isTaxExempt && reg.taxId && (
                                    <span className="text-sm text-[#696A6D] font-['Vazirmatn']">ID: {reg.taxId}</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant={reg.receivedSampleSet ? "default" : "outline"} className="font-['Vazirmatn']">
                                    {reg.receivedSampleSet ? 'Sample Set Received' : 'No Sample Set'}
                                  </Badge>
                                </div>
                              </div>

                              {/* File Links */}
                              {(reg.certificationUrl || reg.taxIdProofUrl) && (
                                <div className="flex flex-wrap gap-3 pt-2">
                                  {reg.certificationUrl && (
                                    <a
                                      href={reg.certificationUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#F3F1E9] hover:bg-[#E1E0DA] rounded-[11px] transition-colors"
                                    >
                                      <FileCheck className="w-4 h-4 text-[#F2633A]" />
                                      <span className="font-['Vazirmatn'] text-sm text-[#212227]">Business Certification</span>
                                      <ExternalLink className="w-3 h-3 text-[#696A6D]" />
                                    </a>
                                  )}
                                  {reg.taxIdProofUrl && (
                                    <a
                                      href={reg.taxIdProofUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#F3F1E9] hover:bg-[#E1E0DA] rounded-[11px] transition-colors"
                                    >
                                      <FileCheck className="w-4 h-4 text-[#F2633A]" />
                                      <span className="font-['Vazirmatn'] text-sm text-[#212227]">Tax ID Proof</span>
                                      <ExternalLink className="w-3 h-3 text-[#696A6D]" />
                                    </a>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Additional Info */}
                            {(reg.howDidYouHear || reg.adminNotes) && (
                              <div className="space-y-4 md:col-span-2">
                                <h3 className="font-['Archivo'] text-[#212227] font-semibold text-sm uppercase tracking-wide">Additional Information</h3>
                                {reg.howDidYouHear && (
                                  <div>
                                    <p className="text-xs text-[#696A6D] font-['Vazirmatn'] mb-1">How They Heard About Us</p>
                                    <p className="font-['Vazirmatn'] text-[#212227]">{reg.howDidYouHear}</p>
                                  </div>
                                )}
                                {reg.adminNotes && (
                                  <div>
                                    <p className="text-xs text-[#696A6D] font-['Vazirmatn'] mb-1">Admin Notes</p>
                                    <p className="font-['Vazirmatn'] text-[#212227] text-sm whitespace-pre-wrap">{reg.adminNotes}</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="border-t border-[#E1E0DA] pt-4">
                            {reg.status === "pending" && (
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => handleApprove(reg)}
                                  className="bg-[#F2633A] hover:bg-[#F2633A]/90 text-white rounded-[11px] font-['Vazirmatn']"
                                >
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Approve Application
                                </Button>
                                <Button
                                  onClick={() => handleReject(reg)}
                                  variant="outline"
                                  className="rounded-[11px] font-['Vazirmatn']"
                                >
                                  <XCircle className="w-4 h-4 mr-2" />
                                  Reject Application
                                </Button>
                              </div>
                            )}
                            {reg.status === 'approved' && (
                              <div className="space-y-3">
                                <div className="flex items-center gap-2 text-sm text-green-600">
                                  <CheckCircle2 className="w-4 h-4" />
                                  <span className="font-['Vazirmatn']">Approved on {new Date(reg.approvedAt!).toLocaleDateString()}</span>
                                </div>
                                <Button
                                  onClick={() => handleCreateShopifyAccount(reg.id)}
                                  className="bg-[#F2633A] hover:bg-[#F2633A]/90 text-white rounded-[11px] font-['Vazirmatn']"
                                >
                                  <ExternalLink className="w-4 h-4 mr-2" />
                                  Create Shopify Account & Send to CRM
                                </Button>
                              </div>
                            )}
                            {reg.status === 'rejected' && reg.rejectionReason && (
                              <div className="bg-red-50 border border-red-200 rounded-[11px] p-4">
                                <p className="text-xs text-red-600 font-['Vazirmatn'] mb-1">Rejection Reason</p>
                                <p className="font-['Vazirmatn'] text-red-700 text-sm">{reg.rejectionReason}</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="quotes">
            <Card className="rounded-[11px]">
              <CardHeader>
                <CardTitle className="font-['Archivo'] text-[#212227]">Calculator Quotes</CardTitle>
                <CardDescription className="font-['Vazirmatn'] text-[#696A6D]">View all saved calculator quotes</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingQuotes ? (
                  <div className="text-center py-8 font-['Vazirmatn'] text-[#696A6D]">Loading...</div>
                ) : quotes.length === 0 ? (
                  <div className="text-center py-8 text-[#696A6D] font-['Vazirmatn']">No quotes yet</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-['Vazirmatn']">Dimensions</TableHead>
                        <TableHead className="font-['Vazirmatn']">Shape</TableHead>
                        <TableHead className="font-['Vazirmatn']">Thickness</TableHead>
                        <TableHead className="font-['Vazirmatn']">Price</TableHead>
                        <TableHead className="font-['Vazirmatn']">Project</TableHead>
                        <TableHead className="font-['Vazirmatn']">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {quotes.map((quote: any) => (
                        <TableRow key={quote.id}>
                          <TableCell className="font-['Vazirmatn'] text-[#212227]">{quote.width} × {quote.length} ft</TableCell>
                          <TableCell className="capitalize font-['Vazirmatn'] text-[#212227]">{quote.shape}</TableCell>
                          <TableCell className="font-['Vazirmatn'] text-[#212227]">{quote.thickness === "thin" ? "⅛\"" : "¼\""}</TableCell>
                          <TableCell className="font-medium font-['Vazirmatn'] text-[#212227]">${quote.totalPrice}</TableCell>
                          <TableCell className="font-['Vazirmatn'] text-[#696A6D]">{quote.projectName || "—"}</TableCell>
                          <TableCell className="font-['Vazirmatn'] text-[#696A6D]">{format(new Date(quote.createdAt), "MMM d, yyyy")}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders">
            <Card className="rounded-[11px]">
              <CardHeader>
                <CardTitle className="font-['Archivo'] text-[#212227]">Draft Orders</CardTitle>
                <CardDescription className="font-['Vazirmatn'] text-[#696A6D]">View all created draft orders</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingOrders ? (
                  <div className="text-center py-8 font-['Vazirmatn'] text-[#696A6D]">Loading...</div>
                ) : draftOrders.length === 0 ? (
                  <div className="text-center py-8 text-[#696A6D] font-['Vazirmatn']">No draft orders yet</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-['Vazirmatn']">Order ID</TableHead>
                        <TableHead className="font-['Vazirmatn']">Total Price</TableHead>
                        <TableHead className="font-['Vazirmatn']">Date</TableHead>
                        <TableHead className="font-['Vazirmatn']">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {draftOrders.map((order: any) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono text-sm font-['Vazirmatn'] text-[#212227]">{order.shopifyDraftOrderId}</TableCell>
                          <TableCell className="font-medium font-['Vazirmatn'] text-[#212227]">${order.totalPrice}</TableCell>
                          <TableCell className="font-['Vazirmatn'] text-[#696A6D]">{format(new Date(order.createdAt), "MMM d, yyyy")}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(order.shopifyDraftOrderUrl, "_blank")}
                              className="rounded-[11px] font-['Vazirmatn']"
                            >
                              <ExternalLink className="w-3 h-3 mr-1" />
                              View in Shopify
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Registration Action Dialog */}
      <Dialog open={!!selectedRegistration} onOpenChange={() => setSelectedRegistration(null)}>
        <DialogContent className="rounded-[16px]">
          <DialogHeader>
            <DialogTitle className="font-['Archivo'] text-[#212227]">
              {actionType === "approve" ? "Approve" : "Reject"} Registration
            </DialogTitle>
            <DialogDescription className="font-['Vazirmatn'] text-[#696A6D]">
              {actionType === "approve"
                ? "Approve this wholesale registration application"
                : "Reject this wholesale registration application"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedRegistration && (
              <div className="space-y-2 text-sm font-['Vazirmatn']">
                <div className="text-[#212227]"><strong>Firm:</strong> {selectedRegistration.firmName}</div>
                <div className="text-[#212227]"><strong>Contact:</strong> {selectedRegistration.contactName}</div>
                <div className="text-[#212227]"><strong>Email:</strong> {selectedRegistration.email}</div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="adminNotes" className="font-['Vazirmatn'] text-[#212227]">Admin Notes (Optional)</Label>
              <Textarea
                id="adminNotes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Internal notes about this decision..."
                className={`rounded-[11px] font-['Vazirmatn'] ${globalInputStyles}`}
              />
            </div>

            {actionType === "reject" && (
              <div className="space-y-2">
                <Label htmlFor="rejectionReason" className="font-['Vazirmatn'] text-[#212227]">Rejection Reason</Label>
                <Textarea
                  id="rejectionReason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Reason for rejection (will be sent to applicant)..."
                  className={`rounded-[11px] font-['Vazirmatn'] ${globalInputStyles}`}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedRegistration(null)} className="rounded-[11px] font-['Vazirmatn']">
              Cancel
            </Button>
            <Button
              onClick={confirmAction}
              disabled={updateRegistrationMutation.isPending}
              className="bg-[#F2633A] hover:bg-[#F2633A]/90 text-white rounded-[11px] font-['Vazirmatn']"
            >
              {updateRegistrationMutation.isPending ? "Processing..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      </div>
  );
}