import React, { useState, useEffect } from 'react';
import {
  reactExtension,
  Banner,
  BlockStack,
  Button,
  Card,
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
  () => <WholesaleAccountFullPage />
);

function WholesaleAccountFullPage() {
  const { query, applyMetafieldsChange } = useApi();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({});
  const [customerId, setCustomerId] = useState(null);
  const [clarityAccountId, setClarityAccountId] = useState(null); // Added state for clarityAccountId

  useEffect(() => {
    fetchWholesaleAccount();
  }, []);

  async function fetchWholesaleAccount() {
    try {
      setLoading(true);
      setError(null);

      const customerQuery = `
        query {
          customer {
            id
            email
            metafields(identifiers: [
              {namespace: "custom", key: "wholesale_company"},
              {namespace: "custom", key: "wholesale_phone"},
              {namespace: "custom", key: "wholesale_website"},
              {namespace: "custom", key: "wholesale_instagram"},
              {namespace: "custom", key: "wholesale_address"},
              {namespace: "custom", key: "wholesale_address2"},
              {namespace: "custom", key: "wholesale_city"},
              {namespace: "custom", key: "wholesale_state"},
              {namespace: "custom", key: "wholesale_zip"},
              {namespace: "custom", key: "wholesale_tax_exempt"},
              {namespace: "custom", key: "wholesale_vat_tax_id"},
              {namespace: "custom", key: "wholesale_account_type"},
              {namespace: "custom", key: "wholesale_sample_set"},
              {namespace: "custom", key: "wholesale_clarity_id"},
              {namespace: "custom", key: "wholesale_source"},
              {namespace: "custom", key: "wholesale_message"},
              {namespace: "custom", key: "wholesale_page"},
              {namespace: "custom", key: "wholesale_owner"}
            ]) {
              key
              value
            }
          }
        }
      `;

      const customerResult = await query(customerQuery);
      const customer = customerResult?.data?.customer;

      if (!customer) {
        setLoading(false);
        return;
      }

      setCustomerId(customer.id);

      const fieldsObj = {};
      customer.metafields.forEach(field => {
        if (field) {
          // Map old wholesale_ prefixed keys to new keys and store clarity_id
          let key = field.key;
          let value = field.value;
          if (key.startsWith('wholesale_')) {
            if (key === 'wholesale_clarity_id') {
              setClarityAccountId(value); // Set clarityAccountId
              key = 'clarityAccountId'; // Use clarityAccountId for internal state
              value = value;
            } else {
              key = key.replace('wholesale_', ''); // Remove wholesale_ prefix
            }
          }
          fieldsObj[key] = value;
        }
      });

      // Ensure boolean fields are correctly parsed
      fieldsObj.taxExempt = fieldsObj.taxExempt === 'true';
      fieldsObj.sample_set = fieldsObj.sample_set === 'true';


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

      // Update via our API
      const appUrl = 'https://join.itsunderitall.com';
      const response = await fetch(`${appUrl}/api/customer/wholesale-account`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId,
          clarityAccountId, // Pass clarityAccountId
          updates: formData
        })
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

  // Use the new field name 'company' for checking existence
  if (!formData.company) {
    return (
      <Page title="Wholesale Account">
        <Card>
          <BlockStack spacing="base">
            <Heading level={2}>No Wholesale Account Found</Heading>
            <Text>You do not have an active wholesale account. Apply now to access wholesale pricing.</Text>
            <Button
              onPress={() => {
                window.location.href = 'https://its-under-it-all.replit.app/wholesale-registration';
              }}
            >
              Apply for Wholesale Account
            </Button>
          </BlockStack>
        </Card>
      </Page>
    );
  }

  return (
    <Page title="Wholesale Account Profile">
      <BlockStack spacing="large">
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

        <Card>
          <BlockStack spacing="base">
            <Heading level={2}>Business Information</Heading>
            <TextField
              label="Company Name"
              value={formData.company || ''}
              onChange={(value) => handleFieldChange('company', value)}
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
              label="Instagram Handle"
              value={formData.instagram || ''}
              onChange={(value) => handleFieldChange('instagram', value)}
              disabled={!editing}
            />
          </BlockStack>
        </Card>

        <Card>
          <BlockStack spacing="base">
            <Heading level={2}>Business Address</Heading>
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
        </Card>

        <Card>
          <BlockStack spacing="base">
            <Heading level={2}>Tax Information</Heading>
            <TextField
              label="VAT/Tax ID"
              value={formData.taxId || ''}
              onChange={(value) => handleFieldChange('taxId', value)}
              disabled={!editing}
            />
            <InlineStack spacing="tight">
              <Text>Tax Exempt:</Text>
              {/* Use the new field name 'taxExempt' and ensure correct boolean display */}
              <Text emphasis="bold">{formData.taxExempt ? 'Yes' : 'No'}</Text>
            </InlineStack>
          </BlockStack>
        </Card>

        <InlineStack spacing="tight">
          {!editing ? (
            <Button onPress={() => setEditing(true)}>
              Edit Information
            </Button>
          ) : (
            <>
              <Button onPress={handleSave} loading={saving}>
                Save Changes
              </Button>
              <Button
                onPress={() => {
                  setEditing(false);
                  fetchWholesaleAccount();
                }}
                disabled={saving}
              >
                Cancel
              </Button>
            </>
          )}
        </InlineStack>
      </BlockStack>
    </Page>
  );
}