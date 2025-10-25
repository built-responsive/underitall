import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, Mail, Send, RefreshCw, User, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EmailMessage {
  id: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
  body: string;
}

export function GmailPanel() {
  const [unreadMessages, setUnreadMessages] = useState<EmailMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<EmailMessage | null>(null);
  const { toast } = useToast();

  // Email form state
  const [emailForm, setEmailForm] = useState({
    to: '',
    subject: '',
    body: ''
  });

  const fetchUnreadMessages = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/gmail/unread');
      const data = await response.json();
      
      if (data.success) {
        setUnreadMessages(data.messages);
        toast({
          title: "Messages fetched",
          description: `Found ${data.messages.length} unread messages`,
        });
      } else {
        // Display informative message about permission limitations
        if (data.error && data.error.includes('permissions')) {
          toast({
            title: "Limited Permissions",
            description: "Reading emails is not available with current permissions. Email sending is still enabled.",
            variant: "default",
          });
        } else {
          throw new Error(data.error);
        }
      }
    } catch (error) {
      toast({
        title: "Note",
        description: "Reading emails requires additional permissions. You can still send emails using the Compose tab.",
        variant: "default",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendEmail = async () => {
    if (!emailForm.to || !emailForm.subject || !emailForm.body) {
      toast({
        title: "Missing fields",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch('/api/gmail/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailForm),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Email sent",
          description: "Your email has been sent successfully",
        });
        
        // Reset form
        setEmailForm({
          to: '',
          subject: '',
          body: ''
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send email",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    // Don't fetch on mount since reading is not available with current permissions
    // fetchUnreadMessages();
  }, []);

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Gmail Integration
          </CardTitle>
          <CardDescription>
            Read unread messages and send emails from your connected Gmail account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="compose">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="inbox">Inbox</TabsTrigger>
              <TabsTrigger value="compose">Compose</TabsTrigger>
            </TabsList>
            
            <TabsContent value="inbox" className="space-y-4">
              <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/10 p-4 mb-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>Note:</strong> Reading emails requires additional Gmail API permissions. 
                  The current integration is configured for sending emails only. 
                  Use the Compose tab to send emails.
                </p>
              </div>
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Unread Messages</h3>
                <Button 
                  onClick={fetchUnreadMessages} 
                  disabled={isLoading}
                  size="sm"
                  variant="outline"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Check Permissions
                </Button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ScrollArea className="h-[500px] rounded-md border p-4">
                  {unreadMessages.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No unread messages
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {unreadMessages.map((message) => (
                        <Card 
                          key={message.id}
                          className={`cursor-pointer transition-colors ${
                            selectedMessage?.id === message.id ? 'bg-accent' : ''
                          }`}
                          onClick={() => setSelectedMessage(message)}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <User className="h-3 w-3 text-muted-foreground" />
                                <span className="text-sm font-medium truncate max-w-[200px]">
                                  {message.from.split('<')[0].trim()}
                                </span>
                              </div>
                              <Badge variant="secondary" className="text-xs">
                                Unread
                              </Badge>
                            </div>
                            <h4 className="font-semibold text-sm mb-1 line-clamp-1">
                              {message.subject || '(No Subject)'}
                            </h4>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {message.snippet}
                            </p>
                            <div className="flex items-center gap-1 mt-2">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                {new Date(message.date).toLocaleDateString()}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
                
                <ScrollArea className="h-[500px] rounded-md border p-4">
                  {selectedMessage ? (
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-lg">
                          {selectedMessage.subject || '(No Subject)'}
                        </h4>
                        <div className="text-sm text-muted-foreground mt-1">
                          <div className="flex items-center gap-2">
                            <User className="h-3 w-3" />
                            {selectedMessage.from}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(selectedMessage.date).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="border-t pt-4">
                        <pre className="whitespace-pre-wrap text-sm">
                          {selectedMessage.body || selectedMessage.snippet}
                        </pre>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      Select a message to view its content
                    </p>
                  )}
                </ScrollArea>
              </div>
            </TabsContent>
            
            <TabsContent value="compose" className="space-y-4">
              <h3 className="text-lg font-semibold">Compose Email</h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="to">To</Label>
                  <Input
                    id="to"
                    type="email"
                    placeholder="recipient@example.com"
                    value={emailForm.to}
                    onChange={(e) => setEmailForm({ ...emailForm, to: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    placeholder="Email subject"
                    value={emailForm.subject}
                    onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="body">Message</Label>
                  <Textarea
                    id="body"
                    placeholder="Type your message here..."
                    rows={10}
                    value={emailForm.body}
                    onChange={(e) => setEmailForm({ ...emailForm, body: e.target.value })}
                  />
                </div>
                
                <Button 
                  onClick={sendEmail}
                  disabled={isSending}
                  className="w-full"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send Email
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}