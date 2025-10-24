
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
          fieldsObj[field.key] = field.value;
        }
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

      const metafields = Object.entries(formData)
        .filter(([key]) => key.startsWith('wholesale_'))
        .map(([key, value]) => {
          // Determine type based on field
          let type = 'single_line_text_field';
          if (key === 'wholesale_tax_exempt' || key === 'wholesale_sample_set') {
            type = 'boolean';
          } else if (key === 'wholesale_source' || key === 'wholesale_message') {
            type = 'multi_line_text_field';
          } else if (key === 'wholesale_page') {
            type = 'page_reference';
          } else if (key === 'wholesale_owner' || key === 'wholesale_account_type') {
            type = 'list.metaobject_reference';
          }

          return {
            key,
            namespace: 'custom',
            type,
            value: String(value || '')
          };
        });

      const result = await applyMetafieldsChange({
        type: 'updateMetafield',
        namespace: 'custom',
        metafields
      });

      if (result.type === 'error') {
        throw new Error(result.message);
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

  if (!formData.wholesale_company) {
    return (
      <Page title="Wholesale Account">
        <Card>
          <BlockStack spacing="base">
            <Heading level={2}>No Wholesale Account Found</Heading>
            <Text>You do not have an active wholesale account. Apply now to access wholesale pricing.</Text>
            <Button
              onPress={() => {
                window.location.href = '/pages/wholesale-apply';
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
              value={formData.wholesale_company || ''}
              onChange={(value) => handleFieldChange('wholesale_company', value)}
              disabled={!editing}
            />
            <TextField
              label="Phone"
              value={formData.wholesale_phone || ''}
              onChange={(value) => handleFieldChange('wholesale_phone', value)}
              disabled={!editing}
            />
            <TextField
              label="Website"
              value={formData.wholesale_website || ''}
              onChange={(value) => handleFieldChange('wholesale_website', value)}
              disabled={!editing}
            />
            <TextField
              label="Instagram Handle"
              value={formData.wholesale_instagram || ''}
              onChange={(value) => handleFieldChange('wholesale_instagram', value)}
              disabled={!editing}
            />
          </BlockStack>
        </Card>

        <Card>
          <BlockStack spacing="base">
            <Heading level={2}>Business Address</Heading>
            <TextField
              label="Address Line 1"
              value={formData.wholesale_address || ''}
              onChange={(value) => handleFieldChange('wholesale_address', value)}
              disabled={!editing}
            />
            <TextField
              label="Address Line 2"
              value={formData.wholesale_address2 || ''}
              onChange={(value) => handleFieldChange('wholesale_address2', value)}
              disabled={!editing}
            />
            <InlineStack spacing="tight">
              <TextField
                label="City"
                value={formData.wholesale_city || ''}
                onChange={(value) => handleFieldChange('wholesale_city', value)}
                disabled={!editing}
              />
              <TextField
                label="State"
                value={formData.wholesale_state || ''}
                onChange={(value) => handleFieldChange('wholesale_state', value)}
                disabled={!editing}
              />
              <TextField
                label="ZIP"
                value={formData.wholesale_zip || ''}
                onChange={(value) => handleFieldChange('wholesale_zip', value)}
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
              value={formData.wholesale_vat_tax_id || ''}
              onChange={(value) => handleFieldChange('wholesale_vat_tax_id', value)}
              disabled={!editing}
            />
            <InlineStack spacing="tight">
              <Text>Tax Exempt:</Text>
              <Text emphasis="bold">{formData.wholesale_tax_exempt === 'true' ? 'Yes' : 'No'}</Text>
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
