import React, { useState, useEffect } from 'react';
import {
  reactExtension,
  Banner,
  BlockStack,
  Button,
  Divider,
  Heading,
  InlineStack,
  Text,
  TextField,
  useApi,
  useCustomer,
  View,
  Spinner,
} from '@shopify/ui-extensions-react/customer-account';

export default reactExtension(
  'customer-account.profile.block.render',
  () => <WholesaleAccountProfile />
);

function WholesaleAccountProfile() {
  const { query, sessionToken } = useApi();
  const customer = useCustomer();
  
  const [wholesaleAccount, setWholesaleAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    fetchWholesaleAccount();
  }, [customer]);

  async function fetchWholesaleAccount() {
    try {
      setLoading(true);
      setError(null);

      if (!customer?.id) {
        setLoading(false);
        return;
      }

      // Query customer's wholesale_account metafield
      const customerQuery = `
        query getCustomerMetafield($customerId: ID!) {
          customer(id: $customerId) {
            metafield(namespace: "custom", key: "wholesale_account") {
              value
            }
          }
        }
      `;

      const customerResult = await query(customerQuery, {
        variables: { customerId: customer.id }
      });

      const metaobjectId = customerResult?.data?.customer?.metafield?.value;

      if (!metaobjectId) {
        // No wholesale account linked
        setLoading(false);
        return;
      }

      // Fetch metaobject details
      const metaobjectQuery = `
        query getMetaobject($id: ID!) {
          metaobject(id: $id) {
            id
            handle
            displayName
            fields {
              key
              value
            }
          }
        }
      `;

      const metaobjectResult = await query(metaobjectQuery, {
        variables: { id: metaobjectId }
      });

      const metaobject = metaobjectResult?.data?.metaobject;
      
      if (metaobject) {
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
      }

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

      // Get session token for backend API authentication
      const token = await sessionToken.get();

      // Use production URL for API calls
      const appUrl = 'https://its-under-it-all.replit.app';

      // Call backend API to update metaobject
      const response = await fetch(`${appUrl}/api/wholesale-account/${wholesaleAccount.id.split('/').pop()}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Failed to update wholesale account');
      }

      setSuccess(true);
      setEditing(false);
      
      // Refresh data
      await fetchWholesaleAccount();

      // Auto-hide success message after 5 seconds
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
      <View padding="base">
        <InlineStack spacing="tight" inlineAlignment="center">
          <Spinner size="small" />
          <Text>Loading wholesale account...</Text>
        </InlineStack>
      </View>
    );
  }

  if (!wholesaleAccount) {
    return null; // Don't show anything if no wholesale account
  }

  return (
    <View padding="base" border="base" borderRadius="base">
      <BlockStack spacing="base">
        <Heading level={2}>Wholesale Account Information</Heading>
        
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
            <View inlineSize={50}>
              <TextField
                label="City"
                value={formData.city || ''}
                onChange={(value) => handleFieldChange('city', value)}
                disabled={!editing}
              />
            </View>
            <View inlineSize={25}>
              <TextField
                label="State"
                value={formData.state || ''}
                onChange={(value) => handleFieldChange('state', value)}
                disabled={!editing}
              />
            </View>
            <View inlineSize={25}>
              <TextField
                label="ZIP"
                value={formData.zip || ''}
                onChange={(value) => handleFieldChange('zip', value)}
                disabled={!editing}
              />
            </View>
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
            onChange={(value) => handleFieldChange('account_type', value)}
            disabled={!editing}
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
                onChange={(value) => handleFieldChange('message', value)}
                disabled={!editing}
                multiline={3}
              />
            </BlockStack>
            <Divider />
          </>
        )}

        <Divider />

        {/* Action Buttons */}
        <InlineStack spacing="tight">
          {!editing ? (
            <Button
              onPress={() => setEditing(true)}
            >
              Edit Information
            </Button>
          ) : (
            <>
              <Button
                onPress={handleSave}
                loading={saving}
              >
                Save Changes
              </Button>
              <Button
                onPress={() => {
                  setEditing(false);
                  setFormData(wholesaleAccount); // Reset form
                }}
                disabled={saving}
              >
                Cancel
              </Button>
            </>
          )}
        </InlineStack>
      </BlockStack>
    </View>
  );
}
