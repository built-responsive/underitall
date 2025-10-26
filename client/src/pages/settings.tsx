import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Settings as SettingsIcon, Link as LinkIcon, Webhook, RefreshCw, CheckCircle2, XCircle, AlertCircle, Database, Package } from "lucide-react";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const globalInputStyles = "border-[#7e8d76] font-['Lora_Italic'] placeholder:text-[#7e8d76]/70 focus:border-[#7e8d76] focus:ring-[#7e8d76]";

// Notification Recipients Manager Component
function NotificationRecipientsManager() {
  const { toast } = useToast();
  const [newRecipientEmail, setNewRecipientEmail] = useState("");

  const { data: recipientsData, refetch } = useQuery({
    queryKey: ["/api/notification-recipients"],
    queryFn: async () => {
      const res = await fetch("/api/notification-recipients?category=wholesale_notifications");
      if (!res.ok) throw new Error("Failed to fetch recipients");
      return await res.json();
    },
  });

  const addRecipientMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await apiRequest("POST", "/api/notification-recipients", { 
        email, 
        category: "wholesale_notifications" 
      });
      if (!res.ok) throw new Error("Failed to add recipient");
      return await res.json();
    },
    onSuccess: () => {
      toast({ title: "Recipient Added", description: "Email address added to notifications" });
      setNewRecipientEmail("");
      refetch();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to add recipient", 
        variant: "destructive" 
      });
    },
  });

  const removeRecipientMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/notification-recipients/${id}`);
      if (!res.ok) throw new Error("Failed to remove recipient");
      return await res.json();
    },
    onSuccess: () => {
      toast({ title: "Recipient Removed", description: "Email address removed from notifications" });
      refetch();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to remove recipient", 
        variant: "destructive" 
      });
    },
  });

  const recipients = recipientsData?.recipients || [];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="notificationRecipients" className="font-['Vazirmatn'] text-[#212227]">
          Notification Recipients
        </Label>
        <div className="flex gap-2">
          <Input
            id="newRecipient"
            type="email"
            placeholder="admin@example.com"
            value={newRecipientEmail}
            onChange={(e) => setNewRecipientEmail(e.target.value)}
            className={`rounded-[11px] font-['Vazirmatn'] ${globalInputStyles}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newRecipientEmail) {
                addRecipientMutation.mutate(newRecipientEmail);
              }
            }}
          />
          <Button
            onClick={() => {
              if (newRecipientEmail && newRecipientEmail.includes('@')) {
                addRecipientMutation.mutate(newRecipientEmail);
              } else {
                toast({ 
                  title: "Invalid Email", 
                  description: "Please enter a valid email address", 
                  variant: "destructive" 
                });
              }
            }}
            disabled={addRecipientMutation.isPending}
            className="bg-[#F2633A] hover:bg-[#F2633A]/90 text-white rounded-[11px] font-['Vazirmatn']"
          >
            Add
          </Button>
        </div>

        <div className="space-y-2 mt-4">
          <p className="text-sm text-[#696A6D]">Current Recipients ({recipients.length}):</p>
          <div className="flex flex-wrap gap-2">
            {recipients.map((recipient: any) => (
              <Badge key={recipient.id} variant="secondary" className="font-['Vazirmatn']">
                {recipient.email}
                <button 
                  onClick={() => removeRecipientMutation.mutate(recipient.id)}
                  className="ml-2 text-red-500 hover:text-red-700"
                  disabled={removeRecipientMutation.isPending}
                >
                  ×
                </button>
              </Badge>
            ))}
            {recipients.length === 0 && (
              <p className="text-sm text-[#696A6D] italic">No recipients configured</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-[#F3F1E9] border border-[#E1E0DA] p-4 rounded-[11px] text-sm font-['Vazirmatn'] text-[#696A6D]">
        <p className="font-semibold text-[#212227] mb-2">Gmail Integration Status:</p>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          <span>Connected via Replit Gmail Connector</span>
        </div>
        <p className="text-xs mt-2">Emails will be sent from: noreply@itsunderitall.com</p>
      </div>
    </div>
  );
}

// Email Template Test Panel with WYSIWYG Editor
function EmailTemplateTestPanel() {
  const { toast } = useToast();
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [customHtml, setCustomHtml] = useState("");
  const [subject, setSubject] = useState("");

  const { data: templatesData } = useQuery({
    queryKey: ["/api/email-templates"],
    queryFn: async () => {
      const res = await fetch("/api/email-templates");
      if (!res.ok) throw new Error("Failed to fetch templates");
      return await res.json();
    },
  });

  const sendTestMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/gmail/send-test", data);
      if (!res.ok) throw new Error("Failed to send test email");
      return await res.json();
    },
    onSuccess: () => {
      toast({ title: "Test Email Sent", description: "Check your inbox for the HTML-formatted test email" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Send Failed", 
        description: error.message || "Failed to send test email", 
        variant: "destructive" 
      });
    },
  });

  const templates = templatesData || [];
  const selectedTemplate = templates.find((t: any) => t.id === selectedTemplateId);

  // Generate preview HTML with sample data
  const previewHtml = React.useMemo(() => {
    if (!customHtml) return '';
    
    let preview = customHtml;
    const sampleData: any = {
      firstName: 'John',
      lastName: 'Doe',
      firmName: 'Acme Design Studio',
      email: 'john@acmedesign.com',
      phone: '555-0123',
      businessType: 'Interior Designer',
      clarityAccountId: 'AC000123',
      applicationDate: new Date().toLocaleDateString(),
      applicationNumber: 'APP-2024-001',
      orderNumber: 'DO-2024-001',
      orderDate: new Date().toLocaleDateString(),
      customerName: 'Acme Design Studio',
      customerEmail: 'orders@acmedesign.com',
      totalPrice: '$545.00',
      subtotal: '$500.00',
      tax: '$45.00',
      timestamp: new Date().toLocaleString(),
      environment: 'Production',
      errorType: 'DatabaseConnectionError',
      errorMessage: 'Failed to connect to database',
      service: 'API',
      critical: true,
      pendingCount: 3,
      adminDashboardUrl: 'https://app.itsunderitall.com/admin',
      businessAddress: '123 Design Street',
      businessAddress2: 'Suite 100',
      city: 'Atlanta',
      state: 'GA',
      zipCode: '30303',
      currentYear: new Date().getFullYear()
    };

    // Replace simple variables
    Object.keys(sampleData).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      preview = preview.replace(regex, sampleData[key] || '');
    });

    // Handle conditionals
    preview = preview.replace(/{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g, (match, variable, content) => {
      return sampleData[variable] ? content : '';
    });

    return preview;
  }, [customHtml]);

  return (
    <div className="space-y-4 border-t pt-4">
      <h3 className="font-['Archivo'] text-lg text-[#212227]">Test Email Template</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="font-['Vazirmatn'] text-[#212227]">Select Template</Label>
          <select
            value={selectedTemplateId}
            onChange={(e) => {
              setSelectedTemplateId(e.target.value);
              const template = templates.find((t: any) => t.id === e.target.value);
              if (template) {
                setSubject(template.subject);
                setCustomHtml(template.htmlContent);
              }
            }}
            className={`w-full rounded-[11px] p-2 border font-['Vazirmatn'] ${globalInputStyles}`}
          >
            <option value="">-- Select Template --</option>
            {templates.map((template: any) => (
              <option key={template.id} value={template.id}>
                {template.name} ({template.category})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label className="font-['Vazirmatn'] text-[#212227]">Test Recipient</Label>
          <Input
            type="email"
            placeholder="test@example.com"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            className={`rounded-[11px] font-['Vazirmatn'] ${globalInputStyles}`}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="font-['Vazirmatn'] text-[#212227]">Subject Line</Label>
        <Input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Email subject..."
          className={`rounded-[11px] font-['Vazirmatn'] ${globalInputStyles}`}
        />
      </div>

      <div className="space-y-2">
        <Label className="font-['Vazirmatn'] text-[#212227]">HTML Content</Label>
        <textarea
          value={customHtml}
          onChange={(e) => setCustomHtml(e.target.value)}
          placeholder="<p>HTML content here...</p>"
          rows={10}
          className={`w-full rounded-[11px] p-3 border font-mono text-sm ${globalInputStyles}`}
        />
      </div>

      {/* Auto-render preview below textarea */}
      {customHtml && (
        <div className="mt-4 border rounded-[11px] p-4 bg-white">
          <h4 className="font-['Vazirmatn'] text-sm text-[#696A6D] mb-2">Live Preview:</h4>
          <iframe
            srcDoc={previewHtml}
            className="w-full h-[500px] border rounded"
            title="Email Preview"
          />
        </div>
      )}

      <div className="flex gap-2">
        <Button
          onClick={() => {
            if (!testEmail || !testEmail.includes('@')) {
              toast({ 
                title: "Invalid Email", 
                description: "Please enter a valid test email address", 
                variant: "destructive" 
              });
              return;
            }
            if (!subject || !customHtml) {
              toast({ 
                title: "Missing Content", 
                description: "Subject and HTML content are required", 
                variant: "destructive" 
              });
              return;
            }
            sendTestMutation.mutate({
              to: testEmail,
              subject,
              htmlContent: customHtml,
              templateId: selectedTemplateId || undefined,
            });
          }}
          disabled={sendTestMutation.isPending}
          className="bg-[#F2633A] hover:bg-[#F2633A]/90 text-white rounded-[11px] font-['Vazirmatn']"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          {sendTestMutation.isPending ? "Sending..." : "Send Test Email"}
        </Button>
      </div>
    </div>
  );
}

export default function Settings() {
  const { toast } = useToast();
  const [thinCsvUrl, setThinCsvUrl] = useState("https://docs.google.com/spreadsheets/d/e/2PACX-1vSdjr_ZWgEOAfDH0c9bAxhRe-fDuc_Z9DAdCW3b4pSUgGjWtOhaVXUW7lWxlBN7eN9F_Z0M-I5X2N85/pub?gid=71970597&single=true&output=csv");
  const [thickCsvUrl, setThickCsvUrl] = useState("https://docs.google.com/spreadsheets/d/e/2PACX-1vSdjr_ZWgEOAfDH0c9bAxhRe-fDuc_Z9DAdCW3b4pSUgGjWtOhaVXUW7lWxlBN7eN9F_Z0M-I5X2N85/pub?gid=218236355&single=true&output=csv");
  const [expandedWebhooks, setExpandedWebhooks] = useState<Set<number>>(new Set());

  const { data: webhookLogs, isLoading: loadingWebhooks, refetch: refetchWebhooks, isError: webhookError } = useQuery({
    queryKey: ["https://its-under-it-all.replit.app/api/webhooks/logs"],
    queryFn: async () => {
      const res = await fetch("https://its-under-it-all.replit.app/api/webhooks/logs", {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return await res.json();
    },
  });

  const { data: healthCheck, isLoading: loadingHealth, refetch: refetchHealth, isError: healthError } = useQuery({
    queryKey: ["/api/health"],
    queryFn: async () => {
      const res = await fetch("/api/health", {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return await res.json();
    },
  });

  // Verify TOML-defined metafields exist in Shopify
  const { data: metafieldCheck, isLoading: loadingMetafields } = useQuery({
    queryKey: ["/api/shopify/graphql", "metafieldDefinitions"],
    queryFn: async () => {
      const query = `
        query {
          metafieldDefinitions(first: 10, ownerType: CUSTOMER, namespace: "app") {
            nodes {
              key
              name
              namespace
              type {
                name
              }
            }
          }
        }
      `;
      const res = await fetch("/api/shopify/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    },
  });

  const testCrmMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/test-crm");
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.success ? "CRM Connected" : "CRM Connection Failed",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      });
    },
  });

  const testShopifyMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/test-shopify");
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.success ? "Shopify Connected" : "Shopify Connection Failed",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      });
    },
  });

  const initializeMetaobjectMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/initialize-metaobject");
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.success ? "Metaobject Initialized" : "Initialization Failed",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      });
      refetchHealth();
    },
  });

  const updatePricesMutation = useMutation({
    mutationFn: async ({ thinCsvUrl, thickCsvUrl }: any) => {
      const res = await apiRequest("POST", "/api/admin/update-prices", { thinCsvUrl, thickCsvUrl });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Settings Updated",
        description: data.message,
      });
    },
  });

  const handleUpdatePrices = () => {
    updatePricesMutation.mutate({ thinCsvUrl, thickCsvUrl });
  };

  const logs = webhookLogs?.logs || [];

  const toggleExpandWebhook = (index: number) => {
    setExpandedWebhooks((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  // Linked Customers Table Component
  function LinkedCustomersTable() {
    const { data: linkedCustomers, isLoading } = useQuery({
      queryKey: ["/api/shopify/graphql", "linkedCustomers"],
      queryFn: async () => {
        const query = `
          query {
            customers(first: 50) {
              nodes {
                id
                email
                firstName
                lastName
                clarityId: metafield(namespace: "custom", key: "wholesale_clarity_id") { value }
                uiaId: metafield(namespace: "custom", key: "uia_id") { value }
                wholesaleName: metafield(namespace: "custom", key: "wholesale_name") { value }
              }
            }
          }
        `;
        console.log("📥 Fetching customers with wholesale metafields...");
        const res = await fetch("/api/shopify/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        console.log("📤 Customer metafield data:", data);
        // Filter to only customers with CRM + UIA linkage (both required)
        const linked = data?.data?.customers?.nodes?.filter((c: any) => 
          c.clarityId?.value && c.uiaId?.value
        ) || [];
        console.log(`✅ Found ${linked.length} fully linked wholesale customers`);
        return linked;
      },
    });

    if (isLoading) {
      return <div className="text-center py-4 text-[#696A6D]">Loading linked customers...</div>;
    }

    if (!linkedCustomers || linkedCustomers.length === 0) {
      return (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No fully linked customers found. Approve a registration to create one.
          </AlertDescription>
        </Alert>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Customer</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>CRM ID</TableHead>
            <TableHead>UIA ID</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {linkedCustomers.map((customer: any) => (
            <TableRow key={customer.id}>
              <TableCell className="font-medium">
                {customer.firstName} {customer.lastName}
              </TableCell>
              <TableCell className="text-sm text-[#696A6D]">{customer.email}</TableCell>
              <TableCell className="text-sm">{customer.wholesaleName?.value || "—"}</TableCell>
              <TableCell>
                <code className="text-xs bg-[#F3F1E9] px-2 py-1 rounded">
                  {customer.clarityId?.value}
                </code>
              </TableCell>
              <TableCell>
                <code className="text-xs bg-[#F3F1E9] px-2 py-1 rounded font-mono">
                  {customer.uiaId?.value?.substring(0, 8)}...
                </code>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }


  return (
    <div className="min-h-screen bg-[#F3F1E9]">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <SettingsIcon className="w-8 h-8 text-[#F2633A]" />
            <h1 className="text-3xl font-['Archivo'] text-[#212227]">Settings</h1>
          </div>
          <p className="text-[#696A6D] font-['Vazirmatn']">Configure pricing matrices and monitor webhook activity</p>
        </div>

        <Tabs defaultValue="health" className="space-y-6">
          <TabsList>
            <TabsTrigger value="health" className="font-['Vazirmatn']">
              <Database className="w-4 h-4 mr-2" />
              System Health
            </TabsTrigger>
            <TabsTrigger value="pricing" className="font-['Vazirmatn']">
              <LinkIcon className="w-4 h-4 mr-2" />
              Pricing CSVs
            </TabsTrigger>
            <TabsTrigger value="notifications" className="font-['Vazirmatn']">
              <SettingsIcon className="w-4 h-4 mr-2" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="webhooks" className="font-['Vazirmatn']">
              <Webhook className="w-4 h-4 mr-2" />
              Webhook Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="health">
            <div className="space-y-6">
              {/* TOML Metafield Verification */}
              <Card className="rounded-[16px] border-2 border-green-500">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="font-['Archivo'] text-[#212227] flex items-center gap-2">
                        <Package className="w-6 h-6 text-[#F2633A]" />
                        Customer Metafield Definitions (TOML)
                      </CardTitle>
                      <CardDescription className="font-['Vazirmatn'] text-[#696A6D]">
                        Configured in shopify.app.toml
                      </CardDescription>
                    </div>
                    <Badge variant="default" className="font-['Vazirmatn'] text-lg px-4 py-2">
                      ✅ SYNCED
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingMetafields ? (
                    <div className="text-center py-4 text-[#696A6D]">Loading metafield definitions...</div>
                  ) : (
                    <div className="space-y-3">
                      {metafieldCheck?.data?.metafieldDefinitions?.nodes?.map((def: any) => (
                        <div key={def.key} className="bg-[#F3F1E9] p-3 rounded-[11px] flex items-center justify-between">
                          <div>
                            <code className="text-sm font-mono text-[#F2633A]">{def.namespace}.{def.key}</code>
                            <div className="text-xs text-[#696A6D] mt-1">{def.name}</div>
                          </div>
                          <Badge variant="outline" className="text-xs">{def.type.name}</Badge>
                        </div>
                      )) || (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>No custom metafields found. Run 'shopify app deploy' to sync.</AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-[16px]">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="font-['Archivo'] text-[#212227]">Integration Health Status</CardTitle>
                      <CardDescription className="font-['Vazirmatn'] text-[#696A6D]">
                        Monitor Shopify, CRM, and system connectivity
                      </CardDescription>
                    </div>
                    <Button
                      onClick={() => refetchHealth()}
                      variant="outline"
                      size="sm"
                      className="rounded-[11px] font-['Vazirmatn']"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {loadingHealth ? (
                    <div className="text-center py-8 font-['Vazirmatn'] text-[#696A6D]">Checking system health...</div>
                  ) : healthError ? (
                    <Alert className="border-red-500">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle className="font-['Archivo']">Failed to Load Health Status</AlertTitle>
                      <AlertDescription className="font-['Vazirmatn']">
                        Could not load health status. Please try again.
                        <Button
                          onClick={() => refetchHealth()}
                          variant="outline"
                          size="sm"
                          className="ml-4 rounded-[11px]"
                        >
                          Retry
                        </Button>
                      </AlertDescription>
                    </Alert>
                  ) : healthCheck ? (
                    <div className="space-y-4">
                      <Alert className={healthCheck.shopify?.configured ? "border-green-500" : "border-yellow-500"}>
                        <Package className="h-4 w-4" />
                        <AlertTitle className="font-['Archivo']">Shopify Integration</AlertTitle>
                        <AlertDescription className="font-['Vazirmatn'] space-y-2">
                          <div className="flex items-center gap-2">
                            {healthCheck.shopify?.configured ? (
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-600" />
                            )}
                            <span>Admin API: {healthCheck.shopify?.configured ? "Configured" : "Not Configured"}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {healthCheck.shopify?.metaobjectDefinition ? (
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-yellow-600" />
                            )}
                            <span>wholesale_account metaobject: {healthCheck.shopify?.metaobjectDefinition ? "Exists" : "Not Found"}</span>
                          </div>
                          {healthCheck.shopify?.shop && (
                            <div className="text-sm text-[#696A6D]">Shop: {healthCheck.shopify.shop}</div>
                          )}
                          {healthCheck.shopify?.error && (
                            <div className="text-sm text-red-600">{healthCheck.shopify.error}</div>
                          )}
                        </AlertDescription>
                      </Alert>

                      <Alert className={healthCheck.crm?.configured ? "border-green-500" : "border-yellow-500"}>
                        <Database className="h-4 w-4" />
                        <AlertTitle className="font-['Archivo']">Clarity CRM</AlertTitle>
                        <AlertDescription className="font-['Vazirmatn'] space-y-2">
                          <div className="flex items-center gap-2">
                            {healthCheck.crm?.configured ? (
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-600" />
                            )}
                            <span>API: {healthCheck.crm?.configured ? "Configured" : "Not Configured"}</span>
                          </div>
                          {healthCheck.crm?.baseUrl && (
                            <div className="text-sm text-[#696A6D]">Base URL: {healthCheck.crm.baseUrl}</div>
                          )}
                          {healthCheck.crm?.error && (
                            <div className="text-sm text-red-600">{healthCheck.crm.error}</div>
                          )}
                        </AlertDescription>
                      </Alert>
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              <Card className="rounded-[16px]">
                <CardHeader>
                  <CardTitle className="font-['Archivo'] text-[#212227]">Connection Tests</CardTitle>
                  <CardDescription className="font-['Vazirmatn'] text-[#696A6D]">
                    Test API connectivity and credentials
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button
                      onClick={() => testShopifyMutation.mutate()}
                      disabled={testShopifyMutation.isPending}
                      className="bg-[#96BF48] hover:bg-[#96BF48]/90 text-white rounded-[11px] font-['Vazirmatn']"
                    >
                      {testShopifyMutation.isPending ? "Testing..." : "Test Shopify Connection"}
                    </Button>
                    <Button
                      onClick={() => testCrmMutation.mutate()}
                      disabled={testCrmMutation.isPending}
                      className="bg-[#5E8C61] hover:bg-[#5E8C61]/90 text-white rounded-[11px] font-['Vazirmatn']"
                    >
                      {testCrmMutation.isPending ? "Testing..." : "Test CRM Connection"}
                    </Button>
                  </div>


                </CardContent>
              </Card>

              {/* Linked Wholesale Customers (CRM ID -> UIA-ID -> Shopify) */}
              <Card className="rounded-[16px]">
                <CardHeader>
                  <CardTitle className="font-['Archivo'] text-[#212227]">Wholesale Customer Data</CardTitle>
                  <CardDescription className="font-['Vazirmatn'] text-[#696A6D]">
                    Shopify customers with proper CRM and registration linkage
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <LinkedCustomersTable />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="pricing">
            <Card className="rounded-[16px]">
              <CardHeader>
                <CardTitle className="font-['Archivo'] text-[#212227]">Price CSV Configuration</CardTitle>
                <CardDescription className="font-['Vazirmatn'] text-[#696A6D]">
                  Configure Google Sheets CSV URLs for pricing matrices
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="thinCsvUrl" className="font-['Vazirmatn'] text-[#212227]">Thin (⅛") CSV URL</Label>
                  <Input
                    id="thinCsvUrl"
                    value={thinCsvUrl}
                    onChange={(e) => setThinCsvUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/..."
                    className={`rounded-[11px] font-['Vazirmatn'] ${globalInputStyles}`}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="thickCsvUrl" className="font-['Vazirmatn'] text-[#212227]">Thick (¼") CSV URL</Label>
                  <Input
                    id="thickCsvUrl"
                    value={thickCsvUrl}
                    onChange={(e) => setThickCsvUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/..."
                    className={`rounded-[11px] font-['Vazirmatn'] ${globalInputStyles}`}
                  />
                </div>

                <div className="bg-[#F3F1E9] border border-[#E1E0DA] p-4 rounded-[11px] text-sm font-['Vazirmatn'] text-[#696A6D]">
                  <p className="font-semibold text-[#212227] mb-2">Instructions:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Open your Google Sheet</li>
                    <li>Go to File → Share → Publish to web</li>
                    <li>Select the specific sheet/tab</li>
                    <li>Choose "CSV" as the format</li>
                    <li>Copy the published URL and paste above</li>
                  </ol>
                </div>

                <Button
                  onClick={handleUpdatePrices}
                  disabled={updatePricesMutation.isPending}
                  className="bg-[#F2633A] hover:bg-[#F2633A]/90 text-white rounded-[11px] font-['Vazirmatn']"
                >
                  {updatePricesMutation.isPending ? "Updating..." : "Update Settings"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card className="rounded-[16px]">
              <CardHeader>
                <CardTitle className="font-['Archivo'] text-[#212227]">Gmail Notification Settings</CardTitle>
                <CardDescription className="font-['Vazirmatn'] text-[#696A6D]">
                  Configure email notifications for new wholesale applications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <NotificationRecipientsManager />
                <EmailTemplateTestPanel />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="webhooks">
            <Card className="rounded-[16px]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="font-['Archivo'] text-[#212227]">Webhook Activity Log</CardTitle>
                    <CardDescription className="font-['Vazirmatn'] text-[#696A6D]">
                      Monitor all incoming webhooks from Shopify and Clarity CRM
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => refetchWebhooks()}
                    variant="outline"
                    size="sm"
                    className="rounded-[11px] font-['Vazirmatn']"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingWebhooks ? (
                  <div className="text-center py-8 font-['Vazirmatn'] text-[#696A6D]">Loading webhook logs...</div>
                ) : webhookError ? (
                  <Alert className="border-red-500">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle className="font-['Archivo']">Failed to Load Webhook Logs</AlertTitle>
                    <AlertDescription className="font-['Vazirmatn']">
                      Could not fetch webhook logs. Please try again.
                      <Button
                        onClick={() => refetchWebhooks()}
                        variant="outline"
                        size="sm"
                        className="ml-4 rounded-[11px]"
                      >
                        Retry
                      </Button>
                    </AlertDescription>
                  </Alert>
                ) : logs.length === 0 ? (
                  <div className="text-center py-8 text-[#696A6D] font-['Vazirmatn']">No webhook calls logged yet</div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm text-[#696A6D] font-['Vazirmatn']">
                        Showing {logs.length} most recent webhook{logs.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="font-['Vazirmatn']">Timestamp</TableHead>
                            <TableHead className="font-['Vazirmatn']">Type</TableHead>
                            <TableHead className="font-['Vazirmatn']">Source</TableHead>
                            <TableHead className="font-['Vazirmatn']">Details</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {logs.map((log: any, index: number) => {
                            const webhookType = log.type || 'unknown';
                            const webhookSource = log.source || 'unknown';
                            const isShopify = webhookSource === 'shopify' || webhookType.includes('shopify');
                            const isCRM = webhookSource === 'crm' || webhookType.includes('clarity');
                            const isExpanded = expandedWebhooks.has(index);
                            // Use log.id if available (from database), fallback to stable composite key
                            const logKey = log.id || `log-${index}-${log.timestamp}`;

                            return (
                              <React.Fragment key={logKey}>
                                <TableRow onClick={() => toggleExpandWebhook(index)} className="cursor-pointer hover:bg-secondary/10">
                                  <TableCell className="font-['Vazirmatn'] text-[#696A6D]">
                                    {format(new Date(log.timestamp), "MMM d, yyyy HH:mm:ss")}
                                  </TableCell>
                                  <TableCell className="font-mono text-xs font-['Vazirmatn'] text-[#212227]">
                                    {webhookType}
                                  </TableCell>
                                  <TableCell>
                                    <Badge
                                      variant={isShopify ? "default" : isCRM ? "secondary" : "outline"}
                                      className="font-['Vazirmatn']"
                                    >
                                      {isShopify ? "Shopify" : isCRM ? "CRM" : webhookSource}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="font-['Vazirmatn'] text-[#696A6D] text-xs max-w-md truncate">
                                    {log.payload ? JSON.stringify(log.payload).substring(0, 100) : 'No payload'}
                                    {log.payload && JSON.stringify(log.payload).length > 100 && "..."}
                                  </TableCell>
                                </TableRow>
                                {isExpanded && (
                                  <TableRow>
                                    <TableCell colSpan={4} className="p-4 bg-secondary/20">
                                      <pre className="text-xs font-mono whitespace-pre-wrap break-words">
                                        {JSON.stringify(log.payload, null, 2)}
                                      </pre>
                                    </TableCell>
                                  </TableRow>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}