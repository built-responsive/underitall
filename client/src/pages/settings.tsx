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
import { Settings as SettingsIcon, Link as LinkIcon, Webhook, RefreshCw, CheckCircle2, XCircle, AlertCircle, Database, Package, Cog, Users, Mail, ShoppingBag, FileText } from "lucide-react";
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
        const res = await fetch("/api/shopify/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        // Filter to only customers with ALL three IDs linked
        return data?.data?.customers?.nodes?.filter((c: any) => 
          c.clarityId?.value && c.uiaId?.value
        ) || [];
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
      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-[#E1E0DA] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Cog className="h-8 w-8 text-[#F2633A]" />
              <h1 className="text-2xl font-['Archivo'] font-bold text-[#212227]">Settings</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="text-sm border-[#E1E0DA]">
                Last sync: {new Date().toLocaleDateString()}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Stats Overview */}
          <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="rounded-[22px] border-[#E1E0DA]">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium font-['Vazirmatn'] text-[#696A6D]">Active Customers</p>
                    <p className="text-2xl font-bold font-['Archivo'] text-[#212227] mt-1">
                      {/* Placeholder for syncStats, assuming it's defined elsewhere or fetched */}
                      0 
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-[#F2633A] bg-opacity-10 rounded-[16px] flex items-center justify-center">
                    <Users className="h-6 w-6 text-[#F2633A]" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[22px] border-[#E1E0DA]">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium font-['Vazirmatn'] text-[#696A6D]">Metaobjects</p>
                    <p className="text-2xl font-bold font-['Archivo'] text-[#212227] mt-1">
                      {/* Placeholder for syncStats, assuming it's defined elsewhere or fetched */}
                      0
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-[#F2633A] bg-opacity-10 rounded-[16px] flex items-center justify-center">
                    <Database className="h-6 w-6 text-[#F2633A]" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[22px] border-[#E1E0DA]">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium font-['Vazirmatn'] text-[#696A6D]">Gmail Threads</p>
                    <p className="text-2xl font-bold font-['Archivo'] text-[#212227] mt-1">
                      {/* Placeholder for syncStats, assuming it's defined elsewhere or fetched */}
                      0
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-[#F2633A] bg-opacity-10 rounded-[16px] flex items-center justify-center">
                    <Mail className="h-6 w-6 text-[#F2633A]" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
</original><replit_final_file>
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
import { Settings as SettingsIcon, Link as LinkIcon, Webhook, RefreshCw, CheckCircle2, XCircle, AlertCircle, Database, Package, Cog, Users, Mail, ShoppingBag, FileText } from "lucide-react";
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
  const [syncStats, setSyncStats] = useState({ clarityCustomers: 0, metaobjects: 0, gmailThreads: 0 }); // Added to resolve the error

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
        const res = await fetch("/api/shopify/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        // Filter to only customers with ALL three IDs linked
        return data?.data?.customers?.nodes?.filter((c: any) => 
          c.clarityId?.value && c.uiaId?.value
        ) || [];
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

  const handleCustomerSync = () => { /* placeholder */ };
  const handleMetaobjectSync = () => { /* placeholder */ };
  const handleGmailSync = () => { /* placeholder */ };

  return (
    <div className="min-h-screen bg-[#F3F1E9]">
      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-[#E1E0DA] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Cog className="h-8 w-8 text-[#F2633A]" />
              <h1 className="text-2xl font-['Archivo'] font-bold text-[#212227]">Settings</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="text-sm border-[#E1E0DA]">
                Last sync: {new Date().toLocaleDateString()}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Stats Overview */}
          <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="rounded-[22px] border-[#E1E0DA]">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium font-['Vazirmatn'] text-[#696A6D]">Active Customers</p>
                    <p className="text-2xl font-bold font-['Archivo'] text-[#212227] mt-1">
                      {syncStats.clarityCustomers}
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-[#F2633A] bg-opacity-10 rounded-[16px] flex items-center justify-center">
                    <Users className="h-6 w-6 text-[#F2633A]" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[22px] border-[#E1E0DA]">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium font-['Vazirmatn'] text-[#696A6D]">Metaobjects</p>
                    <p className="text-2xl font-bold font-['Archivo'] text-[#212227] mt-1">
                      {syncStats.metaobjects}
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-[#F2633A] bg-opacity-10 rounded-[16px] flex items-center justify-center">
                    <Database className="h-6 w-6 text-[#F2633A]" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[22px] border-[#E1E0DA]">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium font-['Vazirmatn'] text-[#696A6D]">Gmail Threads</p>
                    <p className="text-2xl font-bold font-['Archivo'] text-[#212227] mt-1">
                      {syncStats.gmailThreads}
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-[#F2633A] bg-opacity-10 rounded-[16px] flex items-center justify-center">
                    <Mail className="h-6 w-6 text-[#F2633A]" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}