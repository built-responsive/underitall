import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Loader2, Mail, Send, Eye, Edit2, Save, X, Plus, TestTube } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  description?: string;
  variables?: any;
  category: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export function EmailTemplates() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [previewVariables, setPreviewVariables] = useState<any>({});
  const { toast } = useToast();

  // Load templates
  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/email-templates');
      const data = await response.json();
      setTemplates(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load email templates",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Save template
  const saveTemplate = async () => {
    if (!selectedTemplate) return;
    
    setIsSaving(true);
    try {
      const response = await fetch(`/api/email-templates/${selectedTemplate.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(selectedTemplate),
      });
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Template saved successfully",
        });
        setIsEditing(false);
        loadTemplates();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save template",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Send test email
  const sendTestEmail = async () => {
    if (!selectedTemplate || !testEmail) {
      toast({
        title: "Error",
        description: "Please enter a test email address",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const response = await fetch('/api/email-templates/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          to: testEmail,
          variables: previewVariables,
        }),
      });
      
      if (response.ok) {
        toast({
          title: "Test Email Sent",
          description: `Test email sent to ${testEmail}`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send test email",
        variant: "destructive",
      });
    }
  };

  // Get category badge color
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'notification': return 'bg-blue-100 text-blue-800';
      case 'welcome': return 'bg-green-100 text-green-800';
      case 'order': return 'bg-purple-100 text-purple-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Default template variables for preview
  const getDefaultVariables = (templateName: string) => {
    switch (templateName) {
      case 'new-crm-customer':
        return {
          firstName: 'John',
          lastName: 'Doe',
          firmName: 'Acme Design Studio',
          email: 'john@acmedesign.com',
          phone: '555-0123',
          businessType: 'interior_designer',
          clarityAccountId: 'AC000123',
          businessAddress: '123 Main Street',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          isTaxExempt: true,
          taxId: '12-3456789'
        };
      case 'new-wholesale-application':
        return {
          firstName: 'Jane',
          lastName: 'Smith',
          firmName: 'Smith Interiors',
          email: 'jane@smithinteriors.com',
          phone: '555-0456',
          businessType: 'interior_designer',
          applicationDate: new Date().toLocaleDateString(),
          applicationNumber: 'APP-2024-001',
          pendingCount: 3,
          adminDashboardUrl: '/dashboard'
        };
      case 'new-draft-order':
        return {
          orderNumber: 'DO-2024-001',
          orderDate: new Date().toLocaleDateString(),
          customerName: 'Acme Design Studio',
          customerEmail: 'orders@acmedesign.com',
          accountType: 'Wholesale',
          lineItems: [
            {
              name: 'Custom Rubber Mat',
              variant: '48" x 72" x 1/4"',
              quantity: 2,
              sku: 'MAT-001',
              price: '$500.00',
              unitPrice: '$250.00'
            }
          ],
          subtotal: '$500.00',
          tax: '$45.00',
          totalPrice: '$545.00',
          shopifyDraftOrderUrl: '#',
          invoiceUrl: '#'
        };
      case 'app-error':
        return {
          timestamp: new Date().toISOString(),
          environment: 'production',
          errorType: 'DatabaseConnectionError',
          errorMessage: 'Failed to connect to database',
          service: 'API',
          critical: true,
          endpoint: '/api/wholesale-registrations',
          method: 'GET',
          errorId: 'ERR-' + Math.random().toString(36).substr(2, 9),
          logsUrl: '/logs',
          dashboardUrl: '/dashboard'
        };
      default:
        return {};
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    if (selectedTemplate) {
      setPreviewVariables(getDefaultVariables(selectedTemplate.name));
    }
  }, [selectedTemplate]);

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Templates
            </span>
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-1" />
              New Template
            </Button>
          </CardTitle>
          <CardDescription>
            Manage email templates for notifications and communications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Template List */}
            <div className="lg:col-span-1">
              <div className="space-y-2">
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : templates.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No templates found
                  </p>
                ) : (
                  templates.map((template) => (
                    <Card 
                      key={template.id}
                      className={`cursor-pointer transition-colors ${
                        selectedTemplate?.id === template.id ? 'bg-accent' : ''
                      }`}
                      onClick={() => setSelectedTemplate(template)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between mb-1">
                          <h4 className="font-medium text-sm">
                            {template.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </h4>
                          <Badge 
                            variant="secondary"
                            className={`text-xs ${getCategoryColor(template.category)}`}
                          >
                            {template.category}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {template.description || 'No description'}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <Badge variant={template.active ? "default" : "secondary"} className="text-xs">
                            {template.active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>

            {/* Template Editor/Preview */}
            <div className="lg:col-span-2">
              {selectedTemplate ? (
                <Tabs defaultValue="preview">
                  <div className="flex justify-between items-center mb-4">
                    <TabsList>
                      <TabsTrigger value="preview">Preview</TabsTrigger>
                      <TabsTrigger value="edit">Edit</TabsTrigger>
                      <TabsTrigger value="test">Test</TabsTrigger>
                    </TabsList>
                    
                    {isEditing && (
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          onClick={saveTemplate}
                          disabled={isSaving}
                        >
                          {isSaving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                          Save
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setIsEditing(false)}
                        >
                          <X className="h-4 w-4" />
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  <TabsContent value="preview" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">
                          Subject: {selectedTemplate.subject}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="border rounded-lg p-4 bg-white">
                          <iframe
                            srcDoc={selectedTemplate.htmlContent}
                            className="w-full h-[600px] border-0"
                            title="Email Preview"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="edit" className="space-y-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="subject">Subject Line</Label>
                            <Input
                              id="subject"
                              value={selectedTemplate.subject}
                              onChange={(e) => {
                                setSelectedTemplate({
                                  ...selectedTemplate,
                                  subject: e.target.value
                                });
                                setIsEditing(true);
                              }}
                              placeholder="Email subject..."
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="description">Description</Label>
                            <Input
                              id="description"
                              value={selectedTemplate.description || ''}
                              onChange={(e) => {
                                setSelectedTemplate({
                                  ...selectedTemplate,
                                  description: e.target.value
                                });
                                setIsEditing(true);
                              }}
                              placeholder="Template description..."
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="htmlContent">HTML Content</Label>
                            <Textarea
                              id="htmlContent"
                              value={selectedTemplate.htmlContent}
                              onChange={(e) => {
                                setSelectedTemplate({
                                  ...selectedTemplate,
                                  htmlContent: e.target.value
                                });
                                setIsEditing(true);
                              }}
                              className="font-mono text-xs"
                              rows={20}
                            />
                          </div>
                          
                          <div>
                            <Label>Template Variables</Label>
                            <div className="bg-muted rounded-lg p-3">
                              <pre className="text-xs">
                                {JSON.stringify(selectedTemplate.variables || [], null, 2)}
                              </pre>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="test" className="space-y-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="testEmail">Test Email Address</Label>
                            <div className="flex gap-2">
                              <Input
                                id="testEmail"
                                type="email"
                                value={testEmail}
                                onChange={(e) => setTestEmail(e.target.value)}
                                placeholder="test@example.com"
                              />
                              <Button onClick={sendTestEmail}>
                                <Send className="h-4 w-4 mr-1" />
                                Send Test
                              </Button>
                            </div>
                          </div>
                          
                          <div>
                            <Label>Test Variables (JSON)</Label>
                            <Textarea
                              value={JSON.stringify(previewVariables, null, 2)}
                              onChange={(e) => {
                                try {
                                  setPreviewVariables(JSON.parse(e.target.value));
                                } catch (error) {
                                  // Invalid JSON, ignore
                                }
                              }}
                              className="font-mono text-xs"
                              rows={10}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              ) : (
                <Card className="h-full flex items-center justify-center">
                  <CardContent>
                    <p className="text-muted-foreground text-center">
                      Select a template to preview or edit
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}