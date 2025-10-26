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

      const customerQuery = `
        query {
          customer {
            id
            email
          }
        }
      `;

      const customerResult = await query(customerQuery);
      const customerId = customerResult?.data?.customer?.id;

      if (!customerId) {
        setLoading(false);
        return;
      }

      const appUrl = 'https://join.itsunderitall.com';
      const response = await fetch(`${appUrl}/api/customer/wholesale-account?customerId=${encodeURIComponent(customerId)}`);

      if (!response.ok) {
        throw new Error('Failed to fetch wholesale account');
      }

      const data = await response.json();

      if (!data.hasWholesaleAccount) {
        setLoading(false);
        return;
      }

      const account = data.account;

      setWholesaleAccount({
        id: data.clarityAccountId,
        displayName: account.company,
        ...account
      });

      setFormData(account);
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

      const customerQuery = `
        query {
          customer {
            id
          }
        }
      `;

      const customerResult = await query(customerQuery);
      const customerId = customerResult?.data?.customer?.id;

      const appUrl = 'https://join.itsunderitall.com';

      const response = await fetch(`${appUrl}/api/wholesale-account/${wholesaleAccount.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId,
          clarityAccountId: wholesaleAccount.id,
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

  if (!wholesaleAccount) {
    return (
      <Page title="Wholesale Account">
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
      </Page>
    );
  }

  return (
    <Page title="Wholesale Account">
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