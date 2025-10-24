
import React, { useState, useEffect } from 'react';
import {
  reactExtension,
  Banner,
  BlockStack,
  Button,
  Card,
  Divider,
  Heading,
  InlineStack,
  Page,
  Spinner,
  Text,
  TextField,
  useApi,
} from '@shopify/ui-extensions-react/customer-account';

export default reactExtension(
  'customer-account.page.render',
  () => <WholesaleAccountPage />
);

function WholesaleAccountPage() {
  const { query, i18n } = useApi();
  
  const [wholesaleAccount, setWholesaleAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    fetchWholesaleAccount();
  }, []);

  async function fetchWholesaleAccount() {
    try {
      setLoading(true);
      setError(null);

      // Query current customer's wholesale_account metafield reference
      const customerQuery = `
        query {
          customer {
            id
            email
            metafield(namespace: "custom", key: "wholesale_account") {
              reference {
                ... on Metaobject {
                  id
                  handle
                  displayName
                  fields {
                    key
                    value
                  }
                }
              }
            }
          }
        }
      `;

      const customerResult = await query(customerQuery);

      const metaobject = customerResult?.data?.customer?.metafield?.reference;

      if (!metaobject) {
        setLoading(false);
        return;
      }

      // Convert fields array to object
      const fieldsObj = {};
      metaobject.fields.forEach(field => {
        fieldsObj[field.key] = field.value;
      });
      
      setWholesaleAccount({
        id: metaobject.id,
        handle: metaobject.handle,
        displayName: metaobject.displayName,
        ...fieldsObj
      });

      setFormData(fieldsObj);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching wholesale account:', err);
      setError(err.message);
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      setError(null);

      // Update via backend API (requires session token for auth)
      //const appUrl = 'https://its-under-it-all.replit.app';
      const appUrl = 'https://2d8f7c0c-938e-4f87-b0ca-9f262520d64e-00-2o84gg8qrj25w.spock.replit.dev';
      const metaobjectId = wholesaleAccount.id.split('/').pop();

      const response = await fetch(`${appUrl}/api/wholesale-account/${metaobjectId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Failed to update wholesale account');
      }

      setSuccess(true);
      setEditing(false);
      
      await fetchWholesaleAccount();

      setTimeout(() => setSuccess(false), 5000);
      setSaving(false);
    } catch (err) {
      console.error('Error saving:', err);
      setError(err.message);
      setSaving(false);
    }
  }

  function handleFieldChange(key, value) {
    setFormData(prev => ({
      ...prev,
      [key]: value
    }));
  }

  if (loading) {
    return (
      <Page title="Wholesale Account">
        <Card>
          <InlineStack spacing="tight" inlineAlignment="center">
            <Spinner size="small" />
            <Text>Loading wholesale account...</Text>
          </InlineStack>
        </Card>
      </Page>
    );
  }

  if (!wholesaleAccount) {
    return (
      <Card>
        <BlockStack spacing="base">
          <Heading level={2}>No Wholesale Account Found</Heading>
          <Text>You do not have an active wholesale account. Apply now to access wholesale pricing and custom orders.</Text>
          <Button
            onPress={() => {
              window.open('https://its-under-it-all.replit.app/wholesale-registration', '_blank');
            }}
          >
            Apply for Wholesale Account
          </Button>
        </BlockStack>
      </Card>
    );
  }

  return (
    <Page title="Wholesale Account">
      <Card>
        <BlockStack spacing="base">
          {success && (
            <Banner status="success">
              Wholesale account updated successfully!
            </Banner>
          )}

          {error && (
            <Banner status="critical">
              Error: {error}
            </Banner>
          )}

          <Divider />

          {/* Business Information */}
          <BlockStack spacing="tight">
            <Heading level={3}>Business Information</Heading>
            <TextField
              label="Company Name"
              value={formData.company || ''}
              onChange={(value) => handleFieldChange('company', value)}
              disabled={!editing}
            />
            <TextField
              label="Email"
              value={formData.email || ''}
              onChange={(value) => handleFieldChange('email', value)}
              disabled={!editing}
            />
            <TextField
              label="Phone"
              value={formData.phone || ''}
              onChange={(value) => handleFieldChange('phone', value)}
              disabled={!editing}
            />
            <TextField
              label="Website"
              value={formData.website || ''}
              onChange={(value) => handleFieldChange('website', value)}
              disabled={!editing}
            />
            <TextField
              label="Instagram"
              value={formData.instagram || ''}
              onChange={(value) => handleFieldChange('instagram', value)}
              disabled={!editing}
            />
          </BlockStack>

          <Divider />

          {/* Address */}
          <BlockStack spacing="tight">
            <Heading level={3}>Business Address</Heading>
            <TextField
              label="Address Line 1"
              value={formData.address || ''}
              onChange={(value) => handleFieldChange('address', value)}
              disabled={!editing}
            />
            <TextField
              label="Address Line 2"
              value={formData.address2 || ''}
              onChange={(value) => handleFieldChange('address2', value)}
              disabled={!editing}
            />
            <InlineStack spacing="tight">
              <TextField
                label="City"
                value={formData.city || ''}
                onChange={(value) => handleFieldChange('city', value)}
                disabled={!editing}
              />
              <TextField
                label="State"
                value={formData.state || ''}
                onChange={(value) => handleFieldChange('state', value)}
                disabled={!editing}
              />
              <TextField
                label="ZIP"
                value={formData.zip || ''}
                onChange={(value) => handleFieldChange('zip', value)}
                disabled={!editing}
              />
            </InlineStack>
          </BlockStack>

          <Divider />

          {/* Tax Information */}
          <BlockStack spacing="tight">
            <Heading level={3}>Tax Information</Heading>
            <TextField
              label="VAT/Tax ID"
              value={formData.vat_tax_id || ''}
              onChange={(value) => handleFieldChange('vat_tax_id', value)}
              disabled={!editing}
            />
            <InlineStack spacing="tight">
              <Text>Tax Exempt:</Text>
              <Text emphasis="bold">{formData.tax_exempt === 'true' ? 'Yes' : 'No'}</Text>
            </InlineStack>
          </BlockStack>

          <Divider />

          {/* Account Information */}
          <BlockStack spacing="tight">
            <Heading level={3}>Account Information</Heading>
            <TextField
              label="Account Type"
              value={formData.account_type || ''}
              disabled
            />
            <TextField
              label="How Did You Hear About Us"
              value={formData.source || ''}
              onChange={(value) => handleFieldChange('source', value)}
              disabled={!editing}
            />
            <InlineStack spacing="tight">
              <Text>Sample Set Received:</Text>
              <Text emphasis="bold">{formData.sample_set === 'true' ? 'Yes' : 'No'}</Text>
            </InlineStack>
            {formData.clarity_id && (
              <InlineStack spacing="tight">
                <Text>CRM Account ID:</Text>
                <Text>{formData.clarity_id}</Text>
              </InlineStack>
            )}
          </BlockStack>

          <Divider />

          {/* Additional Notes */}
          {formData.message && (
            <>
              <BlockStack spacing="tight">
                <Heading level={3}>Account Notes</Heading>
                <TextField
                  label="Notes"
                  value={formData.message || ''}
                  disabled
                  multiline={3}
                />
              </BlockStack>
              <Divider />
            </>
          )}

          {/* Action Buttons */}
          <InlineStack spacing="tight">
            {!editing ? (
              <>
                <Button onPress={() => setEditing(true)}>
                  Edit Information
                </Button>
                <Button
                  kind="secondary"
                  onPress={() => {
                    window.location.href = '/account/wholesale-profile';
                  }}
                >
                  View Full Profile
                </Button>
              </>
            ) : (
              <>
                <Button onPress={handleSave} loading={saving}>
                  Save Changes
                </Button>
                <Button
                  onPress={() => {
                    setEditing(false);
                    setFormData(wholesaleAccount);
                  }}
                  disabled={saving}
                >
                  Cancel
                </Button>
              </>
            )}
          </InlineStack>
        </BlockStack>
      </Card>
    </Page>
  );
}
