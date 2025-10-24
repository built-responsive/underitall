
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
  useApi,
} from '@shopify/ui-extensions-react/customer-account';

export default reactExtension('customer-account.page.render', () => <ProfilePage />);

function ProfilePage() {
  const { query } = useApi();
  
  const [wholesaleAccount, setWholesaleAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

      setLoading(false);
    } catch (err) {
      console.error('Error fetching wholesale account:', err);
      setError(err.message);
      setLoading(false);
    }
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
    <Page title="Wholesale Account Profile">
      <Card>
        <BlockStack spacing="base">
          {error && (
            <Banner status="critical">
              Error: {error}
            </Banner>
          )}

          {/* Business Information */}
          <BlockStack spacing="tight">
            <Heading level={2}>Business Information</Heading>
            <InlineStack spacing="tight">
              <Text emphasis="bold">Company:</Text>
              <Text>{wholesaleAccount.company || 'N/A'}</Text>
            </InlineStack>
            <InlineStack spacing="tight">
              <Text emphasis="bold">Email:</Text>
              <Text>{wholesaleAccount.email || 'N/A'}</Text>
            </InlineStack>
            <InlineStack spacing="tight">
              <Text emphasis="bold">Phone:</Text>
              <Text>{wholesaleAccount.phone || 'N/A'}</Text>
            </InlineStack>
            {wholesaleAccount.website && (
              <InlineStack spacing="tight">
                <Text emphasis="bold">Website:</Text>
                <Text>{wholesaleAccount.website}</Text>
              </InlineStack>
            )}
            {wholesaleAccount.instagram && (
              <InlineStack spacing="tight">
                <Text emphasis="bold">Instagram:</Text>
                <Text>@{wholesaleAccount.instagram}</Text>
              </InlineStack>
            )}
          </BlockStack>

          <Divider />

          {/* Business Address */}
          <BlockStack spacing="tight">
            <Heading level={2}>Business Address</Heading>
            <Text>{wholesaleAccount.address || 'N/A'}</Text>
            {wholesaleAccount.address2 && <Text>{wholesaleAccount.address2}</Text>}
            <Text>
              {wholesaleAccount.city || 'N/A'}, {wholesaleAccount.state || 'N/A'} {wholesaleAccount.zip || 'N/A'}
            </Text>
          </BlockStack>

          <Divider />

          {/* Tax Information */}
          <BlockStack spacing="tight">
            <Heading level={2}>Tax Information</Heading>
            {wholesaleAccount.vat_tax_id && (
              <InlineStack spacing="tight">
                <Text emphasis="bold">VAT/Tax ID:</Text>
                <Text>{wholesaleAccount.vat_tax_id}</Text>
              </InlineStack>
            )}
            <InlineStack spacing="tight">
              <Text emphasis="bold">Tax Exempt:</Text>
              <Text>{wholesaleAccount.tax_exempt === 'true' ? 'Yes' : 'No'}</Text>
            </InlineStack>
          </BlockStack>

          <Divider />

          {/* Account Information */}
          <BlockStack spacing="tight">
            <Heading level={2}>Account Information</Heading>
            <InlineStack spacing="tight">
              <Text emphasis="bold">Account Type:</Text>
              <Text>{wholesaleAccount.account_type || 'N/A'}</Text>
            </InlineStack>
            {wholesaleAccount.source && (
              <InlineStack spacing="tight">
                <Text emphasis="bold">How Did You Hear About Us:</Text>
                <Text>{wholesaleAccount.source}</Text>
              </InlineStack>
            )}
            <InlineStack spacing="tight">
              <Text emphasis="bold">Sample Set Received:</Text>
              <Text>{wholesaleAccount.sample_set === 'true' ? 'Yes' : 'No'}</Text>
            </InlineStack>
            {wholesaleAccount.clarity_id && (
              <InlineStack spacing="tight">
                <Text emphasis="bold">CRM Account ID:</Text>
                <Text>{wholesaleAccount.clarity_id}</Text>
              </InlineStack>
            )}
          </BlockStack>

          {wholesaleAccount.message && (
            <>
              <Divider />
              <BlockStack spacing="tight">
                <Heading level={2}>Account Notes</Heading>
                <Text>{wholesaleAccount.message}</Text>
              </BlockStack>
            </>
          )}

          <Divider />

          {/* Action Buttons */}
          <InlineStack spacing="tight">
            <Button
              onPress={() => {
                window.location.href = '/account/profile';
              }}
            >
              Edit Information
            </Button>
            <Button
              kind="secondary"
              onPress={() => {
                window.location.href = '/account';
              }}
            >
              Back to Account
            </Button>
          </InlineStack>
        </BlockStack>
      </Card>
    </Page>
  );
}
